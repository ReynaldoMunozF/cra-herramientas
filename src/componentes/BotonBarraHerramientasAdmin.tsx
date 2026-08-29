import React from "react";
import { createPortal } from "react-dom";
import { BarraHerramientasAdmin } from "./BarraHerramientasAdmin";
import { animarVentanaAuxiliar } from "../utilidades/animarVentanaAuxiliar";

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

/** Coloca el auxiliar en la esquina superior derecha cuando el navegador lo permite. */
const colocarArribaDerecha = (ventanaObjetivo: Window, ancho: number) => {
  const pantalla = window.screen as Screen & { availLeft?: number; availTop?: number };
  const izquierda = (pantalla.availLeft ?? 0) + pantalla.availWidth - ancho;
  try { ventanaObjetivo.moveTo(Math.max(pantalla.availLeft ?? 0, izquierda), pantalla.availTop ?? 0); } catch { /* Picture-in-Picture puede decidir su posición. */ }
};

/** Abre la nueva barra flotante para cualquier sesión autenticada. */
export const BotonBarraHerramientasAdmin: React.FC<{ compacto?: boolean }> = ({ compacto = false }) => {
  const [destino, establecerDestino] = React.useState<HTMLElement | null>(null);
  const [ventana, establecerVentana] = React.useState<Window | null>(null);
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) => establecerEsAdministrador(sesion.rol === "administrador"))
      .catch(() => establecerEsAdministrador(false));
  }, []);

  React.useEffect(() => {
    const adaptarVentana = (evento: Event) => {
      if (!ventana || ventana.closed) return;
      const herramienta = (evento as CustomEvent<string>).detail;
      const ancho = Math.min(herramienta === "ninguna" ? 535 : 740, window.screen.availWidth);
      const alto = herramienta === "ninguna" ? 78 : Math.min(590, window.screen.availHeight);
      animarVentanaAuxiliar(ventana, ancho, alto, herramienta === "ninguna" ? 260 : 360);
    };
    window.addEventListener("herramienta-flotante-abierta", adaptarVentana);
    return () => window.removeEventListener("herramienta-flotante-abierta", adaptarVentana);
  }, [ventana]);

  const abrir = async () => {
    if (ventana && !ventana.closed) {
      ventana.focus();
      return;
    }

    const gestor = obtenerGestorFlotante();
    const rutaAlternativa = window.location.hostname === "localhost"
      ? "/administracion/barra-herramientas?vista-admin=1"
      : "/administracion/barra-herramientas";
    const abrirVentanaAlternativa = () => {
      const nuevaVentana = window.open(
        rutaAlternativa,
        "barraHerramientasAdmin",
        `popup=yes,width=535,height=78,left=${Math.max(0, window.screen.availWidth - 535)},top=0,resizable=yes,scrollbars=yes`,
      );
      if (!nuevaVentana) window.open(rutaAlternativa, "_blank", "noopener");
      nuevaVentana?.focus();
      if (nuevaVentana) colocarArribaDerecha(nuevaVentana, 535);
    };
    if (!gestor) {
      abrirVentanaAlternativa();
      return;
    }

    try {
      const nuevaVentana = await gestor.requestWindow({
        width: Math.min(535, window.screen.availWidth),
        height: 78,
        preferInitialWindowPlacement: true,
      });
      nuevaVentana.document.title = "Barra de herramientas CRA";
      nuevaVentana.document.documentElement.lang = "es";
      nuevaVentana.document.documentElement.style.cssText = "min-width:0;overflow:hidden";
      nuevaVentana.document.body.style.cssText = "margin:0;min-width:0;min-height:100vh;overflow:hidden;background:transparent";
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((nodo) => {
        nuevaVentana.document.head.appendChild(nodo.cloneNode(true));
      });
      const contenedor = nuevaVentana.document.createElement("div");
      contenedor.id = "barra-herramientas-admin-flotante";
      nuevaVentana.document.body.appendChild(contenedor);
      establecerVentana(nuevaVentana);
      establecerDestino(contenedor);
      colocarArribaDerecha(nuevaVentana, Math.min(535, window.screen.availWidth));
      nuevaVentana.addEventListener("pagehide", () => {
        establecerDestino(null);
        establecerVentana(null);
      }, { once: true });
    } catch {
      abrirVentanaAlternativa();
    }
  };

  return (
    <>
      <button className={`boton-barra-herramientas-admin ${compacto ? "compacto" : ""}`} type="button" onClick={abrir}>
        <span className="acceso-cabecera-icono" aria-hidden="true">⚡</span>
        <div><small>{compacto ? "Nueva · ocupa menos" : "NUEVA"}</small><strong>{compacto ? "Barra flotante" : "Abrir barra auxiliar flotante"}</strong></div>
        <b aria-hidden="true">↗</b>
      </button>
      {destino && createPortal(<BarraHerramientasAdmin flotante esAdministrador={esAdministrador} />, destino)}
    </>
  );
};
