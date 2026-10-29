export type CoordenadasTeo =
  | { tipo: "texto" }
  | { tipo: "incompletas" | "invalidas"; mensaje: string }
  | { tipo: "validas"; latitud: number; longitud: number };

/** Orden explícito latitud/longitud; no intercambia valores ni adivina separadores ambiguos. */
export const interpretarCoordenadas = (entrada: string): CoordenadasTeo => {
  const texto = entrada.trim().replace(/−/g, "-");
  if (!texto || !/^[+\-\d]/.test(texto) || /[a-záéíóúñ]/i.test(texto)) return { tipo: "texto" };
  // Un número entero aislado sigue siendo una consulta postal.
  if (/^\d+$/.test(texto)) return { tipo: "texto" };
  if (!/[.,;\s]/.test(texto)) return { tipo: "texto" };
  const decimalPunto = "([+-]?\\d+(?:\\.\\d+)?)";
  const decimalFlexible = "([+-]?\\d+(?:[.,]\\d+)?)";
  const pareja = texto.includes(";")
    ? texto.match(new RegExp(`^${decimalFlexible}\\s*;\\s*${decimalFlexible}$`))
    : texto.match(new RegExp(`^${decimalPunto}(?:\\s*,\\s*|\\s+)${decimalPunto}$`));
  if (!pareja) {
    const ambiguo = (texto.match(/,/g) ?? []).length > 1;
    return {
      tipo: ambiguo ? "invalidas" : "incompletas",
      mensaje: ambiguo
        ? "Con comas decimales, separa latitud y longitud con punto y coma: 40,4168; -3,7038."
        : "Completa latitud y longitud, por ejemplo: 40.4168, -3.7038.",
    };
  }
  const latitud = Number(pareja[1].replace(",", "."));
  const longitud = Number(pareja[2].replace(",", "."));
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
    return { tipo: "invalidas", mensaje: "Revisa el orden: latitud entre −90 y 90; longitud entre −180 y 180." };
  }
  return { tipo: "validas", latitud, longitud };
};
