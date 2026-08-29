import { ContextoPagina, responderJson } from "../_utilidades";

const limpiar = (valor: unknown, maximo: number) =>
  typeof valor === "string" ? valor.trim().slice(0, maximo) : "";

/** Escritura reservada al administrador por el middleware global. */
export const onRequestPost = async (contexto: ContextoPagina) => {
  let datos: { categoria?: unknown; codigo?: unknown; descripcion?: unknown };
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }

  const categoria = datos.categoria === "sms" ? "sms" : datos.categoria === "resoluciones" ? "resoluciones" : "";
  const codigo = limpiar(datos.codigo, 40).toUpperCase();
  const descripcion = limpiar(datos.descripcion, 300);
  if (!categoria || !codigo || !descripcion) return responderJson({ error: "Completa el código y la descripción." }, 400);

  try {
    const resultado = await contexto.env.CONTENIDO_DB.prepare(
      `INSERT INTO codigos_operativos_personalizados (categoria, codigo, descripcion)
       VALUES (?, ?, ?)`
    ).bind(categoria, codigo, descripcion).run();
    return responderJson({ guardado: true, id: resultado.meta.last_row_id }, 201);
  } catch {
    return responderJson({ error: "Ya existe una entrada personalizada con ese código." }, 409);
  }
};

