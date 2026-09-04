import React from "react";
import fondoTabernaMedieval from "../recursos/taberna/taberna-medieval-rey.png";
import avatarAventurero3d from "../recursos/taberna/avatar-aventurero-3d.png";
import avatarRey3d from "../recursos/taberna/avatar-rey-3d.png";

declare const __CRA_SOCIAL_WS_URL__: string;

type Visitante = { id: string; nombre: string; color: string; x: number; y: number; administrador?: boolean; tienePinta?: boolean; nivelMareo?: number; desmayadoHasta?: number };
type Mensaje = { id: string; nombre: string; texto: string; enviadoEn: number };
type MovimientoAvatar = { direccion: "izquierda" | "derecha" | "arriba" | "abajo"; caminando: boolean };

const baseTaberna = () => {
  let base = __CRA_SOCIAL_WS_URL__ || (location.hostname === "localhost" ? "ws://localhost:8787" : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/cra-social`);
  return base.replace(/\/$/, "");
};

const urlTaberna = (token: string) => `${baseTaberna()}/taberna${token ? `?admin=${encodeURIComponent(token)}` : ""}`;

export const consultarEstadoTaberna = async () => {
  const url = `${baseTaberna().replace(/^ws/, "http")}/taberna/estado`;
  const respuesta = await fetch(url, { cache: "no-store" });
  return respuesta.ok && Boolean(((await respuesta.json()) as { habilitada?: boolean }).habilitada);
};

const Avatar: React.FC<{ visitante: Visitante; propio: boolean; bocadillo?: string; movimiento?: MovimientoAvatar }> = ({ visitante, propio, bocadillo, movimiento }) => (
  <div className={`taberna-visitante color-${visitante.color} ${propio ? "es-propio" : ""} ${visitante.administrador ? "es-rey" : ""} mira-${movimiento?.direccion ?? "abajo"} ${movimiento?.caminando ? "esta-caminando" : ""} mareo-${visitante.nivelMareo ?? 0} ${(visitante.desmayadoHasta ?? 0) > Date.now() ? "esta-desmayado" : ""}`} style={{ left: `${visitante.x}%`, top: `${visitante.y}%` }}>
    {bocadillo && <div className="taberna-bocadillo">{bocadillo}</div>}
    <div className="taberna-sombra-avatar" aria-hidden="true" />
    <div className="taberna-avatar avatar-render-3d" aria-hidden="true"><img className="avatar-cuerpo-3d" src={visitante.administrador ? avatarRey3d : avatarAventurero3d} alt=""/><img className="avatar-pierna-3d pierna-3d-i" src={visitante.administrador ? avatarRey3d : avatarAventurero3d} alt=""/><img className="avatar-pierna-3d pierna-3d-d" src={visitante.administrador ? avatarRey3d : avatarAventurero3d} alt=""/>{visitante.tienePinta && <i className="pinta-avatar">🍺</i>}</div>
    {(visitante.desmayadoHasta ?? 0) > Date.now() && <div className="taberna-zzz" aria-hidden="true">Zzz…</div>}
    <span>{visitante.nombre}{propio ? " · tú" : ""}</span>
  </div>
);

export const JuegoTabernaDigital: React.FC<{ esAdministrador: boolean; onHabilitadaChange?: (valor: boolean) => void }> = ({ esAdministrador, onHabilitadaChange }) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);
  const [visitantes, setVisitantes] = React.useState<Visitante[]>([]);
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([]);
  const [bocadillos, setBocadillos] = React.useState<Record<string, string>>({});
  const [movimientos, setMovimientos] = React.useState<Record<string, MovimientoAvatar>>({});
  const [propioId, setPropioId] = React.useState("");
  const [texto, setTexto] = React.useState("");
  const [estado, setEstado] = React.useState("Entrando en la taberna…");
  const [habilitada, setHabilitada] = React.useState(false);
  const [ahora, setAhora] = React.useState(Date.now());
  const [juegoFuerza, setJuegoFuerza] = React.useState<{ empiezaEn: number; terminaEn: number; golpes: number; resultado?: string } | null>(null);
  const [juegoCero, setJuegoCero] = React.useState<{ empiezaEn: number; objetivoEn: number; terminaEn: number; pulsado: boolean; diferencia?: number; resultado?: string } | null>(null);
  const mapaRef = React.useRef<HTMLDivElement>(null);
  const finalChatRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let activo = true;
    let conexion: WebSocket | null = null;
    const conectar = async () => {
      let token = "";
      if (esAdministrador && location.hostname !== "localhost") {
        try { token = ((await (await fetch("/api/administracion/taberna-token", { cache: "no-store" })).json()) as { token?: string }).token ?? ""; } catch { /* acceso normal */ }
      }
      if (!activo) return;
      conexion = new WebSocket(urlTaberna(token));
      conexion.onopen = () => { setEstado("Conectado"); conexion?.send(JSON.stringify({ tipo: "entrar_taberna" })); };
      conexion.onmessage = (evento) => {
        const datos = JSON.parse(String(evento.data)) as any;
        if (datos.tipo === "identidad_taberna") { setPropioId(datos.visitante.id); setHabilitada(Boolean(datos.habilitada)); }
        if (datos.tipo === "estado_taberna") { setVisitantes(datos.visitantes ?? []); setMensajes(datos.mensajes ?? []); }
        if (datos.tipo === "visitante_movido") setVisitantes((actuales) => {
          const anterior = actuales.find((v) => v.id === datos.id);
          if (anterior) {
            const dx = datos.x - anterior.x; const dy = datos.y - anterior.y;
            const direccion: MovimientoAvatar["direccion"] = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "izquierda" : "derecha") : (dy < 0 ? "arriba" : "abajo");
            setMovimientos((m) => ({ ...m, [datos.id]: { direccion, caminando: true } }));
            window.setTimeout(() => setMovimientos((m) => ({ ...m, [datos.id]: { ...(m[datos.id] ?? { direccion }), caminando: false } })), 700);
          }
          return actuales.map((v) => v.id === datos.id ? { ...v, x: datos.x, y: datos.y } : v);
        });
        if (datos.tipo === "mensaje_taberna") {
          setMensajes((actuales) => [...actuales.slice(-39), datos.mensaje]);
          setBocadillos((actuales) => ({ ...actuales, [datos.visitanteId]: datos.mensaje.texto }));
          window.setTimeout(() => setBocadillos((actuales) => { const copia = { ...actuales }; delete copia[datos.visitanteId]; return copia; }), 6500);
        }
        if (datos.tipo === "accion_barra") {
          setVisitantes((actuales) => actuales.map((v) => v.id === datos.visitante.id ? datos.visitante : v));
          setBocadillos((actuales) => ({ ...actuales, [datos.visitante.id]: datos.texto }));
          window.setTimeout(() => setBocadillos((actuales) => { const copia = { ...actuales }; delete copia[datos.visitante.id]; return copia; }), 4200);
        }
        if (datos.tipo === "juego_fuerza_iniciado") setJuegoFuerza({ empiezaEn: datos.empiezaEn, terminaEn: datos.terminaEn, golpes: 0 });
        if (datos.tipo === "golpes_fuerza") setJuegoFuerza((juego) => juego ? { ...juego, golpes: datos.golpes } : juego);
        if (datos.tipo === "juego_fuerza_finalizado") setJuegoFuerza({ empiezaEn: Date.now(), terminaEn: Date.now(), golpes: datos.golpes, resultado: datos.ganador ? `${datos.ganador} gana con ${datos.golpes} golpes` : "Nadie golpeó el yunque" });
        if (datos.tipo === "juego_cero_iniciado") setJuegoCero({ empiezaEn: datos.empiezaEn, objetivoEn: datos.objetivoEn, terminaEn: datos.terminaEn, pulsado: false });
        if (datos.tipo === "intento_cero_registrado") setJuegoCero((juego) => juego ? { ...juego, pulsado: true, diferencia: datos.diferencia } : juego);
        if (datos.tipo === "juego_cero_finalizado") setJuegoCero({ empiezaEn: Date.now(), objetivoEn: Date.now(), terminaEn: Date.now(), pulsado: true, resultado: datos.ganador ? `${datos.ganador} gana · error de ${datos.diferencia} ms` : "Nadie se atrevió a pulsar" });
        if (datos.tipo === "taberna_habilitada") { setHabilitada(Boolean(datos.habilitada)); onHabilitadaChange?.(Boolean(datos.habilitada)); }
        if (datos.tipo === "expulsado_taberna") setEstado("El administrador te ha retirado de la sala.");
      };
      conexion.onerror = () => setEstado("No se pudo abrir la taberna.");
      conexion.onclose = (evento) => { setSocket(null); if (evento.code === 4001) setEstado("La taberna está cerrada por ahora."); else if (evento.code !== 4003) setEstado("Desconectado de la taberna."); };
      setSocket(conexion);
    };
    conectar();
    return () => { activo = false; conexion?.close(); };
  }, [esAdministrador, onHabilitadaChange]);

  React.useEffect(() => {
    finalChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  React.useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  const moverA = (x: number, y: number) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ tipo: "mover_taberna", x, y }));
  };
  const moverPorTeclado = (evento: React.KeyboardEvent) => {
    const propio = visitantes.find((v) => v.id === propioId); if (!propio) return;
    const pasos: Record<string, [number, number]> = { ArrowUp:[0,-3], w:[0,-3], ArrowDown:[0,3], s:[0,3], ArrowLeft:[-3,0], a:[-3,0], ArrowRight:[3,0], d:[3,0] };
    const paso = pasos[evento.key]; if (!paso) return; evento.preventDefault(); moverA(propio.x + paso[0], propio.y + paso[1]);
  };
  const moverConClick = (evento: React.MouseEvent<HTMLDivElement>) => {
    const rect = evento.currentTarget.getBoundingClientRect(); moverA(((evento.clientX - rect.left) / rect.width) * 100, ((evento.clientY - rect.top) / rect.height) * 100);
  };
  const enviarMensaje = (evento: React.FormEvent) => {
    evento.preventDefault(); const limpio = texto.trim(); if (!limpio || !socket) return;
    socket.send(JSON.stringify({ tipo: "chat_taberna", texto: limpio })); setTexto("");
  };
  const administrar = (accion: "habilitar" | "expulsar", valor?: boolean | string) => socket?.send(JSON.stringify(accion === "habilitar" ? { tipo:"administrar_taberna", accion, valor } : { tipo:"administrar_taberna", accion, id:valor }));
  const accionBarra = (accion: "pedir" | "beber" | "brindar" | "recuperar") => socket?.send(JSON.stringify({ tipo: "accion_barra", accion }));
  const minijuego = (accion: "iniciar_fuerza" | "golpear" | "iniciar_cero" | "pulsar_cero") => socket?.send(JSON.stringify({ tipo: "minijuego", accion }));
  const visitantePropio = visitantes.find((visitante) => visitante.id === propioId);
  const cercaDeBarra = Boolean(visitantePropio && visitantePropio.x >= 54 && visitantePropio.x <= 91 && visitantePropio.y >= 23 && visitantePropio.y <= 49);
  const segundosDesmayado = Math.max(0, Math.ceil(((visitantePropio?.desmayadoHasta ?? 0) - ahora) / 1000));
  const desmayado = segundosDesmayado > 0;
  const segundosFuerza = Math.max(0, Math.ceil(((juegoFuerza?.terminaEn ?? 0) - ahora) / 1000));
  const segundosCero = Math.max(0, ((juegoCero?.objetivoEn ?? 0) - ahora) / 1000);
  const preparacionFuerza = Math.max(0, Math.ceil(((juegoFuerza?.empiezaEn ?? 0) - ahora) / 1000));
  const preparacionCero = Math.max(0, Math.ceil(((juegoCero?.empiezaEn ?? 0) - ahora) / 1000));
  const juegoEnCurso = Boolean((juegoFuerza && !juegoFuerza.resultado && juegoFuerza.terminaEn > ahora) || (juegoCero && !juegoCero.resultado && juegoCero.terminaEn > ahora));

  React.useEffect(() => {
    if (visitantePropio?.desmayadoHasta && visitantePropio.desmayadoHasta <= ahora) accionBarra("recuperar");
  }, [ahora, visitantePropio?.desmayadoHasta]);

  return <section className="taberna-digital">
    <header className="taberna-titulo"><div className="taberna-escudo" aria-hidden="true">♛</div><div className="taberna-titulo-texto"><span>SALÓN MEDIEVAL · IDENTIDAD TEMPORAL</span><h2>La Taberna del Rey</h2><p>Recorre el salón con las flechas, WASD o tocando el suelo.</p></div><div className="taberna-estado"><b className={socket ? "conectado" : ""}/>{estado}</div></header>
    {esAdministrador && <div className="taberna-admin"><strong>Control de apertura</strong><span>{habilitada ? "Visible para invitados" : "Solo puedes entrar tú"}</span><button type="button" className={habilitada ? "cerrar" : "abrir"} onClick={() => administrar("habilitar", !habilitada)}>{habilitada ? "Cerrar taberna" : "Abrir taberna"}</button></div>}
    {esAdministrador && <div className="taberna-minijuegos taberna-minijuegos-admin"><header><span>⚔</span><div><strong>Control de juegos de la corte</strong><small>Solo visible para El Rey · la partida aparecerá dentro del mapa</small></div></header><section><div><b>🔨 El Yunque Real</b><small>Golpea tantas veces como puedas en ocho segundos</small></div><button type="button" disabled={desmayado || juegoEnCurso} onClick={() => { setJuegoFuerza(null); setJuegoCero(null); minijuego("iniciar_fuerza"); }}>Iniciar</button></section><section><div><b>⏳ El Instante Cero</b><small>Calcula el cero cuando el reloj desaparezca</small></div><button type="button" disabled={desmayado || juegoEnCurso} onClick={() => { setJuegoFuerza(null); setJuegoCero(null); minijuego("iniciar_cero"); }}>Iniciar</button></section></div>}
    <div className="taberna-distribucion">
      <div className="taberna-mapa" style={{ backgroundImage: `linear-gradient(#12080520,#12080520), url(${fondoTabernaMedieval})` }} ref={mapaRef} role="application" tabIndex={0} onKeyDown={moverPorTeclado} onClick={moverConClick} aria-label="Mapa de la taberna. Usa las flechas para moverte.">
        <div className="taberna-letrero-medieval"><i>♛</i><strong>LA TABERNA</strong><small>DEL REY</small></div><div className="taberna-antorcha antorcha-i"><i/></div><div className="taberna-antorcha antorcha-d"><i/></div><div className="taberna-brillo-fuego"/><div className="taberna-particulas"><i/><i/><i/><i/><i/></div>
        <div className={`taberna-acciones-barra ${cercaDeBarra ? "barra-activa" : "barra-lejana"}`} onClick={(evento) => evento.stopPropagation()}><header><span>🍺</span><div><strong>Barra del posadero</strong><small>{desmayado ? `Desmayado · ${segundosDesmayado}s` : `Mareo ${visitantePropio?.nivelMareo ?? 0}/5`}</small></div></header><div><button type="button" disabled={!cercaDeBarra || desmayado || Boolean(visitantePropio?.tienePinta)} onClick={() => accionBarra("pedir")}>Pedir pinta</button><button type="button" disabled={desmayado || !visitantePropio?.tienePinta} onClick={() => accionBarra("beber")}>Beber</button><button type="button" disabled={desmayado} onClick={() => accionBarra("brindar")}>Brindar</button></div><div className="taberna-medidor-mareo" aria-label={`Nivel de mareo ${visitantePropio?.nivelMareo ?? 0} de 5`}><i style={{ width: `${((visitantePropio?.nivelMareo ?? 0) / 5) * 100}%` }}/></div>{!cercaDeBarra && !visitantePropio?.tienePinta && <p>Acércate para pedir. Beber y brindar funcionan en cualquier lugar.</p>}</div>
        <div className="taberna-zona-barra" aria-hidden="true"><span>Zona de barra</span></div>
        {desmayado && <div className="taberna-aviso-desmayo"><strong>💤 Te has desmayado</strong><span>Volverás en {segundosDesmayado} segundos</span></div>}
        {visitantes.map((visitante) => <Avatar key={visitante.id} visitante={visitante} propio={visitante.id === propioId} bocadillo={bocadillos[visitante.id]} movimiento={movimientos[visitante.id]}/>)}
        {juegoFuerza && <div className={`taberna-juego-overlay juego-yunque ${juegoFuerza.resultado ? "muestra-ganador" : ""}`} onClick={(evento) => evento.stopPropagation()}>{juegoFuerza.resultado ? <div className="taberna-ganador"><div className="confeti">✦　✧　✦</div><span>♛</span><small>CAMPEÓN DEL YUNQUE</small><strong>{juegoFuerza.resultado}</strong><button type="button" onClick={() => setJuegoFuerza(null)}>Cerrar</button></div> : preparacionFuerza > 0 ? <div className="taberna-preparacion"><small>PREPARA EL MARTILLO</small><strong>{preparacionFuerza}</strong></div> : <div className="taberna-yunque-activo"><header><span>{segundosFuerza}s</span><b>{juegoFuerza.golpes} golpes</b></header><div className="yunque-grande">🔨<i>⚒</i></div><button type="button" disabled={desmayado} onClick={() => minijuego("golpear")}>¡GOLPEAR EL YUNQUE!</button></div>}</div>}
        {juegoCero && <div className={`taberna-juego-overlay juego-cero ${juegoCero.resultado ? "muestra-ganador" : ""}`} onClick={(evento) => evento.stopPropagation()}>{juegoCero.resultado ? <div className="taberna-ganador"><div className="confeti">✦　✧　✦</div><span>⏳</span><small>MAESTRO DEL TIEMPO</small><strong>{juegoCero.resultado}</strong><button type="button" onClick={() => setJuegoCero(null)}>Cerrar</button></div> : preparacionCero > 0 ? <div className="taberna-preparacion"><small>OBSERVA EL RELOJ</small><strong>{preparacionCero}</strong></div> : <div className="taberna-cero-activo"><small>EL INSTANTE CERO</small><div className={`reloj-cero ${segundosCero <= 5 ? "reloj-oculto" : ""}`}>{segundosCero > 5 ? segundosCero.toFixed(1) : "? ? ?"}</div><p>{segundosCero > 5 ? "Memoriza el ritmo…" : "El tiempo sigue corriendo. ¡Calcula el cero!"}</p><button type="button" disabled={desmayado || juegoCero.pulsado} onClick={() => minijuego("pulsar_cero")}>{juegoCero.pulsado ? `Registrado · ${juegoCero.diferencia} ms` : "¡AHORA!"}</button></div>}</div>}
        <div className="taberna-ayuda">Toca para caminar · Flechas / WASD</div>
      </div>
      <aside className="taberna-chat">
        <header><div><span>CHAT EN DIRECTO</span><strong>{visitantes.length} en la sala</strong></div><i/></header>
        <div className="taberna-mensajes">{mensajes.length === 0 && <p className="taberna-vacio">Rompe el hielo: lo que escribas también aparecerá sobre tu avatar.</p>}{mensajes.map((mensaje) => <article key={mensaje.id}><b>{mensaje.nombre}</b><p>{mensaje.texto}</p><time>{new Date(mensaje.enviadoEn).toLocaleTimeString("es-ES", { hour:"2-digit", minute:"2-digit" })}</time></article>)}<div ref={finalChatRef}/></div>
        <form onSubmit={enviarMensaje}><label htmlFor="mensaje-taberna">Tu mensaje</label><div><input id="mensaje-taberna" value={texto} disabled={desmayado} onChange={(e) => setTexto(e.target.value)} maxLength={220} placeholder={desmayado ? `Desmayado durante ${segundosDesmayado}s` : "Escribe algo…"}/><button type="submit" disabled={desmayado} aria-label="Enviar mensaje">➤</button></div><small>{desmayado ? "No puedes escribir mientras estás desmayado" : `${texto.length}/220 · No se guarda al salir`}</small></form>
        {esAdministrador && visitantes.some(v => v.id !== propioId) && <details className="taberna-moderacion"><summary>Moderar participantes</summary>{visitantes.filter(v => v.id !== propioId).map(v => <button type="button" key={v.id} onClick={() => administrar("expulsar", v.id)}>Expulsar a {v.nombre}</button>)}</details>}
      </aside>
    </div>
  </section>;
};
