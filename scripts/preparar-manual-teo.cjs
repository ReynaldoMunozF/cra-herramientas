const fs = require('node:fs');
const path = require('node:path');
const origen = path.resolve(__dirname, '../private/teo-manual');
const destino = path.resolve(__dirname, '../dist/administracion/teo-manual');
// El contenido interno no se incorpora al repositorio ni al JavaScript público.
// En despliegues posteriores, el endpoint recupera las páginas ya guardadas en R2.
if (fs.existsSync(path.join(origen, 'catalogo.json'))) {
  fs.cpSync(origen, destino, { recursive: true });
  console.log('Manual de prueba preparado para acceso administrativo.');
} else {
  console.log('Sin copia local del manual: se utilizará el contenido privado guardado en R2.');
}
