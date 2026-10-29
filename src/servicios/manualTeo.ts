import { SesionTeoError } from "./teo";
export interface NodoManualTeo {
  tipo: string; texto: string; paginas: number[];
  opciones: Array<{ etiqueta: string; destino: string }>;
}
export interface ProcedimientoManualTeo {
  id: string; titulo: string; grupo: string; paginas: number[]; respuesta: string;
  alias: string[]; inicio: string; nodos: Record<string, NodoManualTeo>;
  discrepancias?: string[]; notas_fuente?: string;
}
export interface CatalogoManualTeo {
  version: string; fuente: { sha256: string; paginas: number };
  procedimientos: ProcedimientoManualTeo[];
  discrepancias: Array<{ id: string; titulo: string; detalle: string; regla: string; paginas: number[] }>;
}
export const RUTA_MANUAL_TEO = "/administracion/teo-manual/";
export const cargarManualTeo = async (signal: AbortSignal): Promise<CatalogoManualTeo> => {
  const r = await fetch(`${RUTA_MANUAL_TEO}catalogo.json`, { credentials: "same-origin", signal, cache: "no-store", headers: { Accept: "application/json" } });
  if ([401, 403].includes(r.status) || (r.headers.get("Content-Type") ?? "").includes("text/html")) throw new SesionTeoError("La sesión de administrador ha caducado.");
  if (!r.ok) throw new Error("No se ha podido cargar el manual de prueba. Inténtalo de nuevo.");
  const datos = await r.json() as CatalogoManualTeo;
  if (!Array.isArray(datos.procedimientos) || !Array.isArray(datos.discrepancias) || !datos.fuente?.sha256) throw new Error("El manual recibido no tiene el formato esperado.");
  return datos;
};
export const normalizarConsultaManual = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const comunes = new Set(["que", "es", "una", "un", "el", "la", "los", "las", "de", "del", "como", "debo", "proceder", "hacer", "tengo", "con", "y", "por", "para", "me"]);
export const buscarProcedimientosManual = (datos: ProcedimientoManualTeo[], consulta: string, grupo = "") => {
  const q = normalizarConsultaManual(consulta);
  const tokens = consulta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter(t => t && !comunes.has(t));
  return datos.filter(p => !grupo || p.grupo === grupo).map((p, orden) => {
    if (!q) return { p, peso: 1, orden };
    const titulo = normalizarConsultaManual(p.titulo);
    const alias = p.alias.map(normalizarConsultaManual);
    const texto = normalizarConsultaManual([p.respuesta, ...Object.values(p.nodos).map(n => n.texto)].join(" "));
    const esOe = q === "oe" || q === "operativaespecial";
    const peso = titulo === q || alias.includes(q) ? 100 : titulo.includes(q) ? 80
      : alias.some(a => a.includes(q)) ? 60 : texto.includes(q) ? 20
      : !esOe && tokens.length && tokens.every(t => titulo.includes(t) || alias.some(a => a.includes(t))) ? 50 : 0;
    return { p, peso, orden };
  }).filter(r => r.peso > 0).sort((a,b) => b.peso - a.peso || a.orden - b.orden).map(r => r.p);
};
