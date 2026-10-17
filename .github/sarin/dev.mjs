import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../cloudflare/build.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = path.join(root, 'wrangler.sarin.local.jsonc');
const persistence = path.join(root, '.wrangler/sarin-local');

/** Acepta únicamente preparación y servidor locales; nunca despliegues ni argumentos de Wrangler. */
export function parseDevArgs(args) {
  const result = { live: false, prepare: false, port: 8791 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--live') result.live = true;
    else if (args[i] === '--prepare') result.prepare = true;
    else if (args[i] === '--port') {
      const port = args[++i];
      if (!/^\d{4,5}$/.test(port || '') || Number(port) < 1024 || Number(port) > 65535) throw new Error('Puerto local inválido.');
      result.port = Number(port);
    } else throw new Error(`Argumento no permitido: ${args[i]}`);
  }
  return result;
}

async function findWrangler() {
  if (process.env.WRANGLER_CLI) {
    const selected = path.resolve(process.env.WRANGLER_CLI);
    await access(selected);
    return selected;
  }
  const caches = [process.env.npm_config_cache,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'npm-cache') : undefined,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.npm') : undefined,
    process.env.HOME ? path.join(process.env.HOME, '.npm') : undefined].filter(Boolean);
  const candidates = [];
  for (const cache of new Set(caches)) {
    const dirs = await readdir(path.join(cache, '_npx'), { withFileTypes: true }).catch(() => []);
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;
      const folder = path.join(cache, '_npx', dir.name, 'node_modules/wrangler');
      const pkg = await readFile(path.join(folder, 'package.json'), 'utf8').then(JSON.parse).catch(() => null);
      const version = pkg?.version?.split('.').map(Number);
      if (version?.[0] === 4 && version[1] >= 150) candidates.push({ folder, score: version[1] * 10000 + version[2] });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) throw new Error('Se necesita Wrangler 4.150 o posterior. Ejecuta npx wrangler@4.150.0 --version una vez, o define WRANGLER_CLI con la ruta a wrangler.js.');
  return path.join(candidates[0].folder, 'bin/wrangler.js');
}

async function ensureLocalSecret() {
  const file = path.join(root, '.dev.vars');
  let content = await readFile(file, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return 'DEEPSEEK_API_KEY=\nSARIN_ENABLED=false\n';
  });
  let changed = false;
  for (const name of ['SARIN_IP_SECRET', 'SARIN_ADMIN_CSRF_SECRET']) {
    const pattern = new RegExp(`^\\s*${name}\\s*=`);
    const line = content.split(/\r?\n/).find(value => pattern.test(value));
    const value = line?.slice(line.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
    if (!value) {
      content = content.split(/\r?\n/).filter(line => !pattern.test(line)).join('\n');
      content += `\n${name}="${randomBytes(32).toString('hex')}"\n`;
      changed = true;
    }
  }
  if (changed) await writeFile(file, content, { encoding: 'utf8', mode: 0o600 });
}

function run(cli, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root, stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('La herramienta local terminó con error.')));
  });
}

async function main() {
  const options = parseDevArgs(process.argv.slice(2));
  const cli = await findWrangler();
  await access(path.join(root, '.github/sarin/node_modules/@cloudflare/pages-plugin-cloudflare-access/package.json'));
  await ensureLocalSecret();
  const artifact = await build({ enableSarinChat: options.live });
  console.log(`Sarin local: ${artifact.files} archivos públicos; preparación de D1 exclusivamente local.`);
  await run(cli, ['d1', 'migrations', 'apply', 'SARIN_DB', '--local', '--config', config,
    '--persist-to', persistence]);
  if (options.prepare) return;
  console.log(`Vista local: http://127.0.0.1:${options.port} · IA ${options.live ? 'habilitada con cuotas' : 'desactivada'}.`);
  // Pages exige wrangler.jsonc estándar; la configuración separada solo se usa para migrar D1 local.
  await run(cli, ['pages', 'dev', 'dist', '--d1', 'SARIN_DB=00000000-0000-0000-0000-000000000002', '--persist-to', persistence,
    '--ip', '127.0.0.1', '--port', String(options.port), '--inspector-port', '0', '--log-level', 'warn',
    '--binding', `SARIN_ENABLED=${options.live ? 'true' : 'false'}`,
    '--binding', `SARIN_HISTORY_ENABLED=${options.live ? 'true' : 'false'}`,
    '--binding', 'SARIN_ADMIN_ENABLED=false']);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    // No imprimir errores de herramientas que puedan contener configuración local o secretos.
    console.error('No se pudo iniciar Sarin local. Comprueba los argumentos, Wrangler, npm ci --prefix .github/sarin, el build y la migración local.');
    process.exitCode = 1;
  });
}
