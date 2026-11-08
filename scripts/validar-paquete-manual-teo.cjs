const crypto = require('node:crypto');

module.exports = function validarPaquete(archivos) {
  if (!archivos['catalogo.json'] || !archivos['manual.pdf']) throw new Error('El paquete del manual está incompleto.');
  const catalogo = JSON.parse(Buffer.from(archivos['catalogo.json'], 'base64').toString('utf8'));
  const paginas = catalogo.fuente?.paginas;
  if (!Number.isInteger(paginas) || paginas < 1 || paginas > 999) throw new Error('Número de páginas no válido.');
  const esperados = new Set(['catalogo.json', 'manual.pdf', ...Array.from({length:paginas}, (_,i)=>`imagenes/pagina-${String(i+1).padStart(3,'0')}.jpg`)]);
  if (Object.keys(archivos).length !== esperados.size || Object.keys(archivos).some(a=>!esperados.has(a)) || [...esperados].some(a=>!archivos[a])) throw new Error('Faltan páginas o existen archivos no permitidos en el paquete.');
  if (crypto.createHash('sha256').update(Buffer.from(archivos['manual.pdf'],'base64')).digest('hex') !== catalogo.fuente.sha256) throw new Error('El catálogo no corresponde al PDF empaquetado.');
  for (const p of catalogo.procedimientos) {
    for (const citas of [p.paginas, ...Object.values(p.nodos).map(n=>n.paginas)]) {
      if (!citas?.length || citas.some(i=>!Number.isInteger(i)||i<1||i>paginas)) throw new Error('Referencia fuera del manual: '+p.id);
    }
  }
  return catalogo;
};
