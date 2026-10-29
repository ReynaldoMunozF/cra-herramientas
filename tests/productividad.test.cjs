const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargar, crearEntorno } = require('./ayudas/productividad.cjs');
const api = cargar('functions/api/productividad.ts');
const seguridad = cargar('functions/api/_seguridad-pin.ts');
const pin = cargar('functions/api/pin-operador.ts');
const dia = { matricula: 'RMI', fecha: '2026-10-29', totalAlarmas: 120, horasTrabajadas: 8, citas: 4, llamadasEntrantes: 6, gestionesAdministrativas: 2, tramosEmail: [{ codigoAlarma: 'DEMO001', inicio: '10:00', fin: '10:30' }] };
const contexto = (env, request, data = { rol: 'administrador' }) => ({ env, request, data });

test('guarda, relee y actualiza el mismo día a través del controlador actual', async () => {
  const { env, registros } = crearEntorno();
  const guardar = datos => api.onRequest(contexto(env, new Request('https://cra.test/api/productividad', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })));
  const primero = await guardar(dia); assert.equal(primero.status, 200);
  assert.equal((await primero.json()).registro.tramos_email[0].codigoAlarma, 'DEMO001');
  const actualizado = await guardar({ ...dia, totalAlarmas: 140 }); assert.equal(actualizado.status, 200);
  assert.equal(registros.size, 1);
  const lectura = await api.onRequest(contexto(env, new Request('https://cra.test/api/productividad?matricula=RMI&mes=2026-10')));
  const datos = await lectura.json(); assert.equal(datos.registros.length, 1); assert.equal(datos.registros[0].total_alarmas, 140);
});
test('mantiene las validaciones de horas, cantidades y gestiones email', async () => {
  const { env, registros } = crearEntorno();
  for (const cambio of [{ horasTrabajadas: 0 }, { citas: 121 }, { tramosEmail: [{ inicio: '10:00', fin: '18:00' }] }]) {
    const r = await api.onRequest(contexto(env, new Request('https://cra.test/api/productividad', { method: 'PUT', body: JSON.stringify({ ...dia, ...cambio }) })));
    assert.equal(r.status, 400);
  }
  assert.equal(registros.size, 0);
});
test('el PIN sigue siendo obligatorio donde lo exige la política actual', async () => {
  const { env, pines } = crearEntorno();
  const hash = await seguridad.crearHashPin('1234', '00112233445566778899aabbccddeeff', 0, env.SECRETO_SESION);
  pines.set('RMI', { salt: hash.salt, pin_hash: hash.hash, iteraciones: 0, fallos: 0, bloqueado_hasta: 0 });
  const url = 'https://cra.test/api/productividad?matricula=RMI&mes=2026-10';
  const bloqueado = await api.onRequest(contexto(env, new Request(url), { rol: 'invitado' }));
  assert.equal(bloqueado.status, 401); assert.equal((await bloqueado.json()).requierePin, true);
  const login = await pin.onRequestPost(contexto(env, new Request('https://cra.test/api/pin-operador', { method: 'POST', body: JSON.stringify({ matricula: 'RMI', pin: '1234' }) }), { rol: 'invitado' }));
  const token = (await login.json()).token; assert.equal(login.status, 200); assert.match(token, /^[a-f0-9]{64}$/);
  const permitido = await api.onRequest(contexto(env, new Request(url, { headers: { 'X-Operador-Token': token } }), { rol: 'invitado' }));
  assert.equal(permitido.status, 200);
});
test('un operador no puede leer ni modificar la matrícula de otro', async () => {
  const { env, registros } = crearEntorno();
  const data = { rol: 'operador', matricula: 'OTRO' };
  const lectura = await api.onRequest(contexto(env, new Request('https://cra.test/api/productividad?matricula=RMI&mes=2026-10'), data));
  assert.equal(lectura.status, 403);
  const escritura = await api.onRequest(contexto(env, new Request('https://cra.test/api/productividad', { method: 'PUT', body: JSON.stringify(dia) }), data));
  assert.equal(escritura.status, 403); assert.equal(registros.size, 0);
});
