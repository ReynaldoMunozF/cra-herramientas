import React from "react";
import { createPortal } from "react-dom";
import { PanelTeo } from "./PanelTeo";
import imagenTeo from "../recursos/teo/teo.png";

interface GestorPiP {
  window: Window | null;
  requestWindow: (opciones: { width: number; height: number; preferInitialWindowPlacement?: boolean }) => Promise<Window>;
}

/** El piloto se monta únicamente tras verificar el rol en la sesión del servidor. */
export const BotonTeo: React.FC = () => {
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);
  const [destino, establecerDestino] = React.useState<HTMLElement | null>(null);
  const [alternativo, establecerAlternativo] = React.useState(false);
  const [alto, establecerAlto] = React.useState(190);
  const ventana = React.useRef<Window | null>(null);
  const abriendo = React.useRef(false);
  const temporizadorTamano = React.useRef<number>();
  const referenciaBoton = React.useRef<HTMLButtonElement>(null);

  const cerrar = React.useCallback(() => {
    ventana.current?.close(); ventana.current = null;
    establecerDestino(null); establecerAlternativo(false);
    referenciaBoton.current?.focus();
  }, []);
  const caducar = React.useCallback(() => { cerrar(); establecerEsAdministrador(false); }, [cerrar]);

  React.useEffect(() => {
    let activo = true;
    let controlador: AbortController | null = null;
    const comprobar = async () => {
      controlador?.abort(); controlador = new AbortController();
      try {
        const respuesta = await fetch("/api/sesion", { credentials: "same-origin", signal: controlador.signal });
        const sesion = respuesta.ok ? await respuesta.json() as { rol?: string } : null;
        if (!activo) return;
        if (sesion?.rol === "administrador") establecerEsAdministrador(true);
        else caducar();
      } catch (error) {
        if (activo && !(error instanceof DOMException && error.name === "AbortError")) caducar();
      }
    };
    void comprobar();
    const intervalo = window.setInterval(comprobar, 60000);
    window.addEventListener("focus", comprobar);
    return () => { activo = false; controlador?.abort(); window.clearInterval(intervalo); window.removeEventListener("focus", comprobar); ventana.current?.close(); window.clearTimeout(temporizadorTamano.current); };
  }, [caducar]);

  const cambiarTamano = React.useCallback((altoContenido: number) => {
    window.clearTimeout(temporizadorTamano.current);
    temporizadorTamano.current = window.setTimeout(() => {
      const auxiliar = ventana.current;
      const pantalla = auxiliar?.screen ?? window.screen;
      const marco = auxiliar ? Math.max(0, auxiliar.outerHeight - auxiliar.innerHeight) : 0;
      const limite = Math.min(560, pantalla.availHeight - marco - 28);
      const altura = Math.max(64, Math.min(limite, Math.ceil(altoContenido)));
      establecerAlto(altura);
      if (auxiliar && !auxiliar.closed && Math.abs(auxiliar.innerHeight - altura) > 8) {
        try { auxiliar.resizeTo(Math.min(535, pantalla.availWidth), altura + marco); } catch { /* Conserva desplazamiento interno si el navegador limita el tamaño. */ }
      }
    }, 120);
  }, []);

  const abrir = async () => {
    if (ventana.current && !ventana.current.closed) { ventana.current.focus(); return; }
    if (alternativo || abriendo.current) return;
    const gestor = (window as Window & { documentPictureInPicture?: GestorPiP }).documentPictureInPicture;
    if (!gestor) { establecerAlternativo(true); return; }
    abriendo.current = true;
    try {
      const auxiliar = await gestor.requestWindow({ width: Math.min(535, window.screen.availWidth), height: 190, preferInitialWindowPlacement: true });
      auxiliar.document.title = "Teo · Tu compañero CRA";
      auxiliar.document.documentElement.lang = "es";
      auxiliar.document.documentElement.style.cssText = "min-width:0;height:100%;overflow:hidden";
      auxiliar.document.body.style.cssText = "margin:0;min-width:0;height:100%;overflow:hidden;background:#f5f9fc";
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((nodo) => auxiliar.document.head.appendChild(nodo.cloneNode(true)));
      const contenedor = auxiliar.document.createElement("div"); contenedor.style.height = "100%";
      auxiliar.document.body.appendChild(contenedor);
      ventana.current = auxiliar; establecerDestino(contenedor); establecerAlternativo(false);
      auxiliar.addEventListener("pagehide", () => {
        if (ventana.current === auxiliar) { ventana.current = null; establecerDestino(null); }
      }, { once: true });
    } catch { establecerAlternativo(true); }
    finally { abriendo.current = false; }
  };

  if (!esAdministrador) return null;
  const panel = <PanelTeo siempreVisible={Boolean(destino)} alCerrar={cerrar} alCaducarSesion={caducar} alCambiarTamano={cambiarTamano} />;
  return <>
    <button ref={referenciaBoton} className="teo-lanzador" type="button" onClick={abrir} aria-label="Abrir Teo, tu compañero CRA" aria-expanded={Boolean(destino || alternativo)} title="Teo · Asistente de prueba para administrador"><img src={imagenTeo} alt="" width={60} height={60} /><span>Teo<small>Solo tú · Admin</small></span></button>
    {destino && createPortal(panel, destino)}
    {alternativo && <div className="teo-alternativo" style={{ height: alto }} role="region" aria-label="Ventana de Teo">{panel}</div>}
  </>;
};
