import catalogo from "../_datos/codigos-postales-es.json";
import { ContextoPagina, responderJson } from "./_utilidades";

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Construye el índice una vez por instancia, evitando normalizar todo el catálogo en cada consulta.
const indicePostal = (() => {
  const grupos = new Map<string, {
    nombre: string; provincia: string; comunidad: string; municipio: string; ubicacion: string;
    codigos: Array<{ codigoPostal: string; complementario: boolean }>;
  }>();
  for (const [codigoPostal, entrada] of Object.entries(catalogo)) {
    const [nombre, provincia, comunidad, , , vigencia] = entrada;
    const municipio = normalizar(String(nombre));
    const clave = `${municipio}|${normalizar(String(provincia))}|${normalizar(String(comunidad))}`;
    if (!grupos.has(clave)) grupos.set(clave, {
      nombre: String(nombre), provincia: String(provincia), comunidad: String(comunidad),
      municipio, ubicacion: normalizar(`${nombre} ${provincia}`), codigos: [],
    });
    const grupo = grupos.get(clave)!;
    if (vigencia === "a") grupo.nombre = String(nombre);
    grupo.codigos.push({ codigoPostal, complementario: vigencia !== "a" });
  }
  return Array.from(grupos.values()).map((grupo) => ({
    ...grupo, codigos: grupo.codigos.sort((a, b) => a.codigoPostal.localeCompare(b.codigoPostal)),
  }));
})();

export const buscarLocalidades = (texto: string) => {
  const consulta = normalizar(texto);
  if (consulta.length < 2) return { localidades: [], total: 0 };
  const esCodigo = /^\d+$/.test(consulta);
  const palabras = consulta.split(" ");
  const localidades = indicePostal.flatMap((grupo) => {
    const codigos = esCodigo ? grupo.codigos.filter((codigo) => codigo.codigoPostal.startsWith(consulta)) : grupo.codigos;
    if (!codigos.length || (!esCodigo && !palabras.every((palabra) => grupo.ubicacion.includes(palabra)))) return [];
    return [{ ...grupo, codigos, prioridad: grupo.municipio === consulta ? 0 : grupo.municipio.startsWith(consulta) ? 1 : 2 }];
  }).sort((a, b) => a.prioridad - b.prioridad || a.nombre.localeCompare(b.nombre, "es") || a.provincia.localeCompare(b.provincia, "es"));
  return {
    localidades: localidades.slice(0, 8).map(({ prioridad, municipio, ubicacion, ...localidad }) => localidad),
    total: localidades.length,
  };
};

/** Consulta el mismo catálogo que utiliza la herramienta postal, sin proveedores nuevos. */
export const onRequestGet = (contexto: ContextoPagina) => {
  const texto = (new URL(contexto.request.url).searchParams.get("texto") ?? "").trim();
  if (texto.length < 2 || texto.length > 120) return responderJson({ error: "Escribe entre 2 y 120 caracteres." }, 400);
  return responderJson(buscarLocalidades(texto));
};
