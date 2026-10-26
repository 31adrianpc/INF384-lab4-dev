const wallet = require('./wallet');
const { obtenerStore } = require('./db');
const { ok, error, obtenerVersion, obtenerCommit } = require('./util');

const RUTA_SALDO = /^\/saldo\/([^/]+)$/;
const RUTA_HISTORIAL = /^\/historial\/([^/]+)$/;

function leerCuerpo(event) {
  if (!event.body) {
    return {};
  }
  const texto = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  const cuerpo = JSON.parse(texto);
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    throw new SyntaxError('cuerpo invalido');
  }
  return cuerpo;
}

function parametro(coincidencia) {
  try {
    return decodeURIComponent(coincidencia[1]);
  } catch {
    throw new wallet.ErrorNegocio(400, 'usuario invalido');
  }
}

function enrutar(metodo, ruta, event) {
  if (metodo === 'GET' && ruta === '/salud') {
    obtenerStore();
    return ok({ ok: true, version: obtenerVersion(), commit: obtenerCommit() });
  }
  if (metodo === 'GET' && ruta === '/version') {
    return ok({ version: obtenerVersion(), commit: obtenerCommit() });
  }
  if (metodo === 'GET' && RUTA_SALDO.test(ruta)) {
    return ok(wallet.saldo(obtenerStore(), parametro(ruta.match(RUTA_SALDO))));
  }
  if (metodo === 'GET' && RUTA_HISTORIAL.test(ruta)) {
    return ok(wallet.historial(obtenerStore(), parametro(ruta.match(RUTA_HISTORIAL))));
  }
  if (metodo === 'POST' && ruta === '/transferir') {
    let cuerpo;
    try {
      cuerpo = leerCuerpo(event);
    } catch {
      return error(400, 'cuerpo invalido');
    }
    return ok(wallet.transferir(obtenerStore(), cuerpo));
  }
  return error(404, 'ruta no encontrada');
}

async function handler(event = {}) {
  const metodo = event.requestContext?.http?.method || 'GET';
  const ruta = event.rawPath || '/';
  try {
    return enrutar(metodo, ruta, event);
  } catch (e) {
    if (e instanceof wallet.ErrorNegocio) {
      return error(e.status, e.message);
    }
    console.error(e);
    return error(500, 'error interno');
  }
}

module.exports = { handler };
