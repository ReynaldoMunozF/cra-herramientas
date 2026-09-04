import { BaseD1, ContextoPagina } from "./_utilidades";

const codificador = new TextEncoder();
const hex = (datos: ArrayBuffer | Uint8Array) => [...new Uint8Array(datos instanceof ArrayBuffer ? datos : datos.buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
const bytesAleatorios = (cantidad: number) => { const datos = new Uint8Array(cantidad); crypto.getRandomValues(datos); return datos; };
export const matriculaValida = (valor: unknown) => { const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : ""; return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null; };
export const pinValido = (valor: unknown) => typeof valor === "string" && /^\d{4,8}$/.test(valor) ? valor : null;
export const hashSha256 = async (valor: string) => hex(await crypto.subtle.digest("SHA-256", codificador.encode(valor)));
export const crearHashPin = async (pin: string, saltHex = hex(bytesAleatorios(16)), iteraciones = 120000, secreto?: string) => {
  if (secreto) {
    const clave = await crypto.subtle.importKey("raw", codificador.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const firma = await crypto.subtle.sign("HMAC", clave, codificador.encode(`${saltHex}:${pin}`));
    return { salt: saltHex, hash: hex(firma), iteraciones: 0 };
  }
  const clave = await crypto.subtle.importKey("raw", codificador.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(valor => parseInt(valor, 16)));
  const derivado = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iteraciones }, clave, 256);
  return { salt: saltHex, hash: hex(derivado), iteraciones };
};
export const compararConstante = (a: string, b: string) => { let diferencia = a.length ^ b.length; const largo = Math.max(a.length, b.length); for (let i = 0; i < largo; i += 1) diferencia |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diferencia === 0; };
export const crearTokenOperador = async (db: BaseD1, matricula: string) => { const token = hex(bytesAleatorios(32)), tokenHash = await hashSha256(token), caduca = Math.floor(Date.now() / 1000) + 4 * 60 * 60; await db.prepare("DELETE FROM sesiones_pin_operador WHERE caduca_en < unixepoch()").run(); await db.prepare("INSERT INTO sesiones_pin_operador(token_hash, matricula, caduca_en) VALUES (?, ?, ?)").bind(tokenHash, matricula, caduca).run(); return { token, caduca }; };
export const autorizarMatricula = async (contexto: ContextoPagina, matricula: string) => {
  if (contexto.data?.rol === "administrador") return { autorizado: true, protegido: true };
  const pin = await contexto.env.CONTENIDO_DB.prepare("SELECT matricula FROM pines_operadores WHERE matricula = ?").bind(matricula).first<{ matricula: string }>();
  if (!pin) return { autorizado: true, protegido: false };
  const token = contexto.request.headers.get("X-Operador-Token") ?? ""; if (!/^[a-f0-9]{64}$/.test(token)) return { autorizado: false, protegido: true };
  const tokenHash = await hashSha256(token); const sesion = await contexto.env.CONTENIDO_DB.prepare("SELECT matricula FROM sesiones_pin_operador WHERE token_hash = ? AND matricula = ? AND caduca_en > unixepoch()").bind(tokenHash, matricula).first<{ matricula: string }>();
  return { autorizado: Boolean(sesion), protegido: true };
};
