const { test } = require('node:test');
const assert = require('node:assert/strict');
const util = require('../../src/util');

test('validarMonto acepta un monto positivo con dos decimales', () => {
  assert.equal(util.validarMonto(10.5), null);
  assert.equal(util.validarMonto(0.01), null);
});

test('respuesta arma statusCode, headers y body', () => {
  const r = util.respuesta(201, { a: 1 });
  assert.equal(r.statusCode, 201);
  assert.equal(r.headers['content-type'], 'application/json');
  assert.equal(r.body, '{"a":1}');
});

test('validarMonto rechaza un monto negativo', () => {
  assert.equal(util.validarMonto(-5), 'monto debe ser mayor que cero');
});

test('validarMonto rechaza cero', () => {
  assert.equal(util.validarMonto(0), 'monto debe ser mayor que cero');
});

test('obtenerVersion devuelve APP_VERSION', () => {
  process.env.APP_VERSION = '9.9.9';
  assert.equal(util.obtenerVersion(), '9.9.9');
  delete process.env.APP_VERSION;
});

test('validarMonto rechaza valores no numericos', () => {
  assert.equal(util.validarMonto('10'), 'monto debe ser numerico');
  assert.equal(util.validarMonto(NaN), 'monto debe ser numerico');
  assert.equal(util.validarMonto(Infinity), 'monto debe ser numerico');
  assert.equal(util.validarMonto(undefined), 'monto debe ser numerico');
});

test('validarMonto rechaza mas de dos decimales', () => {
  assert.equal(util.validarMonto(1.005), 'monto admite dos decimales');
});

test('ok devuelve 200', () => {
  assert.equal(util.ok({}).statusCode, 200);
});

test('validarUsuario acepta identificadores validos', () => {
  assert.equal(util.validarUsuario('ana'), true);
  assert.equal(util.validarUsuario('usuario_01'), true);
});

test('obtenerCommit devuelve APP_COMMIT', () => {
  process.env.APP_COMMIT = 'abc123';
  assert.equal(util.obtenerCommit(), 'abc123');
  delete process.env.APP_COMMIT;
});

test('validarUsuario rechaza identificadores invalidos', () => {
  assert.equal(util.validarUsuario('ab'), false);
  assert.equal(util.validarUsuario('Ana'), false);
  assert.equal(util.validarUsuario('1ana'), false);
  assert.equal(util.validarUsuario('ana;drop'), false);
  assert.equal(util.validarUsuario(42), false);
});

test('error devuelve el status y el mensaje', () => {
  const r = util.error(404, 'x');
  assert.equal(r.statusCode, 404);
  assert.deepEqual(JSON.parse(r.body), { error: 'x' });
});

test('obtenerVersion devuelve la version del paquete', () => {
  assert.equal(util.obtenerVersion(), require('../../package.json').version);
});

test('aCentimos y aSoles convierten sin perder precision', () => {
  assert.equal(util.aCentimos(0.1 + 0.2), 30);
  assert.equal(util.aSoles(12345), 123.45);
});

test('obtenerCommit devuelve local', () => {
  assert.equal(util.obtenerCommit(), 'local');
});
