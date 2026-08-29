/**
 * Ajusta el marco real de una sola vez. Chromium bloquea o ignora secuencias
 * rápidas de resizeTo en Picture-in-Picture; la fluidez se aporta desde CSS.
 */
export const animarVentanaAuxiliar = (
  ventana: Window,
  anchoObjetivo: number,
  altoObjetivo: number,
  _duracion = 340
) => {
  const pantalla = ventana.screen as Screen & { availLeft?: number; availTop?: number };
  const izquierda = (pantalla.availLeft ?? 0) + pantalla.availWidth - anchoObjetivo;
  try {
    ventana.resizeTo(anchoObjetivo, altoObjetivo);
    ventana.moveTo(Math.max(pantalla.availLeft ?? 0, izquierda), pantalla.availTop ?? 0);
  } catch { /* El panel sigue siendo utilizable si el navegador fija el marco. */ }
};
