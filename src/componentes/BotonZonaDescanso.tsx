import React from "react";

/** Abre la zona de descanso en una ventana independiente de la aplicación principal. */
export const BotonZonaDescanso: React.FC = () => {
  const abrirZonaDescanso = () => {
    const version = "20260801-murdoku-visual";
    const ancho = Math.min(1150, window.screen.availWidth);
    const alto = Math.min(900, window.screen.availHeight);
    const caracteristicas = [
      "popup=yes",
      `width=${ancho}`,
      `height=${alto}`,
      "left=35",
      "top=35",
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");
    const ventana = window.open(
      `/zona-descanso?v=${version}`,
      `zonaDescansoCra-${version}`,
      caracteristicas
    );
    ventana?.focus();
  };

  return (
    <button className="boton-zona-descanso" type="button" onClick={abrirZonaDescanso}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 4h8l2 3h3v11H3V7h3l2-3Z" />
        <circle cx="8" cy="12" r="2" />
        <path d="M16 10v4M14 12h4" />
      </svg>
      <span>Zona de descanso</span>
      <small>↗</small>
    </button>
  );
};
