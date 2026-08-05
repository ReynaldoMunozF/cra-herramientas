import { ContextoPagina, obtenerProceso, procesoPermitido, responderJson, validarContenido } from "../../_utilidades";

interface FilaContenido { contenido_json: string; }
interface FilaVersion { id: number; version: number; estado: "borrador" | "publicada" | "archivada"; creado_en: string; publicado_en?: string | null; }
interface FilaNumero { siguiente: number; }
const LIMITE_CONTENIDO = 250_000;

export const onRequestGet = async (contexto: ContextoPagina) => {
  const proceso = obtenerProceso(contexto);
  if (!procesoPermitido(proceso)) return responderJson({ error: "Proceso no disponible." }, 404);
  try {
    const [borrador, publicado, versiones] = await Promise.all([
      contexto.env.CONTENIDO_DB.prepare("SELECT contenido_json FROM versiones_manual WHERE proceso = ? AND estado = 'borrador' ORDER BY version DESC LIMIT 1").bind(proceso).first<FilaContenido>(),
      contexto.env.CONTENIDO_DB.prepare("SELECT contenido_json FROM versiones_manual WHERE proceso = ? AND estado = 'publicada' ORDER BY version DESC LIMIT 1").bind(proceso).first<FilaContenido>(),
      contexto.env.CONTENIDO_DB.prepare("SELECT id, version, estado, creado_en, publicado_en FROM versiones_manual WHERE proceso = ? ORDER BY version DESC LIMIT 20").bind(proceso).all<FilaVersion>(),
    ]);
    return responderJson({
      borrador: borrador ? JSON.parse(borrador.contenido_json) : null,
      publicado: publicado ? JSON.parse(publicado.contenido_json) : null,
      versiones: versiones.results || [],
    });
  } catch (error) {
    console.error(JSON.stringify({ evento: "leer_administracion_manual", proceso, error: String(error) }));
    return responderJson({ error: "No se pudo cargar la administración del manual." }, 500);
  }
};

export const onRequestPut = async (contexto: ContextoPagina) => {
  const proceso = obtenerProceso(contexto);
  if (!procesoPermitido(proceso)) return responderJson({ error: "Proceso no disponible." }, 404);
  const longitud = Number(contexto.request.headers.get("Content-Length") || 0);
  if (longitud > LIMITE_CONTENIDO) return responderJson({ error: "El contenido supera el tamaño permitido." }, 413);

  try {
    const texto = await contexto.request.text();
    if (texto.length > LIMITE_CONTENIDO) return responderJson({ error: "El contenido supera el tamaño permitido." }, 413);
    const contenido = JSON.parse(texto);
    if (!validarContenido(contenido)) return responderJson({ error: "La estructura del proceso no es válida." }, 400);
    const filaNumero = await contexto.env.CONTENIDO_DB.prepare(
      "SELECT COALESCE(MAX(version), 0) + 1 AS siguiente FROM versiones_manual WHERE proceso = ?",
    ).bind(proceso).first<FilaNumero>();
    const version = filaNumero?.siguiente || 1;
    await contexto.env.CONTENIDO_DB.batch([
      contexto.env.CONTENIDO_DB.prepare("UPDATE versiones_manual SET estado = 'archivada' WHERE proceso = ? AND estado = 'borrador'").bind(proceso),
      contexto.env.CONTENIDO_DB.prepare("INSERT INTO versiones_manual (proceso, version, estado, contenido_json) VALUES (?, ?, 'borrador', ?)").bind(proceso, version, JSON.stringify(contenido)),
    ]);
    return responderJson({ correcto: true, version }, 201);
  } catch (error) {
    console.error(JSON.stringify({ evento: "guardar_borrador_manual", proceso, error: String(error) }));
    return responderJson({ error: "No se pudo guardar el borrador." }, 500);
  }
};

export const onRequestPost = async (contexto: ContextoPagina) => {
  const proceso = obtenerProceso(contexto);
  if (!procesoPermitido(proceso)) return responderJson({ error: "Proceso no disponible." }, 404);
  try {
    const borrador = await contexto.env.CONTENIDO_DB.prepare(
      "SELECT id, version FROM versiones_manual WHERE proceso = ? AND estado = 'borrador' ORDER BY version DESC LIMIT 1",
    ).bind(proceso).first<{ id: number; version: number }>();
    if (!borrador) return responderJson({ error: "Primero debes guardar un borrador." }, 409);
    await contexto.env.CONTENIDO_DB.batch([
      contexto.env.CONTENIDO_DB.prepare("UPDATE versiones_manual SET estado = 'archivada' WHERE proceso = ? AND estado = 'publicada'").bind(proceso),
      contexto.env.CONTENIDO_DB.prepare("UPDATE versiones_manual SET estado = 'publicada', publicado_en = CURRENT_TIMESTAMP WHERE id = ?").bind(borrador.id),
    ]);
    return responderJson({ correcto: true, version: borrador.version });
  } catch (error) {
    console.error(JSON.stringify({ evento: "publicar_manual", proceso, error: String(error) }));
    return responderJson({ error: "No se pudo publicar el borrador." }, 500);
  }
};
