// Permite importar archivos SVG desde componentes TypeScript.
// Webpack sustituye el import por la URL final del recurso generado en dist.
declare module "*.svg" {
  const assetUrl: string;
  export default assetUrl;
}

// Las ilustraciones raster se procesan como recursos y Webpack devuelve su URL.
declare module "*.png" {
  const rutaRecurso: string;
  export default rutaRecurso;
}
