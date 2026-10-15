// @ts-check
// Servidor exclusivo de desarrollo: este archivo nunca forma parte de dist/.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const loopback = (host) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(host);

export function createLocalServer({ root, host = '127.0.0.1', apiTarget = 'http://127.0.0.1:5001/demo-alsdevstudio/us-central1/controlApi', createSession } = {}) {
  if (!loopback(host)) throw new Error('El servidor de desarrollo requiere loopback.');
  const base = resolve(root);
  return createServer(async (request, response) => {
    const origin = `http://${request.headers.host}`;
    const headers = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' http://127.0.0.1:9099 https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; frame-src https://*.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    };
    const send = (status, body, contentType = 'application/json; charset=utf-8') => {
      response.writeHead(status, { ...headers, 'Content-Type': contentType });
      response.end(typeof body === 'object' && !Buffer.isBuffer(body) ? JSON.stringify(body) : body);
    };
    try {
      if (!loopback(request.socket.remoteAddress) || !/^127\.0\.0\.1:\d+$/.test(request.headers.host ?? '')) return send(403, { error: 'Acceso local requerido.' });
      const url = new URL(request.url, origin);
      if (url.pathname === '/__dev/session') {
        if (request.method !== 'POST') return send(405, { error: 'Método no permitido.' });
        if (request.headers.origin !== origin || !createSession) return send(403, { error: 'Origen no autorizado.' });
        return send(200, await createSession());
      }
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'POST', 'OPTIONS'].includes(request.method)) return send(405, { error: 'Método no permitido.' });
        const chunks = [];
        let size = 0;
        for await (const chunk of request) { size += chunk.length; if (size > 32768) return send(413, { error: { code: 'body-too-large', message: 'La solicitud supera el límite permitido.' } }); chunks.push(chunk); }
        const forwarded = await fetch(`${apiTarget}${url.pathname}`, {
          method: request.method, headers: { ...(request.headers.authorization ? { Authorization: request.headers.authorization } : {}), ...(request.headers.origin ? { Origin: request.headers.origin } : {}), 'Content-Type': request.headers['content-type'] ?? 'application/json' },
          ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: Buffer.concat(chunks) }), signal: AbortSignal.timeout(30000),
        });
        return send(forwarded.status, Buffer.from(await forwarded.arrayBuffer()), forwarded.headers.get('content-type') ?? 'application/json');
      }
      if (!['GET', 'HEAD'].includes(request.method)) return send(405, { error: 'Método no permitido.' });
      const path = resolve(base, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
      if (!path.startsWith(`${base}${sep}`) || !(await stat(path).catch(() => null))?.isFile()) return send(404, { error: 'Archivo no encontrado.' });
      send(200, request.method === 'HEAD' ? '' : await readFile(path), types[extname(path)] ?? 'application/octet-stream');
    } catch { send(503, { error: { code: 'service-unavailable', message: 'El entorno local no está disponible. Comprueba los emuladores.' } }); }
  });
}
