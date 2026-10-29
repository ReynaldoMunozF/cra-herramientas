# Despliegue del piloto privado de Teo

`private/teo-manual.enc` contiene el catálogo, el PDF y las 142 imágenes en un paquete comprimido cifrado con AES-256-GCM. No contiene la clave. El secreto `TEO_MANUAL_BUILD_KEY` está configurado en el entorno de compilación de producción de Cloudflare Pages. No debe importarse en React ni incluirse en variables públicas.

`npm run build` compila la aplicación y descifra el paquete únicamente en `dist/administracion/teo-manual/`. El middleware y el handler protegen esta ruta para administrador, también al solicitar archivos directamente. Es necesario desplegar **las funciones**, no solo assets. Si existe el paquete cifrado pero no hay clave ni copia local, la compilación falla antes de publicar contenido incompleto.

En local, puede prepararse la carpeta ignorada `private/teo-manual/` con `catalogo.json`, `manual.pdf` e `imagenes/pagina-001.jpg` hasta `pagina-142.jpg`; nunca añadir estos originales a Git. Para cambiar el contenido de producción, regenerar el paquete con cifrado autenticado y actualizar el secreto de compilación en Cloudflare, sin imprimir ni guardar la clave en el repositorio.

Cada recurso consultado se conserva también en el bucket privado `MEDIA_PRIVADA` bajo `teo/manual-2025-revision-v1/`. El endpoint `/api/media` general no acepta ese prefijo. La clave de R2 versiona esta revisión: para publicar una revisión nueva, cambiar el prefijo del handler o migrar sus objetos explícitamente; no mezclar documentos de ediciones distintas.

El catálogo inicial está pendiente de revisión. Las marcas personales y notas se guardan en el navegador, son compatibles con el HTML de revisión y no publican reglas. Se pueden exportar en JSON.

Validación: `npm run type-check`, `node --test tests/teo.test.cjs tests/manual-teo.test.cjs tests/productividad.test.cjs`, `npm run build` y `wrangler pages functions build`.
