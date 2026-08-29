# Copias diarias de D1

Worker independiente de la aplicación que exporta `manual-cra-contenido` cada día a las 02:17 UTC.

- Destino: Cloudflare KV `RESPALDOS`
- Formato: instantánea JSON completa de los datos, comprimida con gzip
- Retención: 30 días mediante caducidad automática de cada copia
- Estado de la última copia: `estado/ultima-copia.json`
- Los archivos nunca escriben ni modifican la base D1 original.
