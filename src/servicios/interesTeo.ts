export interface TelefonoInteresTeo { id: number; nombre: string; telefono: string; descripcion: string; }
export interface EnlaceInteresTeo { id: number; nombre: string; url: string; }
export interface InteresTeo {
  telefonos?: TelefonoInteresTeo[]; enlaces?: EnlaceInteresTeo[];
  totalTelefonos?: number; totalEnlaces?: number; avisosInteres?: string[];
}
const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const compactar = (valor: string) => normalizar(valor).replace(/ /g, "");
const vacias = new Set(["de", "del", "el", "la", "los", "las", "un", "una", "para", "al", "a", "y", "por", "favor", "dame", "quiero", "ver", "abrir", "acceder", "enlace", "telefono", "numero", "llamar"]);
/** Solo busca registros existentes: no asigna teléfonos ni inventa destinos. */
export const buscarInteresTeo = <T extends { nombre: string; descripcion?: string; telefono?: string; url?: string }>(registros: T[], consulta: string): T[] => {
  const palabras = normalizar(consulta).split(" ").filter(p => p && !vacias.has(p));
  if (!palabras.length) return [];
  const q = palabras.join("");
  return registros.map((item, orden) => {
    const nombre = compactar(item.nombre);
    const siglas = normalizar(item.nombre).split(" ").filter(p => !vacias.has(p)).map(p => p[0]).join("");
    const texto = compactar([item.nombre, item.descripcion ?? "", item.url ?? ""].join(" "));
    const numero = /^\d+$/.test(q);
    const telefono = compactar(item.telefono ?? "");
    const coincideNumero = numero && (telefono === q || q.length >= 6 && telefono.includes(q));
    const peso = nombre === q ? 100 : !numero && siglas === q ? 90 : !numero && nombre.includes(q) ? 80
      : !numero && (texto.includes(q) || palabras.every(p => p.length >= 2 && texto.includes(p))) ? 50 : coincideNumero ? 40 : 0;
    return { item, orden, peso };
  }).filter(r => r.peso > 0).sort((a,b) => b.peso-a.peso || a.orden-b.orden).map(r => r.item);
};
export const enlaceInteresSeguro = (url: string) => /^https?:\/\/[^\s]+$/i.test(url) || /^\/(?!\/)[a-zA-Z0-9/_?=&%-]*$/.test(url);
