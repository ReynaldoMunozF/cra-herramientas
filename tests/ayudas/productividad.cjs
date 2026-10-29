const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
function cargar(relativo) {
  const archivo = path.resolve(root, relativo), modulo = { exports: {} };
  const localRequire = nombre => {
    const destino = path.resolve(path.dirname(archivo), nombre);
    return nombre.endsWith('.json') ? JSON.parse(fs.readFileSync(destino, 'utf8')) : cargar(path.relative(root, destino + '.ts'));
  };
  const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, require: localRequire, URL, Request, Response, TextEncoder, crypto: crypto.webcrypto, ArrayBuffer, Uint8Array });
  return modulo.exports;
}

// D1 en memoria para ejecutar los controladores reales sin escribir datos de producción.
function crearEntorno() {
  const registros = new Map(), pines = new Map(), sesiones = new Map();
  const env = { SECRETO_SESION: 'synthetic-productivity-test-key', CONTENIDO_DB: { prepare(sql) {
    let args = [];
    const sentencia = {
      bind(...valores) { args = valores; return sentencia; },
      async first() {
        if (sql.includes('FROM cuentas_operadores')) return null;
        if (sql.includes('FROM pines_operadores')) return pines.get(args[0]) ?? null;
        if (sql.includes('FROM sesiones_pin_operador')) {
          const sesion = sesiones.get(args[0]);
          return sesion?.matricula === args[1] && sesion.caduca_en > Date.now() / 1000 ? sesion : null;
        }
        if (sql.includes('FROM registros_productividad')) return registros.get(`${args[0]}|${args[1]}`) ?? null;
        throw Error('SQL no contemplado: ' + sql);
      },
      async all() {
        if (!sql.includes('FROM registros_productividad')) throw Error('SQL inesperado');
        return { success: true, results: [...registros.values()].filter(r => r.matricula === args[0] && r.fecha.startsWith(args[1].replace('%', ''))) };
      },
      async run() {
        if (sql.includes('INSERT INTO registros_productividad')) {
          const [matricula, fecha, total_alarmas, horas_trabajadas, citas, llamadas_entrantes, gestiones_administrativas, tramos_email] = args;
          registros.set(`${matricula}|${fecha}`, { id: 1, matricula, fecha, total_alarmas, horas_trabajadas, citas, llamadas_entrantes, gestiones_administrativas, tramos_email, actualizado_en: new Date().toISOString() });
        } else if (sql.includes('INSERT INTO sesiones_pin_operador')) {
          sesiones.set(args[0], { matricula: args[1], caduca_en: args[2] });
        } else if (sql.includes('UPDATE pines_operadores') || sql.includes('DELETE FROM sesiones_pin_operador')) {
          // Las pruebas no simulan avance de reloj ni varios intentos fallidos.
        } else throw Error('SQL no contemplado: ' + sql);
        return { success: true };
      },
    };
    return sentencia;
  } } };
  return { env, registros, pines, sesiones };
}
module.exports = { cargar, crearEntorno };
