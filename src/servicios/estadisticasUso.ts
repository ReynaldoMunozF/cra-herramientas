export type TipoEstadistica =
  | "busqueda_direccion" | "busqueda_coordenadas" | "copia_comentario"
  | "uso_manual" | "uso_cuadrante" | "consulta_clima" | "consulta_fse";

/** Registra la acción sin bloquear el trabajo del operador. */
export const registrarUso = (tipo: TipoEstadistica) => {
  void fetch("/api/estadisticas", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo }),
  }).catch(() => undefined);
};
