import React from "react";

/** Acceso sencillo para quien prefiera consultar las herramientas en una pestaña del navegador. */
export const BotonHerramientasNuevaPestana: React.FC = () => (
  <a className="boton-herramientas-rapidas boton-herramientas-nueva-pestana" href="/herramientas-rapidas" target="_blank" rel="noopener noreferrer" aria-label="Abrir herramientas rápidas en una pestaña nueva">
    <span className="acceso-cabecera-icono" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M7 5H5v14h14v-2M11 5h8v8M19 5l-9 9" /></svg>
    </span>
    <span className="acceso-cabecera-texto"><small>Vista independiente</small><strong>Abrir en pestaña</strong></span>
    <span className="acceso-cabecera-flecha" aria-hidden="true">↗</span>
  </a>
);
