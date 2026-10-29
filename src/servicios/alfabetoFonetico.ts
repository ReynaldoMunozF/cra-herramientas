/** Alfabeto fonético internacional utilizado para transmitir datos por radio o teléfono. */
export const ALFABETO_FONETICO: Record<string, string> = {
  A: "Alfa",
  B: "Bravo",
  C: "Charlie",
  D: "Delta",
  E: "Echo",
  F: "Foxtrot",
  G: "Golf",
  H: "Hotel",
  I: "India",
  J: "Juliett",
  K: "Kilo",
  L: "Lima",
  M: "Mike",
  N: "November",
  O: "Oscar",
  P: "Papa",
  Q: "Quebec",
  R: "Romeo",
  S: "Sierra",
  T: "Tango",
  U: "Uniform",
  V: "Victor",
  W: "Whiskey",
  X: "X-ray",
  Y: "Yankee",
  Z: "Zulu",
};

const NUMEROS_FONETICOS: Record<string, string> = {
  "0": "Cero",
  "1": "Uno",
  "2": "Dos",
  "3": "Tres",
  "4": "Cuatro",
  "5": "Cinco",
  "6": "Seis",
  "7": "Siete",
  "8": "Ocho",
  "9": "Nueve",
};

/** Elimina tildes para que cualquier texto español pueda convertirse correctamente. */
const normalizarTexto = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export const obtenerDeletreo = (texto: string) =>
  Array.from(normalizarTexto(texto))
    .map((caracter) => {
      if (caracter === " ") return "/";
      return ALFABETO_FONETICO[caracter] ?? NUMEROS_FONETICOS[caracter] ?? caracter;
    })
    .filter(Boolean);

