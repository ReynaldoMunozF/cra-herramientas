import React from "react";

const W = 1200, H = 620, G = 170;
const MOVIMIENTO_POR_TURNO = 120;
const COLORES = ["#30c7f2", "#ff9d34", "#98dc43", "#bd75ff"];
type Jugador = { id: number; nombre: string; x: number; vida: number };
type Bala = { x: number; y: number; vx: number; vy: number; tiempo: number };
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const crearTerreno = () => Array.from({ length: W }, (_, x) =>
  limitar(430 + Math.sin(x / 83) * 52 + Math.sin(x / 31) * 16 + Math.cos(x / 173) * 35, 335, 535));
const suelo = (terreno: number[], x: number) => terreno[limitar(Math.round(x), 0, W - 1)] ?? H;

export const JuegoArtilleria: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const terrenoRef = React.useRef(crearTerreno());
  const jugadoresRef = React.useRef<Jugador[]>([]);
  const balaRef = React.useRef<Bala | null>(null);
  const vientoRef = React.useRef(0);
  const turnoRef = React.useRef(0);
  const movimientoRef = React.useRef(MOVIMIENTO_POR_TURNO);
  const frameRef = React.useRef<number | null>(null);
  const [cantidad, setCantidad] = React.useState(2);
  const [jugadores, setJugadores] = React.useState<Jugador[]>([]);
  const [turno, setTurno] = React.useState(0);
  const [angulo, setAngulo] = React.useState(45);
  const [potencia, setPotencia] = React.useState(62);
  const [viento, setViento] = React.useState(0);
  const [movimiento, setMovimiento] = React.useState(MOVIMIENTO_POR_TURNO);
  const [activa, setActiva] = React.useState(false);
  const [disparando, setDisparando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState("Elige cuántos jugadores participarán.");
  const [ganador, setGanador] = React.useState("");

  const guardarJugadores = React.useCallback((lista: Jugador[]) => {
    jugadoresRef.current = lista; setJugadores([...lista]);
  }, []);
  const dibujar = React.useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const cielo = ctx.createLinearGradient(0, 0, 0, H);
    cielo.addColorStop(0, "#07162e"); cielo.addColorStop(.58, "#123b5d"); cielo.addColorStop(1, "#275e70");
    ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < 34; i += 1) ctx.fillRect((i * 181 + 47) % W, (i * 73 + 31) % 250, 2, 2);
    // Montañas lejanas para dar profundidad al escenario.
    ctx.fillStyle = "#16364d"; ctx.beginPath(); ctx.moveTo(0, 390);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 350 + Math.sin(x / 115) * 45 + Math.cos(x / 47) * 18);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const trazarTerreno = (desfase = 0) => { ctx.beginPath(); ctx.moveTo(0, H); terrenoRef.current.forEach((y, x) => ctx.lineTo(x, y + desfase)); ctx.lineTo(W, H); ctx.closePath(); };
    trazarTerreno();
    const tierra = ctx.createLinearGradient(0, 320, 0, H); tierra.addColorStop(0, "#a6dc54"); tierra.addColorStop(.045, "#4d8a3b"); tierra.addColorStop(.16, "#6d5032"); tierra.addColorStop(.62, "#3b3027"); tierra.addColorStop(1, "#201f1d"); ctx.fillStyle = tierra; ctx.fill();
    // Borde de césped y pequeñas irregularidades visuales.
    ctx.strokeStyle = "#c3ef69"; ctx.lineWidth = 5; ctx.beginPath(); terrenoRef.current.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
    ctx.fillStyle = "rgba(221,190,125,.2)";
    for (let i = 0; i < 95; i += 1) { const x = (i * 137 + 29) % W, y = suelo(terrenoRef.current, x) + 18 + (i * 31) % 120; ctx.beginPath(); ctx.ellipse(x, y, 2 + i % 5, 1 + i % 3, i, 0, Math.PI * 2); ctx.fill(); }
    jugadoresRef.current.forEach((j, i) => {
      if (j.vida <= 0) return; const y = suelo(terrenoRef.current, j.x) - 21; ctx.save(); ctx.translate(j.x, y);
      const activo = i === turnoRef.current && !balaRef.current, dir = j.id % 2 === 0 ? 1 : -1, rad = angulo * Math.PI / 180;
      if (activo) {
        // Arco, cifra del ángulo y predicción corta de la trayectoria.
        ctx.strokeStyle = "rgba(255,226,103,.75)"; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath();
        for (let paso = 0; paso < 24; paso += 1) { const t = paso * .075, v = 180 + potencia * 4.1, px = Math.cos(rad) * v * t * dir + vientoRef.current * t * t / 2, py = -Math.sin(rad) * v * t + G * t * t / 2 - 15; paso === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
        ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(0, -10, 43, dir > 0 ? -rad : Math.PI + rad, dir > 0 ? 0 : Math.PI, dir < 0); ctx.stroke();
        ctx.fillStyle = "#ffe267"; ctx.font = "900 15px Segoe UI"; ctx.textAlign = "center"; ctx.fillText(`${angulo}°`, dir * 50, -38);
      }
      // Barra de vida.
      ctx.fillStyle = "rgba(7,12,22,.78)"; ctx.beginPath(); ctx.roundRect(-30, -46, 60, 8, 4); ctx.fill(); ctx.fillStyle = j.vida > 45 ? "#54e892" : "#ff6262"; ctx.beginPath(); ctx.roundRect(-29, -45, 58 * j.vida / 100, 6, 3); ctx.fill();
      // Orugas, ruedas y chasis.
      ctx.fillStyle = "#101722"; ctx.beginPath(); ctx.roundRect(-28, 5, 56, 17, 8); ctx.fill(); ctx.strokeStyle = "#566271"; ctx.lineWidth = 2; ctx.stroke();
      [-19, -7, 7, 19].forEach(cx => { ctx.fillStyle = "#293443"; ctx.beginPath(); ctx.arc(cx, 13, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#788696"; ctx.beginPath(); ctx.arc(cx, 13, 2, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = COLORES[j.id]; ctx.beginPath(); ctx.moveTo(-23, 6); ctx.lineTo(-17, -9); ctx.lineTo(17, -9); ctx.lineTo(25, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(-14, -7, 26, 3);
      // Torreta y cañón.
      ctx.fillStyle = COLORES[j.id]; ctx.beginPath(); ctx.arc(0, -11, 13, Math.PI, 0); ctx.lineTo(13, -7); ctx.lineTo(-13, -7); ctx.fill();
      ctx.strokeStyle = "#e7f0f4"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(dir * 5, -14); ctx.lineTo(Math.cos(rad) * 35 * dir, -14 - Math.sin(rad) * 35); ctx.stroke(); ctx.strokeStyle = "#6e7b86"; ctx.lineWidth = 3; ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "#fff"; ctx.font = `800 ${activo ? 15 : 13}px Segoe UI`; ctx.textAlign = "center"; ctx.shadowColor = "#000"; ctx.shadowBlur = 4; ctx.fillText(j.nombre, 0, -54); ctx.shadowBlur = 0; ctx.restore();
    });
    if (balaRef.current) { ctx.fillStyle = "#ffe670"; ctx.shadowColor = "#ff9c31"; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(balaRef.current.x, balaRef.current.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  }, [angulo, potencia, viento]);
  React.useEffect(dibujar, [dibujar, jugadores, turno]);
  React.useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, []);
  const cambiarViento = () => { const valor = Math.round((Math.random() * 2 - 1) * 32); vientoRef.current = valor; setViento(valor); };

  const iniciar = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    terrenoRef.current = crearTerreno(); balaRef.current = null; turnoRef.current = 0; setTurno(0); movimientoRef.current = MOVIMIENTO_POR_TURNO; setMovimiento(MOVIMIENTO_POR_TURNO);
    guardarJugadores(Array.from({ length: cantidad }, (_, id) => ({ id, nombre: `Jugador ${id + 1}`, x: [115, 430, 765, 1080][id], vida: 100 })));
    setAngulo(45); setPotencia(62); setGanador(""); setDisparando(false); setActiva(true); setMensaje("Jugador 1 prepara el primer disparo."); cambiarViento();
  };
  const avanzar = React.useCallback(() => {
    const vivos = jugadoresRef.current.filter(j => j.vida > 0);
    if (vivos.length <= 1) { const nombre = vivos[0]?.nombre ?? "Nadie"; setGanador(nombre); setActiva(false); setDisparando(false); setMensaje(`${nombre} gana la partida.`); dibujar(); return; }
    let siguiente = turnoRef.current; do siguiente = (siguiente + 1) % jugadoresRef.current.length; while (jugadoresRef.current[siguiente].vida <= 0);
    turnoRef.current = siguiente; setTurno(siguiente); movimientoRef.current = MOVIMIENTO_POR_TURNO; setMovimiento(MOVIMIENTO_POR_TURNO); cambiarViento(); setDisparando(false); setMensaje(`${jugadoresRef.current[siguiente].nombre}, ajusta tu disparo.`); dibujar();
  }, [dibujar]);
  const mover = (direccion: -1 | 1) => {
    if (!activa || disparando || movimientoRef.current <= 0) return;
    const actual = jugadoresRef.current[turnoRef.current]; if (!actual) return;
    const paso = Math.min(10, movimientoRef.current), destino = limitar(actual.x + paso * direccion, 35, W - 35), distancia = Math.abs(destino - actual.x);
    if (!distancia) return;
    if (Math.abs(suelo(terrenoRef.current, destino) - suelo(terrenoRef.current, actual.x)) > 14) { setMensaje("La pendiente es demasiado pronunciada."); return; }
    if (jugadoresRef.current.some(j => j.id !== actual.id && j.vida > 0 && Math.abs(j.x - destino) < 52)) { setMensaje("Hay otro carro bloqueando el paso."); return; }
    guardarJugadores(jugadoresRef.current.map(j => j.id === actual.id ? { ...j, x: destino } : j));
    movimientoRef.current -= distancia; setMovimiento(movimientoRef.current);
    setMensaje(movimientoRef.current > 0 ? `Movimiento restante: ${movimientoRef.current} m.` : "Movimiento agotado. Prepara el disparo.");
  };
  const explotar = React.useCallback((x: number, y: number) => {
    const radio = 48, inicio = limitar(Math.floor(x - radio), 0, W - 1), fin = limitar(Math.ceil(x + radio), 0, W - 1);
    for (let p = inicio; p <= fin; p += 1) { const d = Math.abs(p - x), profundidad = Math.sqrt(Math.max(0, radio ** 2 - d ** 2)) * .72; terrenoRef.current[p] = limitar(Math.max(terrenoRef.current[p], y + profundidad), 0, H); }
    guardarJugadores(jugadoresRef.current.map(j => { const d = Math.hypot(j.x - x, suelo(terrenoRef.current, j.x) - 10 - y), dano = d < 92 ? Math.round((1 - d / 92) * 58) : 0; return dano ? { ...j, vida: Math.max(0, j.vida - dano) } : j; }));
    balaRef.current = null; dibujar(); window.setTimeout(avanzar, 650);
  }, [avanzar, dibujar, guardarJugadores]);
  const disparar = () => {
    if (!activa || disparando || ganador) return; const j = jugadoresRef.current[turnoRef.current], dir = j.id % 2 === 0 ? 1 : -1, rad = angulo * Math.PI / 180, velocidad = 180 + potencia * 4.1;
    balaRef.current = { x: j.x + Math.cos(rad) * 31 * dir, y: suelo(terrenoRef.current, j.x) - 27 - Math.sin(rad) * 26, vx: Math.cos(rad) * velocidad * dir, vy: -Math.sin(rad) * velocidad, tiempo: performance.now() };
    setDisparando(true); setMensaje("Proyectil en vuelo…");
    const animar = (ahora: number) => { const b = balaRef.current; if (!b) return; const dt = Math.min((ahora - b.tiempo) / 1000, .033); b.tiempo = ahora; b.vx += vientoRef.current * dt; b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -30 || b.x > W + 30 || b.y > H + 30) { balaRef.current = null; setMensaje("El disparo salió del mapa."); avanzar(); return; }
      if (b.y >= suelo(terrenoRef.current, b.x)) { explotar(b.x, b.y); return; } dibujar(); frameRef.current = requestAnimationFrame(animar); };
    frameRef.current = requestAnimationFrame(animar);
  };
  const actual = jugadores[turno];
  return <article className="artilleria-juego">
    <header className="artilleria-cabecera"><div><small>Prototipo táctico · Solo administración</small><h2>CRA Artillería</h2><p>Controla ángulo y potencia. El viento cambia en cada turno.</p></div><div className="artilleria-viento"><span>{viento < 0 ? "←" : viento > 0 ? "→" : "·"}</span><strong>{Math.abs(viento)}</strong><small>VIENTO</small></div></header>
    {!activa && !ganador && <section className="artilleria-preparacion"><strong>Configura la partida</strong><label>Número de jugadores<select value={cantidad} onChange={e => setCantidad(Number(e.target.value))}><option value={2}>2 jugadores</option><option value={3}>3 jugadores</option><option value={4}>4 jugadores</option></select></label><button type="button" onClick={iniciar}>Crear campo de batalla</button></section>}
    {(activa || ganador) && <><div className="artilleria-marcadores">{jugadores.map((j, i) => <div className={`${i === turno && activa ? "activo" : ""} ${j.vida <= 0 ? "eliminado" : ""}`} key={j.id}><i style={{ background: COLORES[j.id] }} /><span><strong>{j.nombre}</strong><small>{j.vida > 0 ? `${j.vida} PV` : "ELIMINADO"}</small></span></div>)}</div>
      <div className="artilleria-lienzo-marco"><canvas ref={canvasRef} width={W} height={H} aria-label="Campo de batalla de CRA Artillería" />{ganador && <div className="artilleria-ganador"><small>PARTIDA FINALIZADA</small><strong>{ganador}</strong><button type="button" onClick={iniciar}>Jugar otra vez</button></div>}</div>
      <section className="artilleria-movimiento"><div><small>MOVIMIENTO</small><strong>{movimiento} m</strong></div><button type="button" onClick={() => mover(-1)} disabled={disparando || !activa || movimiento <= 0}>◀</button><div className="artilleria-movimiento-barra"><i style={{ width: `${movimiento / MOVIMIENTO_POR_TURNO * 100}%` }} /></div><button type="button" onClick={() => mover(1)} disabled={disparando || !activa || movimiento <= 0}>▶</button></section>
      <section className="artilleria-controles"><div className="artilleria-turno"><small>TURNO ACTUAL</small><strong>{actual?.nombre}</strong><span>{mensaje}</span></div><label>Ángulo <output>{angulo}°</output><input type="range" min="10" max="80" value={angulo} disabled={disparando || !activa} onChange={e => setAngulo(Number(e.target.value))} /></label><label>Potencia <output>{potencia}%</output><input type="range" min="20" max="100" value={potencia} disabled={disparando || !activa} onChange={e => setPotencia(Number(e.target.value))} /></label><button type="button" disabled={disparando || !activa} onClick={disparar}>{disparando ? "EN VUELO" : "DISPARAR"}</button></section></>}
  </article>;
};
