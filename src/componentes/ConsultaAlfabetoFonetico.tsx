import React from "react";
import iconoAlfabeto from "../recursos/herramientas/alfabeto.svg";

import { ALFABETO_FONETICO, obtenerDeletreo } from "../servicios/alfabetoFonetico";

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
