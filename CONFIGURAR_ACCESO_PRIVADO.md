# Configurar el acceso privado en Cloudflare Pages

La autenticación se ejecuta en `functions/_middleware.ts` antes de entregar
cualquier archivo de la aplicación. Las credenciales no deben escribirse nunca
en React, GitHub ni en un archivo dentro de `dist`.

## 1. Crear los secretos

En el proyecto de Cloudflare Pages, abre **Settings → Variables and Secrets** y
añade estas tres variables como **Secret** para producción:

- `USUARIO_DEMO`: nombre utilizado en el formulario.
- `CONTRASENA_DEMO`: contraseña larga y exclusiva para esta demo.
- `SECRETO_SESION`: cadena aleatoria diferente de la contraseña, recomendablemente
  de 32 caracteres o más. Se utiliza para firmar las cookies.

Configura también los secretos para Preview si quieres proteger las versiones
de prueba.

## 2. Publicar incluyendo Pages Functions

El método de publicación debe admitir la carpeta `functions`. Una subida que
contenga únicamente `dist` publicará los archivos estáticos, pero no activará la
autenticación.

Desde la carpeta del proyecto:

```powershell
npm run build
npx wrangler pages deploy dist --project-name NOMBRE_REAL_DEL_PROYECTO
```

También se puede conectar el repositorio a Cloudflare Pages y utilizar:

- Comando de compilación: `npm run build`
- Directorio de salida: `dist`

## 3. Comprobar la protección

1. Abre la web en una ventana privada.
2. Debe aparecer **Acceso restringido**, no la aplicación React.
3. Prueba una contraseña incorrecta.
4. Accede con las credenciales guardadas como secretos.
5. Pulsa **Cerrar sesión** y verifica que vuelve el formulario.
6. Intenta abrir directamente un archivo JavaScript de `dist`; sin sesión debe
   seguir apareciendo la pantalla de acceso.

## Seguridad incluida

- Cookie `HttpOnly`, `Secure` y `SameSite=Strict`.
- Sesión firmada con HMAC-SHA256 y caducidad de ocho horas.
- Sin credenciales dentro del código del navegador.
- Respuestas privadas sin caché.
- `X-Robots-Tag: noindex, nofollow, noarchive`.
- Bloqueo de marcos, referencias externas y detección incorrecta de contenido.
