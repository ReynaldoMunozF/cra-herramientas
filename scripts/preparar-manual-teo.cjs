const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const validar = require('./validar-paquete-manual-teo.cjs');
const origen = path.resolve(__dirname, '../private/teo-manual');
const paquete = path.resolve(__dirname, '../private/teo-manual.enc');
const destino = path.resolve(__dirname, '../dist/administracion/teo-manual');
// La clave solo existe como secreto de compilación en Cloudflare. No se importa en React.
const textoClave = process.env.TEO_MANUAL_BUILD_KEY;
if (fs.existsSync(paquete) && textoClave) {
  const contenido = fs.readFileSync(paquete);
  const clave = Buffer.from(textoClave, 'base64');
  if (clave.length !== 32 || contenido.subarray(0,4).toString() !== 'TEO1') throw new Error('Paquete del manual o clave de compilación no válidos.');
  const descifrar = crypto.createDecipheriv('aes-256-gcm', clave, contenido.subarray(4,16));
  descifrar.setAuthTag(contenido.subarray(16,32));
  const comprimido = Buffer.concat([descifrar.update(contenido.subarray(32)), descifrar.final()]);
  const archivos = JSON.parse(zlib.gunzipSync(comprimido).toString('utf8'));
  const catalogo = validar(archivos);
  for (const [relativo, base64] of Object.entries(archivos)) {
    const archivo = path.join(destino, relativo);
    fs.mkdirSync(path.dirname(archivo), {recursive:true});
    fs.writeFileSync(archivo, Buffer.from(base64, 'base64'));
  }
  console.log(`Manual descifrado: ${catalogo.procedimientos.length} fichas y ${catalogo.fuente.paginas} páginas para acceso administrativo.`);
} else if (fs.existsSync(path.join(origen, 'catalogo.json'))) {
  fs.cpSync(origen, destino, { recursive:true });
  console.log('Manual de prueba preparado desde la copia local privada.');
} else if (fs.existsSync(paquete)) {
  throw new Error('Falta el secreto de compilación TEO_MANUAL_BUILD_KEY. No se publica un manual incompleto.');
} else {
  console.log('Sin copia local del manual: se utilizarán los recursos privados ya guardados en R2.');
}
