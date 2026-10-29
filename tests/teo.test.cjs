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
  vm.runInNewContext(codigo, { module, exports: module.exports, require: requireLocal, URL, Response, Request, TextEncoder, URLSearchParams, AbortController, crypto: require("node:crypto").webcrypto, atob, btoa, console, ...globals }, { filename: archivo });
  return module.exports;
}
const postal = cargar('functions/_datos/busquedaPostal.ts');
const api = cargar('functions/api/administracion/teo.ts');
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
test('la API administrativa rechaza operador, invitado y ausencia de sesión', async () => {
  for (const rol of ['operador', 'invitado', undefined]) {
    const r = await api.onRequestGet({ request: new Request('https://cra.test/api/administracion/teo?texto=Parla'), data: { rol } });
    assert.equal(r.status, 403);
  }
});
test('la API permite al administrador buscar y valida longitud', async () => {
  const bad = await api.onRequestGet({ request: new Request('https://cra.test/api/administracion/teo?texto=a'), data: { rol: 'administrador' } });
  assert.equal(bad.status, 400);
  const ok = await api.onRequestGet({ request: new Request('https://cra.test/api/administracion/teo?texto=Parla'), data: { rol: 'administrador' } });
  assert.equal(ok.status, 200); assert.equal(ok.headers.get('cache-control'), 'private, no-store');
  assert.equal((await ok.json()).localidades[0].nombre, 'Parla');
});
test('el endpoint combina el catálogo real y las correcciones D1 sin inventar datos', async () => {
  const peticiones = [];
  const env = { CONTENIDO_DB: { prepare: (sql) => ({ bind: () => ({ first: async () => {
    peticiones.push(sql);
    if (sql.includes('codigos_postales_cache')) return null;
    return { resultadoMostrado: 'Policía Nacional', esCorrecto: 1, resultadoCorregido: null };
  } }) }) } };
  const r = await api.onRequestGet({ request: new Request('https://cra.test/api/administracion/teo?codigoPostal=28981'), env, data: { rol: 'administrador' } });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.ubicacion.nombre, 'Parla'); assert.equal(d.orientacion.principal, 'Policía Nacional');
  assert.equal(d.orientacion.confianza, 'alta'); assert.equal(d.validacionDisponible, true);
  assert.equal(peticiones.length, 2);
});
test('informa del fallo de validaciones y rechaza códigos malformados', async () => {
  const env = { CONTENIDO_DB: { prepare: (sql) => ({ bind: () => ({ first: async () => {
    if (sql.includes('codigos_postales_cache')) return null;
    throw Error('D1 unavailable');
  } }) }) } };
  const r = await api.onRequestGet({ request: new Request('https://cra.test/api/administracion/teo?codigoPostal=28981'), env, data: { rol: 'administrador' } });
  assert.equal((await r.json()).validacionDisponible, false);
  const bad = await api.onRequestGet({ request: new Request('https://cra.test/api/administracion/teo?codigoPostal=invalid'), data: { rol: 'administrador' } });
  assert.equal(bad.status, 400);
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
test('el cliente reconoce una sesión caducada y transmite la cancelación', async () => {
  const signal = new AbortController().signal;
  let recibido;
  const cliente = cargar('src/servicios/teo.ts', { fetch: async (_url, opciones) => {
    recibido = opciones.signal;
    return new Response('<html>Acceso</html>', { headers: { 'Content-Type': 'text/html' } });
  } });
  await assert.rejects(cliente.consultarTeo(new URLSearchParams({ texto: 'Parla' }), signal), cliente.SesionTeoError);
  assert.equal(recibido, signal);
  const bloqueado = cargar('src/servicios/teo.ts', { fetch: async () => new Response('{}', { status: 403 }) });
  await assert.rejects(bloqueado.consultarTeo(new URLSearchParams(), signal), bloqueado.SesionTeoError);
});

// Test the real access gate as well as the handler's defence in depth.
test('el middleware protege Teo con cookies firmadas y bloquea acceso directo sin administrador', async () => {
  const middleware = cargar('functions/_middleware.ts');
  const secret = 'synthetic-test-only-session-key';
  const env = { USUARIO_DEMO: 'fixture-admin', CONTRASENA_DEMO: 'fixture-only', SECRETO_SESION: secret,
    CONTENIDO_DB: { prepare: () => ({ bind: () => ({ first: async () => ({ matricula: 'OP01' }) }) }) } };
  for (const rol of ['administrador', 'operador', 'invitado']) {
    const carga = Buffer.from(JSON.stringify({ usuario: rol === 'administrador' ? 'fixture-admin' : rol === 'invitado' ? 'invitado-cra' : 'OP01', rol, matricula: 'OP01', caduca: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
    const firma = require('node:crypto').createHmac('sha256', secret).update(carga).digest('base64url');
    let llego = false;
    const contexto = { request: new Request('https://cra.test/api/administracion/teo?texto=Parla', { headers: { Cookie: `sesion_cra=${carga}.${firma}` } }), env,
      next: async () => { llego = true; return Response.json({ ok: true }); } };
    const respuesta = await middleware.onRequest(contexto);
    assert.equal(respuesta.status, rol === 'administrador' ? 200 : 403);
    assert.equal(llego, rol === 'administrador');
  }
  let llego = false;
  await middleware.onRequest({ request: new Request('https://cra.test/api/administracion/teo?texto=Parla'), env, next: async () => { llego = true; return new Response(); } });
  assert.equal(llego, false);
});

test('interpreta los tres formatos de coordenadas y conserva las consultas postales', () => {
  const { interpretarCoordenadas } = cargar('src/servicios/coordenadasTeo.ts');
  for (const texto of ['40.4168, -3.7038', '40.4168 -3.7038', '40,4168; -3,7038', '40.4168, −3.7038']) {
    const r = interpretarCoordenadas(texto);
    assert.equal(r.tipo, 'validas'); assert.equal(r.latitud, 40.4168); assert.equal(r.longitud, -3.7038);
  }
  assert.equal(interpretarCoordenadas('0, 0').tipo, 'validas');
  assert.equal(interpretarCoordenadas('28981').tipo, 'texto');
  assert.equal(interpretarCoordenadas('Parla').tipo, 'texto');
});
test('no adivina coordenadas ambiguas, incompletas o fuera de rango', () => {
  const { interpretarCoordenadas } = cargar('src/servicios/coordenadasTeo.ts');
  for (const texto of ['91, -3', '40, -181', '40,4168, -3,7038']) assert.equal(interpretarCoordenadas(texto).tipo, 'invalidas');
  for (const texto of ['40.4168,', '40.4168', '40.4168 -']) assert.equal(interpretarCoordenadas(texto).tipo, 'incompletas');
});

const puntoPrueba = (address) => ({ lat: '40.2379', lon: '-3.7741', display_name: 'Dirección de prueba, Parla, Madrid, España', address });
const contextoPunto = (query, env = {}) => ({ request: new Request('https://cra.test/api/administracion/teo?' + query), data: { rol: 'administrador' }, env });

test('coordenadas reutilizan Localización y el CP para recuperar las correcciones FSE', async () => {
  let consultasUbicacion = 0, consultasDb = 0;
  const endpoint = cargar('functions/api/administracion/teo.ts', { fetch: async url => {
    assert.equal(url.hostname, 'nominatim.openstreetmap.org'); assert.equal(url.pathname, '/reverse');
    assert.equal(url.searchParams.get('lat'), '40.2379'); assert.equal(url.searchParams.get('lon'), '-3.7741');
    consultasUbicacion++;
    return Response.json(puntoPrueba({ town: 'Parla', county: 'Madrid', state: 'Comunidad de Madrid', postcode: '28981', country: 'España', country_code: 'es' }));
  } });
  const env = { CONTENIDO_DB: { prepare: sql => ({ bind: cp => ({ first: async () => {
    consultasDb++; assert.equal(cp, '28981');
    if (sql.includes('codigos_postales_cache')) return null;
    return { resultadoMostrado: 'Policía Nacional', esCorrecto: 1, resultadoCorregido: null };
  } }) }) } };
  const r = await endpoint.onRequestGet(contextoPunto('latitud=40.2379&longitud=-3.7741', env));
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.ubicacion.localidad, 'Parla'); assert.equal(d.ubicacion.codigoPais, 'es');
  assert.equal(d.fse.orientacion.principal, 'Policía Nacional'); assert.equal(d.fse.orientacion.confianza, 'alta');
  assert.equal(consultasUbicacion, 1); assert.equal(consultasDb, 2);
});
test('sin CP o fuera de España se muestra la ubicación sin inferir una FSE', async () => {
  for (const address of [
    { town: 'Parla', country: 'España', country_code: 'es' },
    { city: 'Paris', postcode: '75001', country: 'France', country_code: 'fr' },
    { town: 'Sin país confirmado', postcode: '28981' },
  ]) {
    const endpoint = cargar('functions/api/administracion/teo.ts', { fetch: async () => Response.json(puntoPrueba(address)) });
    const r = await endpoint.onRequestGet(contextoPunto('latitud=40.2379&longitud=-3.7741'));
    const d = await r.json();
    assert.equal(r.status, 200); assert.equal(d.fse, null); assert.ok(d.avisoFse);
  }
});
test('un fallo en D1 no elimina la dirección recuperada', async () => {
  const endpoint = cargar('functions/api/administracion/teo.ts', { fetch: async () => Response.json(puntoPrueba({ town: 'Parla', postcode: '28981', country: 'España', country_code: 'es' })) });
  const env = { CONTENIDO_DB: { prepare: () => { throw Error('DB unavailable'); } } };
  const r = await endpoint.onRequestGet(contextoPunto('latitud=40.2379&longitud=-3.7741', env));
  const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.ubicacion.localidad, 'Parla'); assert.equal(d.fse, null); assert.match(d.avisoFse, /no está disponible/);
});
test('valida coordenadas y permisos antes de consultar el proveedor', async () => {
  let llamadas = 0;
  const endpoint = cargar('functions/api/administracion/teo.ts', { fetch: async () => { llamadas++; throw Error('No debe consultarse'); } });
  for (const query of ['latitud=91&longitud=2', 'latitud=40', 'latitud=&longitud=2', 'latitud=x&longitud=2']) {
    const r = await endpoint.onRequestGet(contextoPunto(query)); assert.equal(r.status, 400);
  }
  for (const rol of ['invitado', 'operador']) {
    const r = await endpoint.onRequestGet({ ...contextoPunto('latitud=40&longitud=-3'), data: { rol } }); assert.equal(r.status, 403);
  }
  assert.equal(llamadas, 0);
});
test('conserva el error de Localización para poder reintentar', async () => {
  const endpoint = cargar('functions/api/administracion/teo.ts', { fetch: async () => new Response('Unavailable', { status: 503 }) });
  const r = await endpoint.onRequestGet(contextoPunto('latitud=40&longitud=-3'));
  assert.equal(r.status, 502); assert.match((await r.json()).error, /No ha sido posible/);
});
