# CRA Social

CRA Social usa dos procesos: la aplicación React y un Worker de Cloudflare con
Durable Objects.

## Desarrollo local

Instala las dependencias y abre dos terminales:

```bash
npm install
npm run social-server:dev
```

```bash
npm start
```

En local, el cliente se conecta automáticamente a `ws://localhost:8787`.

## Comprobaciones

```bash
npm run type-check
npm run type-check:social-server
npm run build
```

## Publicación

Primero publica el servidor:

```bash
npm run social-server:deploy
```

En producción se recomienda configurar `ORIGEN_PERMITIDO` con el origen exacto
de la aplicación, por ejemplo `https://mi-aplicacion.pages.dev`. Puede añadirse
como variable del Worker desde Cloudflare o mediante Wrangler.

Copia la URL `https://...workers.dev` que devuelve Wrangler. Para crear el
cliente de producción, define la misma URL usando el protocolo `wss://`:

```bash
CRA_SOCIAL_WS_URL=wss://cra-social-server.<cuenta>.workers.dev npm run build
```

En Cloudflare Pages, configura `CRA_SOCIAL_WS_URL` como variable del entorno de
compilación y usa `npm run build` como comando de build y `dist` como carpeta de
salida.

Si cliente y servidor se publican bajo el mismo dominio con una ruta
`/cra-social`, la variable puede omitirse.
