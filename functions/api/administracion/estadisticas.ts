import { ContextoPagina, responderJson } from "../_utilidades";

interface FilaEstadistica {
  tipo: string;
  total: number;
  hoy: number;
  ultimos_siete_dias: number;
}

/** Resumen privado; el middleware reserva esta ruta al administrador. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  const resultado = await contexto.env.CONTENIDO_DB.prepare(
    `SELECT tipo, COUNT(*) AS total,
       SUM(CASE WHEN creado_en >= datetime('now', 'start of day') THEN 1 ELSE 0 END) AS hoy,
       SUM(CASE WHEN creado_en >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS ultimos_siete_dias
     FROM estadisticas_uso GROUP BY tipo`
  ).all<FilaEstadistica>();
  return responderJson({
    estadisticas: resultado.results ?? [],
    actualizadoEn: new Date().toISOString(),
  });
};
