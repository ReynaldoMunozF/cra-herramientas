interface Env { SECRETO_TABERNA: string }
interface Contexto { env: Env }

const base64Url = (bytes: Uint8Array) => {
  let texto = "";
  bytes.forEach((byte) => { texto += String.fromCharCode(byte); });
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const onRequestGet = async ({ env }: Contexto) => {
  const carga = base64Url(new TextEncoder().encode(JSON.stringify({
    rol: "administrador", uso: "taberna", caduca: Math.floor(Date.now() / 1000) + 15 * 60,
  })));
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SECRETO_TABERNA), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(carga))));
  return Response.json({ token: `${carga}.${firma}` }, { headers: { "Cache-Control": "private, no-store" } });
};
