import React from "react";
import avatarReposo from "../recursos/rincon-javi/javi-reposo-v2.png";
import avatarHablando from "../recursos/rincon-javi/javi-hablando-v2.png";
import avatarParpadeo from "../recursos/rincon-javi/javi-parpadeo-v2.png";
import avatarCarcajada from "../recursos/rincon-javi/javi-reaccion-carcajada-v1.png";
import avatarSonrisa from "../recursos/rincon-javi/javi-reaccion-sonrisa-v1.png";
import avatarCunado from "../recursos/rincon-javi/javi-reaccion-cunado-v1.png";

type TipoVoto = "carcajada" | "sonrisa" | "cunado";
interface ChisteHistorial {
  id: number;
  contenido: string;
  publicadoEn: number;
  votos: Record<TipoVoto, number>;
}
interface ConfiguracionRincon {
  contenido: string;
  visible: boolean;
  chisteActualId?: number | null;
  historial?: ChisteHistorial[];
}
const MAXIMO_CARACTERES = 2000;
const EVENTO_RINCON_ACTUALIZADO = "rincon-javi-actualizado";

export const RinconJavi: React.FC<{ esAdministrador: boolean; soloEditor?: boolean }> = ({ esAdministrador, soloEditor = false }) => {
  const [contenido, establecerContenido] = React.useState("");
  const [visible, establecerVisible] = React.useState(false);
  const [cargando, establecerCargando] = React.useState(true);
  const [guardando, establecerGuardando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");
  const [chisteActualId, establecerChisteActualId] = React.useState<number | null>(null);
  const [historial, establecerHistorial] = React.useState<ChisteHistorial[]>([]);
  const [historialAbierto, establecerHistorialAbierto] = React.useState(false);
  const [votando, establecerVotando] = React.useState(false);
  const [votoElegido, establecerVotoElegido] = React.useState<TipoVoto | null>(null);
  const [reaccionActiva, establecerReaccionActiva] = React.useState<{ tipo: TipoVoto; secuencia: number } | null>(null);
  const temporizadorReaccion = React.useRef<number | null>(null);

  React.useEffect(() => {
    const ruta = esAdministrador ? "/api/administracion/rincon-javi" : "/api/rincon-javi";
    let activo = true;
    const cargar = async (esPrimeraCarga = false, incluirHistorial = false) => {
      if (!esPrimeraCarga && document.visibilityState === "hidden") return;
      try {
        const respuesta = await fetch(`${ruta}${incluirHistorial ? "?historial=1" : ""}`, { credentials: "same-origin", cache: "no-store" });
        const datos = await respuesta.json() as ConfiguracionRincon & { error?: string };
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo cargar.");
        if (!activo) return;
        establecerContenido(datos.contenido ?? "");
        establecerVisible(Boolean(datos.visible));
        establecerChisteActualId(datos.chisteActualId ?? null);
        establecerHistorial(datos.historial ?? []);
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
      : window.setInterval(() => cargar().catch(() => undefined), 60_000);
    return () => {
      activo = false;
      if (intervalo !== undefined) window.clearInterval(intervalo);
    };
  }, [esAdministrador]);

  const alternarHistorial = async () => {
    const seAbrira = !historialAbierto;
    establecerHistorialAbierto(seAbrira);
    if (!seAbrira) return;
    try {
      const respuesta = await fetch("/api/rincon-javi?historial=1", { credentials: "same-origin", cache: "no-store" });
      const datos = await respuesta.json() as ConfiguracionRincon;
      if (respuesta.ok) establecerHistorial(datos.historial ?? []);
    } catch { /* El chiste actual continúa disponible aunque falle el historial. */ }
  };

  React.useEffect(() => {
    const sincronizar = (evento: Event) => {
      const configuracion = (evento as CustomEvent<ConfiguracionRincon>).detail;
      establecerContenido(configuracion.contenido);
      establecerVisible(configuracion.visible);
      if (configuracion.chisteActualId !== undefined) {
        establecerChisteActualId(configuracion.chisteActualId);
        if (configuracion.chisteActualId) establecerHistorial((actual) => {
          if (actual.some((item) => item.id === configuracion.chisteActualId)) return actual;
          return [{ id: configuracion.chisteActualId!, contenido: configuracion.contenido, publicadoEn: Math.floor(Date.now() / 1000), votos: { carcajada: 0, sonrisa: 0, cunado: 0 } }, ...actual];
        });
      }
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
      establecerChisteActualId(datos.chisteActualId ?? null);
      window.dispatchEvent(new CustomEvent<ConfiguracionRincon>(EVENTO_RINCON_ACTUALIZADO, {
        detail: { contenido: datos.contenido, visible: datos.visible, chisteActualId: datos.chisteActualId },
      }));
      establecerMensaje(datos.visible ? "Contenido guardado y visible para los invitados." : "Contenido guardado y oculto para los invitados.");
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { establecerGuardando(false); }
  };

  React.useEffect(() => {
    if (!chisteActualId) { establecerVotoElegido(null); return; }
    const guardado = window.localStorage.getItem(`rincon-javi-voto-${chisteActualId}`);
    establecerVotoElegido(guardado === "carcajada" || guardado === "sonrisa" || guardado === "cunado" ? guardado : null);
  }, [chisteActualId]);

  React.useEffect(() => () => {
    if (temporizadorReaccion.current !== null) window.clearTimeout(temporizadorReaccion.current);
  }, []);

  const votar = async (voto: TipoVoto) => {
    if (!chisteActualId || votando) return;
    establecerVotando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/rincon-javi", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chisteId: chisteActualId, voto }),
      });
      const datos = await respuesta.json() as { chiste?: ChisteHistorial; error?: string };
      if (!respuesta.ok || !datos.chiste) throw new Error(datos.error || "No se pudo votar.");
      establecerHistorial((actual) => actual.map((item) => item.id === datos.chiste!.id ? datos.chiste! : item));
      window.localStorage.setItem(`rincon-javi-voto-${chisteActualId}`, voto);
      establecerVotoElegido(voto);
      establecerReaccionActiva((anterior) => ({ tipo: voto, secuencia: (anterior?.secuencia ?? 0) + 1 }));
      if (temporizadorReaccion.current !== null) window.clearTimeout(temporizadorReaccion.current);
      temporizadorReaccion.current = window.setTimeout(() => {
        establecerReaccionActiva(null);
        temporizadorReaccion.current = null;
      }, 2800);
    } catch (error) { establecerMensaje(error instanceof Error ? error.message : "No se pudo votar."); }
    finally { establecerVotando(false); }
  };

  const actual = historial.find((item) => item.id === chisteActualId);
  const imagenesReaccion: Record<TipoVoto, string> = {
    carcajada: avatarCarcajada,
    sonrisa: avatarSonrisa,
    cunado: avatarCunado,
  };
  const textosReaccion: Record<TipoVoto, string> = {
    carcajada: "Javi celebra que te haya encantado el chiste",
    sonrisa: "Javi responde con el pulgar hacia arriba",
    cunado: "Javi se pone triste y llora",
  };
  const opcionesVoto: Array<{ id: TipoVoto; icono: string; texto: string }> = [
    { id: "carcajada", icono: "😂", texto: "Me parto" },
    { id: "sonrisa", icono: "😄", texto: "Tiene su punto" },
    { id: "cunado", icono: "🥁", texto: "Chiste de cuñado" },
  ];

  if (cargando) return null;
  return <>
    {!soloEditor && visible && contenido && <section className="rincon-javi" aria-labelledby="titulo-rincon-javi">
      <div className="avatar-javi" role="img" aria-label="Avatar animado de Javi, operador CRA">
        <img className="avatar-javi-imagen avatar-javi-reposo" src={avatarReposo} alt="" />
        <img className="avatar-javi-imagen avatar-javi-parpadeo" src={avatarParpadeo} alt="" />
        <img className="avatar-javi-imagen avatar-javi-hablando" src={avatarHablando} alt="" />
        {reaccionActiva && <img key={reaccionActiva.secuencia} className={`avatar-javi-imagen avatar-javi-reaccion avatar-javi-reaccion-${reaccionActiva.tipo}`} src={imagenesReaccion[reaccionActiva.tipo]} alt="" />}
      </div>
      <span className="lector-pantalla" aria-live="polite">{reaccionActiva ? textosReaccion[reaccionActiva.tipo] : ""}</span>
      <div className="rincon-javi-contenido"><span>Un momento para desconectar</span><h2 id="titulo-rincon-javi">El rincón de Javi</h2><p>{contenido}</p>
        {chisteActualId && <div className="rincon-javi-votacion" aria-label="Valora el chiste de Javi">
          <small>Veredicto del público:</small>
          <div>{opcionesVoto.map((opcion) => <button type="button" className={votoElegido === opcion.id ? "elegido" : ""} disabled={votando} onClick={() => votar(opcion.id)} key={opcion.id}><b aria-hidden="true">{opcion.icono}</b><span>{opcion.texto}</span><em>{actual?.votos[opcion.id] ?? 0}</em></button>)}</div>
        </div>}
        <button className="rincon-javi-historial-boton" type="button" onClick={alternarHistorial} aria-expanded={historialAbierto}>{historialAbierto ? "Cerrar historial" : "Ver historial"}</button>
        {mensaje && <small className="rincon-javi-mensaje" role="status">{mensaje}</small>}
      </div>
      {historialAbierto && <div className="rincon-javi-historial">
        <header><strong>El archivo secreto de Javi</strong><small>Chistes anteriores y su veredicto</small></header>
        {!historial.length ? <p>Todavía no hay chistes guardados.</p> : <div>{historial.map((chiste, indice) => <article key={chiste.id} className={chiste.id === chisteActualId ? "actual" : ""}>
          <small>{chiste.id === chisteActualId ? "En cartelera" : new Date(chiste.publicadoEn * 1000).toLocaleDateString("es-ES")}</small>
          <p>{chiste.contenido}</p>
          <footer><span>😂 {chiste.votos.carcajada}</span><span>😄 {chiste.votos.sonrisa}</span><span>🥁 {chiste.votos.cunado}</span>{indice === 0 && <b>Último</b>}</footer>
        </article>)}</div>}
      </div>}
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
