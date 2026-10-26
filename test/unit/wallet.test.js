const { test } = require('node:test');
const assert = require('node:assert/strict');
const wallet = require('../../src/wallet');

function storeFalso(saldos) {
  const cuentas = new Map(Object.entries(saldos).map(([id, saldo]) => [id, { id, saldo }]));
  const movimientos = [];
  return {
    usuario: (id) => (cuentas.has(id) ? { ...cuentas.get(id) } : undefined),
    movimientos: (id) => movimientos.filter((m) => m.origen === id || m.destino === id),
    transferir: (origen, destino, monto) => {
      movimientos.push({ id: movimientos.length + 1, origen, destino, monto, fecha: 'f' });
      return movimientos.length;
    },
  };
}

test('saldo devuelve el saldo en soles', () => {
  const store = storeFalso({ ana: 150050 });
  assert.deepEqual(wallet.saldo(store, 'ana'), { usuario: 'ana', saldo: 1500.5 });
});

test('saldo de un usuario inexistente es 404', () => {
  assert.throws(() => wallet.saldo(storeFalso({}), 'nadie'), { status: 404 });
});

test('saldo con un usuario invalido es 400', () => {
  assert.throws(() => wallet.saldo(storeFalso({}), 'X'), { status: 400 });
});

test('historial convierte los montos a soles', () => {
  const store = storeFalso({ ana: 1000, beto: 0 });
  store.transferir('ana', 'beto', 250);
  assert.deepEqual(wallet.historial(store, 'beto'), [
    { id: 1, origen: 'ana', destino: 'beto', monto: 2.5, fecha: 'f' },
  ]);
});

test('ErrorNegocio guarda el status', () => {
  const e = new wallet.ErrorNegocio(418, 'm');
  assert.equal(e.status, 418);
  assert.equal(e.message, 'm');
});

test('transferir delega el movimiento en centimos', () => {
  const store = storeFalso({ ana: 10000, beto: 0 });
  const r = wallet.transferir(store, { origen: 'ana', destino: 'beto', monto: 25.5 });
  assert.equal(r.saldoOrigen, 74.5);
  assert.equal(r.monto, 25.5);
  assert.deepEqual(store.movimientos('ana')[0], { id: 1, origen: 'ana', destino: 'beto', monto: 2550, fecha: 'f' });
});

test('transferir todo el saldo deja el origen en cero', () => {
  const store = storeFalso({ ana: 500, beto: 0 });
  const r = wallet.transferir(store, { origen: 'ana', destino: 'beto', monto: 5 });
  assert.equal(r.saldoOrigen, 0);
});

test('transferir con saldo insuficiente es 400', () => {
  const store = storeFalso({ ana: 500, beto: 0 });
  assert.throws(
    () => wallet.transferir(store, { origen: 'ana', destino: 'beto', monto: 5.01 }),
    { status: 400, message: 'saldo insuficiente' },
  );
  assert.equal(store.movimientos('ana').length, 0);
});

test('transferir al mismo usuario es 422', () => {
  const store = storeFalso({ ana: 500 });
  assert.throws(() => wallet.transferir(store, { origen: 'ana', destino: 'ana', monto: 1 }), { status: 422 });
});

test('transferir a un usuario inexistente es 400', () => {
  const store = storeFalso({ ana: 500 });
  assert.throws(
    () => wallet.transferir(store, { origen: 'ana', destino: 'nadie', monto: 1 }),
    { status: 400, message: 'usuario inexistente' },
  );
});

test('transferir con un usuario invalido es 400', () => {
  const store = storeFalso({ ana: 500 });
  assert.throws(() => wallet.transferir(store, { origen: 'ana', destino: 'B', monto: 1 }), { status: 400 });
});

test('transferir con monto invalido es 400', () => {
  const store = storeFalso({ ana: 500, beto: 0 });
  assert.throws(() => wallet.transferir(store, { origen: 'ana', destino: 'beto', monto: 0 }), { status: 400 });
});

test('transferir sin cuerpo es 400', () => {
  assert.throws(() => wallet.transferir(storeFalso({})), { status: 400 });
});
