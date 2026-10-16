import assert from 'node:assert/strict';
import { test } from 'node:test';

const dev = await import('../sarin/dev.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});

test('el lanzador local no activa inferencia sin --live explícito', () => {
  assert.equal(typeof dev?.parseDevArgs, 'function');
  assert.deepEqual(dev.parseDevArgs([]), { live: false, prepare: false, port: 8791 });
  assert.deepEqual(dev.parseDevArgs(['--live', '--port', '8792']), { live: true, prepare: false, port: 8792 });
});

test('el lanzador no admite operaciones remotas o de publicación', () => {
  assert.equal(typeof dev?.parseDevArgs, 'function');
  for (const arg of ['--remote', 'deploy', '--config', '--binding', '--live=true']) {
    assert.throws(() => dev.parseDevArgs([arg]), /argumento/i);
  }
});

test('el lanzador rechaza puertos inválidos antes de iniciar herramientas', () => {
  assert.equal(typeof dev?.parseDevArgs, 'function');
  for (const port of ['', '0', '80', '65536', '8791;echo', 'abc']) {
    assert.throws(() => dev.parseDevArgs(['--port', port]), /puerto/i);
  }
  assert.deepEqual(dev.parseDevArgs(['--prepare']), { live: false, prepare: true, port: 8791 });
});
