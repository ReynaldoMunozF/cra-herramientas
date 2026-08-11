import React from "react";
import avatarReposo from "../recursos/rincon-javi/javi-reposo.webp";
import avatarHablando from "../recursos/rincon-javi/javi-hablando.webp";
import avatarParpadeo from "../recursos/rincon-javi/javi-parpadeo.webp";

interface ConfiguracionRincon { contenido: string; visible: boolean; }
const MAXIMO_CARACTERES = 2000;
const EVENTO_RINCON_ACTUALIZADO = "rincon-javi-actualizado";

export const RinconJavi: React.FC<{ esAdministrador: boolean; soloEditor?: boolean }> = ({ esAdministrador, soloEditor = false }) => {
  const [contenido, establecerContenido] = React.useState("");
  const [visible, establecerVisible] = React.useState(false);
  const [cargando, establecerCargando] = React.useState(true);
  const [guardando, establecerGuardando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");

  React.useEffect(() => {
    const ruta = esAdministrador ? "/api/administracion/rincon-javi" : "/api/rincon-javi";
    let activo = true;
    const cargar = async (esPrimeraCarga = false) => {
      try {
        const respuesta = await fetch(ruta, { credentials: "same-origin", cache: "no-store" });
        const datos = await respuesta.json() as ConfiguracionRincon & { error?: string };
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo cargar.");
        if (!activo) return;
        establecerContenido(datos.contenido ?? "");
        establecerVisible(Boolean(datos.visible));
        establecerMensaje("");
      } catch {
        if (activo && esPrimeraCarga) establecerMensaje("No se pudo cargar El rincón de Javi.");
      } finally {
        if (activo && esPrimeraCarga) establecerCargando(false);
      }
    };

    cargar(true).catch(() => undefined);
    const intervalo = esAdministrador
      ? undefined
      : window.setInterval(() => cargar().catch(() => undefined), 3000);
    return () => {
      activo = false;
      if (intervalo !== undefined) window.clearInterval(intervalo);
    };
  }, [esAdministrador]);

  React.useEffect(() => {
    const sincronizar = (evento: Event) => {
      const configuracion = (evento as CustomEvent<ConfiguracionRincon>).detail;
      establecerContenido(configuracion.contenido);
      establecerVisible(configuracion.visible);
    };
    window.addEventListener(EVENTO_RINCON_ACTUALIZADO, sincronizar);
    return () => window.removeEventListener(EVENTO_RINCON_ACTUALIZADO, sincronizar);
  }, []);

  const guardar = async () => {
    establecerGuardando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/rincon-javi", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido, visible }),
      });
      const datos = await respuesta.json() as ConfiguracionRincon & { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar.");
      establecerContenido(datos.contenido);
      establecerVisible(datos.visible);
      window.dispatchEvent(new CustomEvent<ConfiguracionRincon>(EVENTO_RINCON_ACTUALIZADO, {
        detail: { contenido: datos.contenido, visible: datos.visible },
      }));
      establecerMensaje(datos.visible ? "Contenido guardado y visible para los invitados." : "Contenido guardado y oculto para los invitados.");
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { establecerGuardando(false); }
  };

  if (cargando) return null;
  return <>
    {!soloEditor && visible && contenido && <section className="rincon-javi" aria-labelledby="titulo-rincon-javi">
      <div className="avatar-javi" role="img" aria-label="Avatar animado de Javi, operador CRA">
        <img className="avatar-javi-imagen avatar-javi-reposo" src={avatarReposo} alt="" />
        <img className="avatar-javi-imagen avatar-javi-parpadeo" src={avatarParpadeo} alt="" />
        <img className="avatar-javi-imagen avatar-javi-hablando" src={avatarHablando} alt="" />
      </div>
      <div><span>Un momento para desconectar</span><h2 id="titulo-rincon-javi">El rincón de Javi</h2><p>{contenido}</p></div>
    </section>}
    {esAdministrador && soloEditor && <section className="editor-rincon-javi" aria-labelledby="titulo-editor-rincon-javi">
      <header><span>Solo administrador</span><h2 id="titulo-editor-rincon-javi">Gestionar El rincón de Javi</h2><p>Publica consejos, mensajes o chistes en la página principal.</p></header>
      <label className="editor-rincon-javi-visible">
        <input type="checkbox" checked={visible} onChange={(evento) => establecerVisible(evento.target.checked)} />
        <i aria-hidden="true" /><span><strong>Mostrar en la portada</strong><small>{visible ? "Los invitados podrán verlo" : "Actualmente está oculto"}</small></span>
      </label>
      <label className="editor-rincon-javi-contenido">Contenido
        <textarea value={contenido} maxLength={MAXIMO_CARACTERES} rows={6} placeholder="Escribe aquí el consejo, mensaje o chiste…" onChange={(evento) => establecerContenido(evento.target.value)} />
        <small>{contenido.length}/{MAXIMO_CARACTERES} caracteres</small>
      </label>
      <footer><p role="status">{mensaje}</p><button type="button" disabled={guardando || (visible && !contenido.trim())} onClick={guardar}>{guardando ? "Guardando…" : "Guardar cambios"}</button></footer>
    </section>}
  </>;
};
