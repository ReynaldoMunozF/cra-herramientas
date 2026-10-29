export const MAX_PRODUCTIVIDAD_BONIFICADA = 27;

/** Escala corporativa facilitada para estimar el bono según las gestiones por hora. */
export const ESCALA_BONIFICACION: Array<[number, number]> = [
  [18, 40], [18.2, 45], [18.4, 51], [18.5, 56], [18.7, 61], [18.9, 67],
  [19.1, 72], [19.3, 77], [19.4, 83], [19.6, 88], [19.8, 93], [20, 99],
  [20.2, 104], [20.3, 109], [20.5, 115], [20.7, 120], [20.9, 125],
  [21.1, 131], [21.2, 136], [21.4, 141], [21.6, 147], [21.8, 152],
  [22, 157], [22.1, 163], [22.3, 168], [22.5, 173], [22.7, 179],
  [22.9, 184], [23, 189], [23.2, 195], [23.4, 200], [24, 220],
  [25, 245], [26, 270], [27, 300],
];

export const obtenerTramoBono = (productividad: number) =>
  ESCALA_BONIFICACION.reduce<[number, number] | null>(
    (tramo, candidato) => productividad >= candidato[0] ? candidato : tramo,
    null
  );

export const obtenerEstadoProductividad = (productividad: number) => {
  if (productividad < 18) return { clase: "roja", texto: "Por debajo del primer tramo" };
  if (productividad < 22) return { clase: "amarilla", texto: "Primer tramo alcanzado" };
  if (productividad < MAX_PRODUCTIVIDAD_BONIFICADA) return { clase: "naranja", texto: "Avance favorable" };
  return { clase: "verde", texto: "Tope del bono alcanzado" };
};
