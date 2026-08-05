import { ContextoPagina, responderJson } from "./_utilidades";

export interface CambioCuadrante {
  id_cuadrante: string;
  matricula: string;
  dia: number;
  turno: string;
  actualizado_en: string;
}

/** Los usuarios autenticados consultan las correcciones que deben aplicarse al cuadrante base. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB
    .prepare(
      `SELECT id_cuadrante, matricula, dia, turno, actualizado_en
       FROM cambios_cuadrante
       ORDER BY id_cuadrante, matricula, dia`
    )
    .all<CambioCuadrante>();

  return responderJson({ cambios: resultado.results ?? [] });
};
