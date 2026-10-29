import React from "react";
import iconoAlfabeto from "../recursos/herramientas/alfabeto.svg";

/** Alfabeto fonético internacional utilizado para transmitir datos por radio o teléfono. */
const ALFABETO_FONETICO: Record<string, string> = {
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

const obtenerDeletreo = (texto: string) =>
  Array.from(normalizarTexto(texto))
    .map((caracter) => {
      if (caracter === " ") return "/";
      return ALFABETO_FONETICO[caracter] ?? NUMEROS_FONETICOS[caracter] ?? caracter;
    })
    .filter(Boolean);

export const ConsultaAlfabetoFonetico: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [texto, establecerTexto] = React.useState("");
  const [copiado, establecerCopiado] = React.useState(false);
  const deletreo = obtenerDeletreo(texto);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "alfabeto") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(
      new CustomEvent("herramienta-flotante-abierta", {
        detail: seAbrira ? "alfabeto" : "ninguna",
      })
    );
    establecerAbierto(seAbrira);
  };

  const copiarDeletreo = async () => {
    if (!deletreo.length) return;
    await navigator.clipboard.writeText(deletreo.join(" · "));
    establecerCopiado(true);
    window.setTimeout(() => establecerCopiado(false), 1500);
  };

  return (
    <aside className={`alfabeto-rapido ${abierto ? "abierto" : ""}`}>
      <button
        className="alfabeto-rapido-activador"
        data-nombre="Alfabeto fonético"
        type="button"
        onClick={alternar}
        title="Alfabeto fonético"
        aria-label={abierto ? "Cerrar alfabeto fonético" : "Abrir alfabeto fonético"}
        aria-expanded={abierto}
      >
        <span className="alfabeto-rapido-icono herramienta-menu-icono" aria-hidden="true"><img src={iconoAlfabeto} alt="" /></span>
        <strong>Alfabeto fonético</strong>
      </button>

      {abierto && (
        <section className="alfabeto-rapido-panel">
          <header>
            <div><small>Apoyo para comunicaciones</small><h2>Alfabeto fonético</h2></div>
            <button type="button" onClick={alternar} aria-label="Cerrar">×</button>
          </header>

          <div className="alfabeto-deletreador">
            <label htmlFor="texto-deletrear">Palabra o dato que quieres deletrear</label>
            <input
              id="texto-deletrear"
              value={texto}
              onChange={(evento) => establecerTexto(evento.target.value)}
              placeholder="Ejemplo: ROBO 24"
              autoFocus
            />
            {deletreo.length > 0 && (
              <div className="alfabeto-resultado" aria-live="polite">
                <div>
                  {deletreo.map((palabra, indice) => (
                    <span key={`${palabra}-${indice}`}>{palabra}</span>
                  ))}
                </div>
                <button type="button" onClick={copiarDeletreo}>
                  {copiado ? "Copiado ✓" : "Copiar deletreo"}
                </button>
              </div>
            )}
          </div>

          <div className="alfabeto-listado" aria-label="Alfabeto fonético completo">
            {Object.entries(ALFABETO_FONETICO).map(([letra, palabra]) => (
              <div key={letra}><strong>{letra}</strong><span>{palabra}</span></div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
};
