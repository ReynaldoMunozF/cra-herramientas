# Despliegue del piloto privado de Teo

El catálogo y el PDF interno no se guardan en Git ni se importan en el bundle del navegador. Preparar antes del build la carpeta ignorada `private/teo-manual/` con:

- `catalogo.json` del paquete revisado.
- `manual.pdf` original.
- `imagenes/pagina-001.jpg` a `pagina-142.jpg`.

`npm run build` copia estos recursos a `dist/administracion/teo-manual/`. El middleware y el handler protegen esta ruta para administrador, también al solicitar archivos directamente. Es necesario desplegar **las funciones**, no solo assets.

Cada recurso consultado se conserva también en el bucket privado `MEDIA_PRIVADA` bajo `teo/manual-2025-revision-v1/`. El endpoint `/api/media` general no acepta ese prefijo. Si un build no contiene la carpeta local, solo estarán disponibles los recursos previamente guardados en R2: conservar el paquete completo antes de cualquier nuevo despliegue. El catálogo inicial está en estado de revisión; la marca personal de «revisado» no publica reglas.

La clave de R2 versiona esta revisión. Para publicar una revisión nueva, cambiar el prefijo del handler o migrar sus objetos de forma explícita; no mezclar imágenes o PDF de una edición distinta con el catálogo anterior.

Validación: `npm run type-check`, `node --test tests/teo.test.cjs tests/manual-teo.test.cjs tests/productividad.test.cjs`, `npm run build` y `wrangler pages functions build`.
