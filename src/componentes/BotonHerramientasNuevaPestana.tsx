import React from "react";
import { IconoAccesoCabecera } from "./IconoAccesoCabecera";

/** Acceso sencillo para quien prefiera consultar las herramientas en una pestaña del navegador. */
export const BotonHerramientasNuevaPestana: React.FC = () => (
  <a className="boton-herramientas-rapidas boton-herramientas-nueva-pestana" href="/herramientas-rapidas" target="_blank" rel="noopener noreferrer" aria-label="Abrir herramientas rápidas en una pestaña nueva">
    <span className="acceso-cabecera-icono" aria-hidden="true">
      <IconoAccesoCabecera tipo="pestana" />
    </span>
    <span className="acceso-cabecera-texto"><small>Vista independiente</small><strong>Abrir en pestaña</strong></span>
    <span className="acceso-cabecera-flecha" aria-hidden="true"><IconoAccesoCabecera tipo="flecha" /></span>
  </a>
);
