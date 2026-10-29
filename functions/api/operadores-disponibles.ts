import { ContextoPagina, responderJson } from "./_utilidades";

/** Entrega a la interfaz las matrículas que ya no deben mostrarse a invitados. */
export const onRequestGet = async (contexto: ContextoPagina) => {
  if (contexto.data?.rol === "administrador") return responderJson({ ocultas: [], matriculaPropia: null });
  if (contexto.data?.rol === "operador") return responderJson({ ocultas: [], matriculaPropia: contexto.data.matricula ?? null });
  const resultado = await contexto.env.CONTENIDO_DB
    .prepare("SELECT matricula FROM cuentas_operadores WHERE activa = 1 ORDER BY matricula")
    .all<{ matricula: string }>();
  return responderJson({ ocultas: (resultado.results ?? []).map((fila) => fila.matricula), matriculaPropia: null });
};
