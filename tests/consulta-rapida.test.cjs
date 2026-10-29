const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual TypeScript modules with Node's built-in test runner.
function cargar(relativo, globals = {}) {
  const archivo = path.resolve(__dirname, '..', relativo);
  const module = { exports: {} };
  const requireLocal = (nombre) => {
    const destino = path.resolve(path.dirname(archivo), nombre);
    if (nombre.endsWith('.json')) return JSON.parse(fs.readFileSync(destino, 'utf8'));
    return cargar(path.relative(path.resolve(__dirname, '..'), destino + '.ts'), globals);
  };
  const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true },
  }).outputText;
  vm.runInNewContext(codigo, { module, exports: module.exports, require: requireLocal, URL, Response, Request, console, ...globals }, { filename: archivo });
  return module.exports;
}
const postal = cargar('functions/api/consulta-rapida.ts');
const fse = cargar('src/servicios/orientacionFse.ts');
const alfabeto = cargar('src/servicios/alfabetoFonetico.ts');

test('deletrea tildes, ñ, espacios y números igual que la herramienta existente', () => {
  assert.equal(alfabeto.obtenerDeletreo('Peña 24').join(' · '), 'Papa · Echo · November · Alfa · / · Dos · Cuatro');
  assert.equal(alfabeto.obtenerDeletreo('').length, 0);
});
test('prioriza Parla frente a Parlavà y conserva sus códigos complementarios', () => {
  const r = postal.buscarLocalidades('Parla');
  assert.equal(r.localidades[0].nombre, 'Parla');
  assert.equal(r.localidades[0].provincia, 'Madrid');
  assert.ok(r.localidades[0].codigos.some(c => c.codigoPostal === '28981' && !c.complementario));
  assert.ok(r.localidades[0].codigos.some(c => c.codigoPostal === '28980' && c.complementario));
});
test('busca por provincia, sin tildes y por código postal conservando el cero inicial', () => {
  assert.equal(postal.buscarLocalidades('Alcala de Henares Madrid').localidades[0].nombre, 'Alcalá de Henares');
  assert.equal(postal.buscarLocalidades('01001').localidades[0].codigos[0].codigoPostal, '01001');
  assert.equal(postal.buscarLocalidades('28981').localidades[0].nombre, 'Parla');
});
test('conserva homónimos y limita resultados sin ocultar el total', () => {
  const amplio = postal.buscarLocalidades('san');
  assert.equal(amplio.localidades.length, 8); assert.ok(amplio.total > 8);
  const homonimos = postal.buscarLocalidades('Cabanes').localidades.filter(l => l.nombre === 'Cabanes');
  assert.ok(new Set(homonimos.map(l => l.provincia)).size > 1);
  assert.equal(postal.buscarLocalidades('ZZZZNOEXISTE').total, 0);
});
test('API valida longitud y devuelve catálogo con cabeceras privadas', async () => {
  const bad = postal.onRequestGet({ request: new Request('https://cra.test/api/consulta-rapida?texto=a') });
  assert.equal(bad.status, 400);
  const ok = postal.onRequestGet({ request: new Request('https://cra.test/api/consulta-rapida?texto=Parla') });
  assert.equal(ok.status, 200); assert.equal(ok.headers.get('cache-control'), 'private, no-store');
  assert.equal((await ok.json()).localidades[0].nombre, 'Parla');
});
test('reutiliza demarcaciones y nunca presenta la aproximación como confirmada', () => {
  const parla = fse.calcularOrientacion('28981', { nombre: 'Parla', provincia: 'Madrid', comunidad: 'Comunidad de Madrid' });
  assert.equal(parla.principal, 'Policía Nacional'); assert.equal(parla.confianza, 'media');
  const desconocida = fse.calcularOrientacion('28981', { nombre: 'Sin referencia', provincia: 'Madrid' });
  assert.equal(desconocida.confianza, 'baja');
});
test('conserva la corrección y su confirmación posterior', () => {
  const base = { principal: 'Guardia Civil', concurrentes: ['Policía Nacional'], criterio: 'base', confianza: 'baja' };
  const corregida = fse.aplicarValidacionFse(base, { resultadoAsignado: 'Policía Nacional', resultadoConfirmado: 'Policía Nacional' });
  assert.equal(corregida.principal, 'Policía Nacional'); assert.equal(corregida.confianza, 'alta');
  assert.equal(corregida.concurrentes.join(','), 'Guardia Civil');
});
test('distingue fallo de validaciones de una respuesta sin correcciones y respeta cancelación', async () => {
  const ubicacion = { nombre: 'Parla', provincia: 'Madrid' };
  const sinRed = cargar('src/servicios/orientacionFse.ts', { fetch: async () => { throw Error('offline'); } });
  assert.equal((await sinRed.consultarOrientacionFse('28981', ubicacion)).validacionDisponible, false);
  const conRed = cargar('src/servicios/orientacionFse.ts', { fetch: async () => Response.json({}) });
  assert.equal((await conRed.consultarOrientacionFse('28981', ubicacion)).validacionDisponible, true);
  await assert.rejects(sinRed.consultarOrientacionFse('28981', ubicacion, { aborted: true }));
});
