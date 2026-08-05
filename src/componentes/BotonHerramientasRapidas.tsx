import React from "react";
import { createPortal } from "react-dom";
import { PaginaHerramientasRapidas } from "../paginas/PaginaHerramientasRapidas";

interface GestorPictureInPicture {
  window: Window | null;
  requestWindow: (opciones: {
    width: number;
    height: number;
    preferInitialWindowPlacement?: boolean;
  }) => Promise<Window>;
}

const obtenerGestorFlotante = () =>
  (window as Window & { documentPictureInPicture?: GestorPictureInPicture }).documentPictureInPicture;

/** Abre o recupera una ventana independiente para las consultas auxiliares. */
export const BotonHerramientasRapidas: React.FC = () => {
  const [contenedorFlotante, establecerContenedorFlotante] = React.useState<HTMLElement | null>(null);
  const [ventanaFlotante, establecerVentanaFlotante] = React.useState<Window | null>(null);

  const abrirVentanaNormal = () => {
    // La versión en la URL y en el nombre evita recuperar una ventana antigua.
    const versionHerramientas = "20260729-compacta-25";
    const ancho = 470;
    const alto = 340;
    const izquierda = 20;
    const caracteristicas = [
      "popup=yes", `width=${ancho}`, `height=${alto}`,
      `left=${izquierda}`, "top=40", "resizable=yes", "scrollbars=yes",
    ].join(",");
    const ventana = window.open(
      `/herramientas-rapidas?v=${versionHerramientas}`,
      `herramientasRapidasCra-${versionHerramientas}`,
      caracteristicas,
    );
    ventana?.focus();
  };

  const abrirHerramientas = async () => {
    const gestor = obtenerGestorFlotante();

    // En Chrome se abre directamente la ventana siempre visible.
    if (gestor) {
      if (ventanaFlotante && !ventanaFlotante.closed) {
        ventanaFlotante.focus();
        return;
      }

      try {
        const nuevaVentana = await gestor.requestWindow({
          width: Math.min(340, window.screen.availWidth),
          height: Math.min(430, window.screen.availHeight),
          preferInitialWindowPlacement: true,
        });

        nuevaVentana.document.title = "Herramientas rápidas CRA";
        nuevaVentana.document.documentElement.lang = "es";
        nuevaVentana.document.documentElement.style.minWidth = "0";
        nuevaVentana.document.documentElement.style.overflowX = "hidden";
        nuevaVentana.document.body.style.cssText = "margin:0;min-height:100vh;min-width:0;overflow-x:hidden;background:#041b2c";

        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((nodo) => {
          nuevaVentana.document.head.appendChild(nodo.cloneNode(true));
        });

        const destino = nuevaVentana.document.createElement("div");
        destino.style.minHeight = "100vh";
        nuevaVentana.document.body.appendChild(destino);
        establecerVentanaFlotante(nuevaVentana);
        establecerContenedorFlotante(destino);

        nuevaVentana.addEventListener("pagehide", () => {
          establecerContenedorFlotante(null);
          establecerVentanaFlotante(null);
        }, { once: true });
        return;
      } catch {
        // Si la política corporativa bloquea PiP, se utiliza el popup normal.
      }
    }

    abrirVentanaNormal();
  };

  return (
    <>
      <button className="boton-herramientas-rapidas" type="button" onClick={abrirHerramientas}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM4 9h16M8 5v4"/><path d="M8 13h3M8 16h6"/></svg>
        <span>Herramientas rápidas</span><small>↗</small>
      </button>
      {contenedorFlotante && ventanaFlotante && createPortal(
        <PaginaHerramientasRapidas
          ventanaFijaExterna={ventanaFlotante}
          alCerrarVentanaFija={() => {
            establecerContenedorFlotante(null);
            establecerVentanaFlotante(null);
          }}
        />,
        contenedorFlotante,
      )}
    </>
  );
};
