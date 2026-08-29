import { ContextoPagina, responderJson } from "./_utilidades";

interface CodigoPersonalizado {
  id: number;
  categoria: "resoluciones" | "sms";
  codigo: string;
  descripcion: string;
  actualizado_en: number;
}

/** Entradas añadidas por administración y compartidas con todos los usuarios. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB.prepare(
    `SELECT id, categoria, codigo, descripcion, actualizado_en
     FROM codigos_operativos_personalizados
     ORDER BY categoria, codigo COLLATE NOCASE, id`
  ).all<CodigoPersonalizado>();
  return responderJson({ codigos: resultado.results ?? [] });
};

