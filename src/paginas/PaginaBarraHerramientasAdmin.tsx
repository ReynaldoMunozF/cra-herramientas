import React from "react";
import { BarraHerramientasAdmin } from "../componentes/BarraHerramientasAdmin";
import { animarVentanaAuxiliar } from "../utilidades/animarVentanaAuxiliar";

/** Respaldo para navegadores sin Picture-in-Picture; mantiene la vista privada. */
export const PaginaBarraHerramientasAdmin: React.FC = () => {
  const [estado, establecerEstado] = React.useState<"cargando" | "administrador" | "invitado" | "denegado">("cargando");
  const vistaPreviaLocal = window.location.hostname === "localhost"
    && new URLSearchParams(window.location.search).has("vista-admin");

  React.useEffect(() => {
    if (vistaPreviaLocal) {
      establecerEstado("administrador");
      return;
    }
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) => establecerEstado(sesion.rol === "administrador" ? "administrador" : sesion.rol === "invitado" ? "invitado" : "denegado"))
      .catch(() => establecerEstado("denegado"));
  }, [vistaPreviaLocal]);

  React.useEffect(() => {
    document.body.classList.add("pagina-barra-admin-activa");
    return () => document.body.classList.remove("pagina-barra-admin-activa");
  }, []);

  React.useEffect(() => {
    const adaptarVentana = (evento: Event) => {
      const herramienta = (evento as CustomEvent<string>).detail;
      const esCodigos = herramienta === "codigos";
      const ancho = Math.min(herramienta === "ninguna" ? 535 : esCodigos ? 820 : 760, window.screen.availWidth);
      const alto = herramienta === "ninguna" ? 78 : Math.min(esCodigos ? 700 : 640, window.screen.availHeight);
      animarVentanaAuxiliar(window, ancho, alto, herramienta === "ninguna" ? 260 : 360);
    };
    window.addEventListener("herramienta-flotante-abierta", adaptarVentana);
    return () => window.removeEventListener("herramienta-flotante-abierta", adaptarVentana);
  }, []);

  if (estado === "cargando") return <main className="barra-admin-estado">Preparando herramientas…</main>;
  if (estado === "denegado") return <main className="barra-admin-estado">Esta vista está reservada al administrador.</main>;
  return <BarraHerramientasAdmin flotante esAdministrador={estado === "administrador"} />;
};
