/**
 * Puerta de acceso ejecutada por Cloudflare Pages antes de servir cualquier
 * HTML, JavaScript, imagen o dato del proyecto. Al vivir en el servidor, el
 * usuario y la contraseña nunca forman parte del paquete descargado al navegador.
 */

interface VariablesEntorno {
  USUARIO_DEMO: string;
  CONTRASENA_DEMO: string;
  SECRETO_SESION: string;
  CONTRASENA_INVITADO?: string;
}

interface ContextoCloudflare {
  request: Request;
  env: VariablesEntorno;
  next: () => Promise<Response>;
}

const NOMBRE_COOKIE = "sesion_cra";
const DURACION_SESION_SEGUNDOS = 8 * 60 * 60;
const codificador = new TextEncoder();

/** Convierte bytes a Base64 URL sin caracteres problemáticos para una cookie. */
const codificarBase64Url = (datos: Uint8Array) => {
  let binario = "";
  datos.forEach((byte) => { binario += String.fromCharCode(byte); });
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

/** Firma un texto mediante HMAC-SHA256 usando el secreto configurado en Cloudflare. */
const firmar = async (texto: string, secreto: string) => {
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", clave, codificador.encode(texto));
  return codificarBase64Url(new Uint8Array(firma));
};

/** Comparación constante para dificultar inferencias por tiempo de respuesta. */
const compararSeguro = (valorA: string, valorB: string) => {
  const longitud = Math.max(valorA.length, valorB.length);
  let diferencia = valorA.length ^ valorB.length;
  for (let indice = 0; indice < longitud; indice += 1) {
    diferencia |= (valorA.charCodeAt(indice) || 0) ^ (valorB.charCodeAt(indice) || 0);
  }
  return diferencia === 0;
};

const obtenerCookie = (peticion: Request, nombre: string) => {
  const cabecera = peticion.headers.get("Cookie") || "";
  const pareja = cabecera.split(";").map((valor) => valor.trim())
    .find((valor) => valor.startsWith(`${nombre}=`));
  return pareja ? pareja.slice(nombre.length + 1) : null;
};

/** Crea un comprobante firmado con usuario y fecha de caducidad. */
type RolUsuario = "administrador" | "invitado";

const crearSesion = async (usuario: string, rol: RolUsuario, secreto: string) => {
  const contenido = JSON.stringify({
    usuario,
    rol,
    caduca: Math.floor(Date.now() / 1000) + DURACION_SESION_SEGUNDOS,
  });
  const carga = codificarBase64Url(codificador.encode(contenido));
  return `${carga}.${await firmar(carga, secreto)}`;
};

/** Valida firma, caducidad y usuario sin confiar en los datos de la cookie. */
const obtenerSesion = async (peticion: Request, entorno: VariablesEntorno) => {
  const cookie = obtenerCookie(peticion, NOMBRE_COOKIE);
  if (!cookie) return null;
  const [carga, firmaRecibida] = cookie.split(".");
  if (!carga || !firmaRecibida) return null;
  const firmaEsperada = await firmar(carga, entorno.SECRETO_SESION);
  if (!compararSeguro(firmaRecibida, firmaEsperada)) return null;

  try {
    const texto = atob(carga.replace(/-/g, "+").replace(/_/g, "/"));
    const datos = JSON.parse(texto) as { usuario: string; rol?: RolUsuario; caduca: number };
    const rol = datos.rol ?? "administrador";
    const usuarioValido = rol === "administrador"
      ? datos.usuario === entorno.USUARIO_DEMO
      : datos.usuario === "invitado-cra";
    return usuarioValido && datos.caduca > Math.floor(Date.now() / 1000)
      ? { usuario: datos.usuario, rol }
      : null;
  } catch {
    return null;
  }
};

const cabecerasSeguridad = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

/** Pantalla independiente: no necesita descargar ningún recurso de la aplicación. */
const crearPaginaAcceso = (mensaje = "") => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Acceso restringido · CRA</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:grid;place-items:center;padding:20px;color:#17324d;font-family:Segoe UI,Arial,sans-serif;background:radial-gradient(circle at 10% 0%,#dff4ff,transparent 34rem),#f2f7fa}.tarjeta{width:min(100%,430px);overflow:hidden;background:#fff;border:1px solid #d9e7ef;border-radius:20px;box-shadow:0 20px 55px #17324d24}.cabecera{padding:28px;color:#fff;background:linear-gradient(125deg,#0077b8,#019df4);border-bottom:6px solid #ffd100}.marca{display:block;margin-bottom:8px;color:#ffd100;font-size:.72rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.cabecera h1{font-size:1.8rem}.cabecera p{margin-top:8px;color:#ffffffd9;line-height:1.45}.contenido{padding:26px}.aviso{margin-bottom:18px;padding:11px 13px;color:#842b25;font-size:.84rem;background:#fff0ef;border:1px solid #e6b6b2;border-radius:9px}label{display:block;margin:14px 0 7px;font-size:.82rem;font-weight:800}input{width:100%;min-height:48px;padding:11px 13px;color:#17324d;font:inherit;border:1px solid #bfd2dd;border-radius:10px;outline:none}input:focus{border-color:#019df4;box-shadow:0 0 0 3px #019df426}button{width:100%;min-height:50px;margin-top:20px;color:#fff;font:inherit;font-weight:850;cursor:pointer;background:linear-gradient(120deg,#0077b8,#019df4);border:0;border-bottom:4px solid #ffd100;border-radius:10px}.pie{margin-top:17px;color:#60758a;font-size:.72rem;line-height:1.45;text-align:center}
  </style>
</head>
<body>
  <main class="tarjeta">
    <header class="cabecera"><span class="marca">Herramienta interna CRA</span><h1>Acceso restringido</h1><p>Identifícate para consultar el manual operativo y los cuadrantes.</p></header>
    <form class="contenido" action="/acceso" method="post">
      ${mensaje ? `<p class="aviso">${mensaje}</p>` : ""}
      <label for="usuario">Usuario</label><input id="usuario" name="usuario" autocomplete="username" required maxlength="80">
      <label for="contrasena">Contraseña</label><input id="contrasena" name="contrasena" type="password" autocomplete="current-password" required maxlength="160">
      <button type="submit">Iniciar sesión</button>
      <p class="pie">Acceso exclusivo para personal autorizado. La sesión caduca automáticamente.</p>
    </form>
  </main>
</body>
</html>`;

const respuestaAcceso = (mensaje = "", estado = 200) => new Response(crearPaginaAcceso(mensaje), {
  status: estado,
  headers: cabecerasSeguridad,
});

export const onRequest = async (contexto: ContextoCloudflare) => {
  const { request: peticion, env: entorno } = contexto;
  const url = new URL(peticion.url);

  if (!entorno.USUARIO_DEMO || !entorno.CONTRASENA_DEMO || !entorno.SECRETO_SESION) {
    return respuestaAcceso("La protección todavía no está configurada en Cloudflare.", 503);
  }

  if (url.pathname === "/cerrar-sesion") {
    return new Response(crearPaginaAcceso("La sesión se ha cerrado correctamente."), {
      headers: {
        ...cabecerasSeguridad,
        "Set-Cookie": `${NOMBRE_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
      },
    });
  }

  if (url.pathname === "/acceso" && peticion.method === "POST") {
    const formulario = await peticion.formData();
    const usuario = String(formulario.get("usuario") || "");
    const contrasena = String(formulario.get("contrasena") || "");
    const esAdministrador = compararSeguro(usuario, entorno.USUARIO_DEMO)
      && compararSeguro(contrasena, entorno.CONTRASENA_DEMO);
    const esInvitado = Boolean(entorno.CONTRASENA_INVITADO)
      && compararSeguro(usuario.toLowerCase(), "invitado-cra")
      && compararSeguro(contrasena, entorno.CONTRASENA_INVITADO || "");

    if (!esAdministrador && !esInvitado) {
      return respuestaAcceso("Usuario o contraseña incorrectos.", 401);
    }

    const rol: RolUsuario = esAdministrador ? "administrador" : "invitado";
    const sesion = await crearSesion(
      esAdministrador ? entorno.USUARIO_DEMO : "invitado-cra",
      rol,
      entorno.SECRETO_SESION
    );
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Set-Cookie": `${NOMBRE_COOKIE}=${sesion}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${DURACION_SESION_SEGUNDOS}`,
      },
    });
  }

  const sesionActiva = await obtenerSesion(peticion, entorno);
  if (!sesionActiva) {
    return respuestaAcceso();
  }

  if (url.pathname === "/api/sesion") {
    return new Response(JSON.stringify(sesionActiva), {
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  }

  const rutaAdministrativa = url.pathname === "/administracion/manual"
    || url.pathname.startsWith("/api/administracion/");
  if (sesionActiva.rol !== "administrador" && rutaAdministrativa) {
    return new Response(JSON.stringify({ error: "Acceso reservado al administrador." }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  }

  // Solo después de validar la sesión se permite que Pages entregue el recurso.
  const respuesta = await contexto.next();
  const respuestaSegura = new Response(respuesta.body, respuesta);
  respuestaSegura.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  respuestaSegura.headers.set("Cache-Control", "private, no-store");
  respuestaSegura.headers.set("X-Content-Type-Options", "nosniff");
  respuestaSegura.headers.set("Referrer-Policy", "no-referrer");
  return respuestaSegura;
};
