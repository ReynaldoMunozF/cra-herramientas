import { BaseD1, ContextoPagina } from "./_utilidades";

const codificador = new TextEncoder();
const ITERACIONES = 310000;

const hex = (datos: ArrayBuffer) => [...new Uint8Array(datos)]
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");
const aleatorioHex = (cantidad: number) => {
  const datos = new Uint8Array(cantidad);
  crypto.getRandomValues(datos);
  return [...datos].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const normalizarMatriculaCuenta = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};

export const claveValida = (valor: unknown) =>
  typeof valor === "string" && valor.length >= 10 && valor.length <= 160;

export const crearHashClave = async (clave: string, saltHex = aleatorioHex(16), secreto?: string) => {
  if (secreto) {
    const claveServidor = await crypto.subtle.importKey("raw", codificador.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const firma = await crypto.subtle.sign("HMAC", claveServidor, codificador.encode(`${saltHex}:${clave}`));
    return { salt: saltHex, hash: hex(firma), iteraciones: 0 };
  }
  const claveImportada = await crypto.subtle.importKey("raw", codificador.encode(clave), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((valor) => parseInt(valor, 16)));
  const derivado = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERACIONES },
    claveImportada,
    256
  );
  return { salt: saltHex, hash: hex(derivado), iteraciones: ITERACIONES };
};

export const verificarClaveCuenta = async (
  clave: string,
  cuenta: { salt_clave: string; clave_hash: string; iteraciones: number },
  secreto: string
) => {
  const calculada = await crearHashClave(clave, cuenta.salt_clave, cuenta.iteraciones === 0 ? secreto : undefined);
  return compararConstante(calculada.hash, cuenta.clave_hash);
};

export const compararConstante = (a: string, b: string) => {
  let diferencia = a.length ^ b.length;
  for (let indice = 0; indice < Math.max(a.length, b.length); indice += 1) {
    diferencia |= (a.charCodeAt(indice) || 0) ^ (b.charCodeAt(indice) || 0);
  }
  return diferencia === 0;
};

export const matriculaTieneCuenta = async (db: BaseD1, matricula: string) => Boolean(
  await db.prepare("SELECT matricula FROM cuentas_operadores WHERE matricula = ? AND activa = 1")
    .bind(matricula).first<{ matricula: string }>()
);

/** Impide que un invitado consulte una cuenta personal y fija la matrícula del operador autenticado. */
export const autorizarCuentaMatricula = async (contexto: ContextoPagina, matricula: string) => {
  if (contexto.data?.rol === "administrador") return { autorizado: true };
  if (contexto.data?.rol === "operador") {
    return { autorizado: contexto.data.matricula === matricula, motivo: "Tu sesión solo permite acceder a tus propios datos." };
  }
  if (await matriculaTieneCuenta(contexto.env.CONTENIDO_DB, matricula)) {
    return { autorizado: false, motivo: "Esta matrícula ya tiene una cuenta personal. Inicia sesión con ella." };
  }
  return { autorizado: true };
};
