import React from "react";

const W = 1200, H = 620, G = 170;
const MOVIMIENTO_POR_TURNO = 70;
const COLORES = ["#30c7f2", "#ff9d34", "#98dc43", "#bd75ff"];
type Jugador = { id: number; nombre: string; x: number; vida: number };
type Bala = { x: number; y: number; vx: number; vy: number; tiempo: number; giro: number; tirador: number; estela: Array<{ x: number; y: number }> };
type Explosion = { x: number; y: number; progreso: number; particulas: Array<{ dx: number; dy: number; tam: number }> };
const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const crearTerreno = () => Array.from({ length: W }, (_, x) =>
  limitar(438 + Math.sin(x / 105) * 55 + Math.sin(x / 43) * 19 + Math.cos(x / 205) * 38 + Math.sin(x / 17) * 4, 330, 535));
const suelo = (terreno: number[], x: number) => terreno[limitar(Math.round(x), 0, W - 1)] ?? H;
const distanciaASegmento = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => { const dx = bx - ax, dy = by - ay, largo2 = dx * dx + dy * dy, t = largo2 ? limitar(((px - ax) * dx + (py - ay) * dy) / largo2, 0, 1) : 0, x = ax + t * dx, y = ay + t * dy; return { distancia: Math.hypot(px - x, py - y), x, y }; };

const servidorArtilleria = () => ((globalThis as typeof globalThis & { __CRA_SOCIAL_WS_URL__?: string }).__CRA_SOCIAL_WS_URL__ ?? (window.location.hostname === "localhost" ? "ws://localhost:8787" : "wss://cra-social-server.reynaldo-munozf21.workers.dev"));
type ParticipanteSala = { id: string; nombre: string; anfitrion?: boolean };

export const JuegoArtilleria: React.FC<{ nombreJugador?: string }> = ({ nombreJugador = "Jugador" }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const terrenoRef = React.useRef(crearTerreno());
  const jugadoresRef = React.useRef<Jugador[]>([]);
  const balaRef = React.useRef<Bala | null>(null);
  const explosionRef = React.useRef<Explosion | null>(null);
  const vientoRef = React.useRef(0);
  const semillaSalaRef = React.useRef(1);
  const turnoRef = React.useRef(0);
  const movimientoRef = React.useRef(MOVIMIENTO_POR_TURNO);
  const frameRef = React.useRef<number | null>(null);
  const cargaFrameRef = React.useRef<number | null>(null);
  const socketSalaRef = React.useRef<WebSocket | null>(null);
  const iniciarSalaRef = React.useRef<(nombres: string[]) => void>(() => undefined);
  const accionSalaRef = React.useRef<(datos: { jugadorId?: string; accion?: string; valor?: number; angulo?: number }) => void>(() => undefined);
  const potenciaRef = React.useRef(62);
  const cargandoRef = React.useRef(false);
  const [cantidad, setCantidad] = React.useState(2);
  const [jugadores, setJugadores] = React.useState<Jugador[]>([]);
  const [turno, setTurno] = React.useState(0);
  const [angulo, setAngulo] = React.useState(45);
  const [potencia, setPotencia] = React.useState(62);
  const [viento, setViento] = React.useState(0);
  const [movimiento, setMovimiento] = React.useState(MOVIMIENTO_POR_TURNO);
  const [activa, setActiva] = React.useState(false);
  const [disparando, setDisparando] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState("Elige cuántos jugadores participarán.");
  const [ganador, setGanador] = React.useState("");
  const [codigoSala, setCodigoSala] = React.useState("");
  const [codigoEntrada, setCodigoEntrada] = React.useState("");
  const [participantesSala, setParticipantesSala] = React.useState<ParticipanteSala[]>([]);
  const [propioIdSala, setPropioIdSala] = React.useState("");
  const [estadoSala, setEstadoSala] = React.useState("Crea una sala o introduce un código para unirte.");

  const guardarJugadores = React.useCallback((lista: Jugador[]) => {
    jugadoresRef.current = lista; setJugadores([...lista]);
  }, []);
  const dibujar = React.useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const cielo = ctx.createLinearGradient(0, 0, 0, H);
    cielo.addColorStop(0, "#07162e"); cielo.addColorStop(.58, "#123b5d"); cielo.addColorStop(1, "#275e70");
    ctx.fillStyle = cielo; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    for (let i = 0; i < 34; i += 1) { const sx = (i * 181 + 47) % W, sy = (i * 73 + 31) % 250; ctx.beginPath(); ctx.arc(sx, sy, i % 7 === 0 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill(); }
    const luna = ctx.createRadialGradient(980, 105, 4, 980, 105, 64); luna.addColorStop(0, "#fffbd8"); luna.addColorStop(.35, "#d9f4ff"); luna.addColorStop(1, "#9ddfff00"); ctx.fillStyle = luna; ctx.beginPath(); ctx.arc(980, 105, 64, 0, Math.PI * 2); ctx.fill();
    // Montañas lejanas para dar profundidad al escenario.
    ctx.fillStyle = "#16364d"; ctx.beginPath(); ctx.moveTo(0, 390);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 350 + Math.sin(x / 115) * 45 + Math.cos(x / 47) * 18);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = "#214d54"; ctx.beginPath(); ctx.moveTo(0, 430); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 405 + Math.sin(x / 72) * 25 + Math.cos(x / 31) * 10); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    const trazarTerreno = (desfase = 0) => { ctx.beginPath(); ctx.moveTo(0, H); terrenoRef.current.forEach((y, x) => ctx.lineTo(x, y + desfase)); ctx.lineTo(W, H); ctx.closePath(); };
    trazarTerreno();
    const tierra = ctx.createLinearGradient(0, 320, 0, H); tierra.addColorStop(0, "#a6dc54"); tierra.addColorStop(.045, "#4d8a3b"); tierra.addColorStop(.16, "#6d5032"); tierra.addColorStop(.62, "#3b3027"); tierra.addColorStop(1, "#201f1d"); ctx.fillStyle = tierra; ctx.fill();
    // Borde de césped y pequeñas irregularidades visuales.
    ctx.strokeStyle = "#d4f075"; ctx.lineWidth = 6; ctx.beginPath(); terrenoRef.current.forEach((y, x) => x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
    ctx.strokeStyle = "#568f3d"; ctx.lineWidth = 3; ctx.beginPath(); terrenoRef.current.forEach((y, x) => x === 0 ? ctx.moveTo(x, y + 6) : ctx.lineTo(x, y + 6)); ctx.stroke();
    ctx.strokeStyle = "#b9e967"; ctx.lineWidth = 1; for (let x = 8; x < W; x += 13) { const y = suelo(terrenoRef.current, x); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 5 - x % 4); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 4); ctx.stroke(); }
    ctx.fillStyle = "rgba(221,190,125,.2)";
    for (let i = 0; i < 95; i += 1) { const x = (i * 137 + 29) % W, y = suelo(terrenoRef.current, x) + 18 + (i * 31) % 120; ctx.beginPath(); ctx.ellipse(x, y, 2 + i % 5, 1 + i % 3, i, 0, Math.PI * 2); ctx.fill(); }
    jugadoresRef.current.forEach((j, i) => {
      if (j.vida <= 0) return; const y = suelo(terrenoRef.current, j.x) - 21; ctx.save(); ctx.translate(j.x, y);
      const activo = i === turnoRef.current && !balaRef.current, dir = j.id % 2 === 0 ? 1 : -1, rad = angulo * Math.PI / 180;
      // Barra de vida.
      ctx.fillStyle = "rgba(7,12,22,.78)"; ctx.beginPath(); ctx.roundRect(-30, -46, 60, 8, 4); ctx.fill(); ctx.fillStyle = j.vida > 65 ? "#54e892" : "#ff6262"; ctx.beginPath(); ctx.roundRect(-29, -45, 58 * j.vida / 150, 6, 3); ctx.fill();
      // Vehículo compacto con orugas, blindaje, luces y volumen.
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(0, 23, 32, 6, 0, 0, Math.PI * 2); ctx.fill();
      const oruga = ctx.createLinearGradient(0, 4, 0, 23); oruga.addColorStop(0, "#3f4b58"); oruga.addColorStop(.45, "#151d27"); oruga.addColorStop(1, "#070b11"); ctx.fillStyle = oruga; ctx.beginPath(); ctx.roundRect(-31, 3, 62, 21, 9); ctx.fill(); ctx.strokeStyle = "#72808d"; ctx.lineWidth = 2; ctx.stroke();
      [-21, -8, 8, 21].forEach(cx => { ctx.fillStyle = "#202c38"; ctx.beginPath(); ctx.arc(cx, 13, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#82909c"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = "#9ba8b1"; ctx.beginPath(); ctx.arc(cx, 13, 2.3, 0, Math.PI * 2); ctx.fill(); });
      const chasis = ctx.createLinearGradient(-20, -12, 20, 8); chasis.addColorStop(0, COLORES[j.id]); chasis.addColorStop(.55, COLORES[j.id]); chasis.addColorStop(1, "#253b4a"); ctx.fillStyle = chasis; ctx.beginPath(); ctx.moveTo(-26, 5); ctx.lineTo(-18, -12); ctx.lineTo(17, -12); ctx.lineTo(27, 5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#d8f5ff88"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.32)"; ctx.beginPath(); ctx.roundRect(-14, -9, 22, 4, 2); ctx.fill(); ctx.fillStyle = "#ffe47a"; ctx.beginPath(); ctx.arc(dir * 20, 0, 3, 0, Math.PI * 2); ctx.fill();
      // Torreta y cañón.
      ctx.fillStyle = COLORES[j.id]; ctx.beginPath(); ctx.arc(0, -13, 15, Math.PI, 0); ctx.lineTo(15, -8); ctx.lineTo(-15, -8); ctx.fill(); ctx.strokeStyle = "#d8f5ff77"; ctx.stroke();
      ctx.strokeStyle = "#dce8ec"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(dir * 5, -16); ctx.lineTo(Math.cos(rad) * 39 * dir, -16 - Math.sin(rad) * 39); ctx.stroke(); ctx.strokeStyle = "#5c6974"; ctx.lineWidth = 4; ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "#fff"; ctx.font = `800 ${activo ? 15 : 13}px Segoe UI`; ctx.textAlign = "center"; ctx.shadowColor = "#000"; ctx.shadowBlur = 4; ctx.fillText(j.nombre, 0, -54); ctx.shadowBlur = 0; ctx.restore();
    });
    if (balaRef.current) { const b = balaRef.current; b.estela.forEach((p, i) => { ctx.fillStyle = `rgba(255,173,67,${(i + 1) / b.estela.length * .32})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1 + i / b.estela.length * 2.5, 0, Math.PI * 2); ctx.fill(); }); ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.giro); ctx.shadowColor = "#ff9c31"; ctx.shadowBlur = 18; const proyectil = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8); proyectil.addColorStop(0, "#fff8bd"); proyectil.addColorStop(.35, "#ffc14e"); proyectil.addColorStop(1, "#b74616"); ctx.fillStyle = proyectil; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff1a4"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
    if (explosionRef.current) { const e = explosionRef.current, p = e.progreso, radio = 14 + Math.sin(Math.min(1, p) * Math.PI / 2) * 62; ctx.save(); ctx.globalCompositeOperation = "lighter"; const fuego = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, radio); fuego.addColorStop(0, `rgba(255,255,225,${1 - p * .45})`); fuego.addColorStop(.24, `rgba(255,224,75,${1 - p * .55})`); fuego.addColorStop(.62, `rgba(255,91,24,${1 - p * .7})`); fuego.addColorStop(1, "rgba(104,31,9,0)"); ctx.fillStyle = fuego; ctx.beginPath(); ctx.arc(e.x, e.y, radio, 0, Math.PI * 2); ctx.fill(); ctx.restore(); e.particulas.forEach((q, i) => { const avance = Math.min(1, p * 1.35), px = e.x + q.dx * avance, py = e.y + q.dy * avance + 58 * avance * avance; ctx.fillStyle = i % 3 === 0 ? `rgba(255,190,55,${1 - p})` : `rgba(91,65,43,${1 - p * .8})`; ctx.beginPath(); ctx.arc(px, py, q.tam * (1 - p * .35), 0, Math.PI * 2); ctx.fill(); }); ctx.strokeStyle = `rgba(255,231,138,${1 - p})`; ctx.lineWidth = 5 * (1 - p * .6); ctx.beginPath(); ctx.arc(e.x, e.y, radio * 1.18, 0, Math.PI * 2); ctx.stroke(); }
  }, [angulo, potencia, viento]);
  React.useEffect(dibujar, [dibujar, jugadores, turno]);
  React.useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); if (cargaFrameRef.current !== null) cancelAnimationFrame(cargaFrameRef.current); }, []);
  const cambiarViento = () => { const pseudo = Math.sin(semillaSalaRef.current + turnoRef.current * 97.31) * 43758.5453, valor = Math.round(((pseudo - Math.floor(pseudo)) * 2 - 1) * 32); vientoRef.current = valor; setViento(valor); };

  const iniciar = (nombresSala?: string[]) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const nombres = nombresSala?.length ? nombresSala.slice(0, 4) : Array.from({ length: cantidad }, (_, id) => `Jugador ${id + 1}`), total = nombres.length;
    terrenoRef.current = crearTerreno(); balaRef.current = null; explosionRef.current = null; turnoRef.current = 0; setTurno(0); movimientoRef.current = MOVIMIENTO_POR_TURNO; setMovimiento(MOVIMIENTO_POR_TURNO);
    setCantidad(total); guardarJugadores(nombres.map((nombre, id) => ({ id, nombre, x: [115, 430, 765, 1080][id], vida: 150 })));
    potenciaRef.current = 20; setAngulo(45); setPotencia(20); setGanador(""); setDisparando(false); setCargando(false); setActiva(true); setMensaje("Mantén pulsado el botón para cargar el disparo."); cambiarViento();
  };
  iniciarSalaRef.current = iniciar;
  const conectarSala = (codigo: string) => {
    const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); if (limpio.length < 4) { setEstadoSala("El código debe tener entre 4 y 6 caracteres."); return; }
    socketSalaRef.current?.close(); setCodigoSala(limpio); setParticipantesSala([]); setEstadoSala("Conectando con la sala…"); const socket = new WebSocket(`${servidorArtilleria()}/artilleria/${limpio}`); socketSalaRef.current = socket;
    socket.onopen = () => socket.send(JSON.stringify({ tipo: "entrar_artilleria", nombre: nombreJugador }));
    socket.onmessage = evento => { const datos = JSON.parse(evento.data) as { tipo?: string; id?: string; participantes?: ParticipanteSala[]; mensaje?: string; jugadorId?: string; accion?: string; valor?: number; angulo?: number; semilla?: number }; if (datos.tipo === "identidad_artilleria") setPropioIdSala(datos.id ?? ""); if (datos.tipo === "estado_artilleria") { setParticipantesSala(datos.participantes ?? []); setEstadoSala("Sala conectada. Comparte el código con los demás."); } if (datos.tipo === "partida_artilleria") { semillaSalaRef.current = Number(datos.semilla) || 1; iniciarSalaRef.current((datos.participantes ?? []).map(p => p.nombre)); } if (datos.tipo === "accion_artilleria") accionSalaRef.current(datos); if (datos.tipo === "error_artilleria") setEstadoSala(datos.mensaje ?? "No se pudo entrar."); };
    socket.onerror = () => setEstadoSala("No se pudo conectar con la sala."); socket.onclose = () => { if (!activa) setEstadoSala("Te has desconectado de la sala."); };
  };
  const crearSala = () => { const codigo = Math.random().toString(36).slice(2, 8).toUpperCase(); setCodigoEntrada(codigo); conectarSala(codigo); };
  const soyAnfitrion = participantesSala.some(p => p.id === propioIdSala && p.anfitrion);
  const esMiTurno = participantesSala[turno]?.id === propioIdSala;
  const cambiarAngulo = (valor: number) => { const ajustado = limitar(valor, 10, 80); setAngulo(ajustado); socketSalaRef.current?.send(JSON.stringify({ tipo: "accion_artilleria", accion: "angulo", valor: ajustado })); };
  const avanzar = React.useCallback(() => {
    const vivos = jugadoresRef.current.filter(j => j.vida > 0);
    if (vivos.length <= 1) { const nombre = vivos[0]?.nombre ?? "Nadie"; setGanador(nombre); setActiva(false); setDisparando(false); setMensaje(`${nombre} gana la partida.`); dibujar(); return; }
    let siguiente = turnoRef.current; do siguiente = (siguiente + 1) % jugadoresRef.current.length; while (jugadoresRef.current[siguiente].vida <= 0);
    turnoRef.current = siguiente; setTurno(siguiente); movimientoRef.current = MOVIMIENTO_POR_TURNO; setMovimiento(MOVIMIENTO_POR_TURNO); potenciaRef.current = 20; setPotencia(20); cambiarViento(); setDisparando(false); setMensaje(`${jugadoresRef.current[siguiente].nombre}, ajusta y mantén pulsado para disparar.`); dibujar();
  }, [dibujar]);
  const mover = (direccion: -1 | 1, remoto = false) => {
    if (!activa || disparando || movimientoRef.current <= 0) return;
    const actual = jugadoresRef.current[turnoRef.current]; if (!actual) return;
    const paso = Math.min(7, movimientoRef.current), destino = limitar(actual.x + paso * direccion, 35, W - 35), distancia = Math.abs(destino - actual.x);
    if (!distancia) return;
    if (Math.abs(suelo(terrenoRef.current, destino) - suelo(terrenoRef.current, actual.x)) > 14) { setMensaje("La pendiente es demasiado pronunciada."); return; }
    if (jugadoresRef.current.some(j => j.id !== actual.id && j.vida > 0 && Math.abs(j.x - destino) < 52)) { setMensaje("Hay otro carro bloqueando el paso."); return; }
    guardarJugadores(jugadoresRef.current.map(j => j.id === actual.id ? { ...j, x: destino } : j));
    movimientoRef.current -= distancia; setMovimiento(movimientoRef.current);
    setMensaje(movimientoRef.current > 0 ? `Movimiento restante: ${movimientoRef.current} m.` : "Movimiento agotado. Prepara el disparo.");
    if (!remoto) socketSalaRef.current?.send(JSON.stringify({ tipo: "accion_artilleria", accion: "mover", valor: direccion }));
  };
  const explotar = React.useCallback((x: number, y: number) => {
    balaRef.current = null;
    explosionRef.current = { x, y, progreso: 0, particulas: Array.from({ length: 30 }, (_, i) => { const a = Math.PI * (1.08 + .84 * (i / 29)), fuerza = 28 + (i * 37) % 72; return { dx: Math.cos(a) * fuerza, dy: Math.sin(a) * fuerza, tam: 2 + i % 5 }; }) };
    setMensaje("¡Impacto!"); const inicioAnimacion = performance.now();
    const animarImpacto = (ahora: number) => { const e = explosionRef.current; if (!e) return; e.progreso = limitar((ahora - inicioAnimacion) / 720, 0, 1); dibujar(); if (e.progreso < 1) { frameRef.current = requestAnimationFrame(animarImpacto); return; }
      explosionRef.current = null; const radio = 48, inicio = limitar(Math.floor(x - radio), 0, W - 1), fin = limitar(Math.ceil(x + radio), 0, W - 1);
      guardarJugadores(jugadoresRef.current.map(j => { const d = Math.hypot(j.x - x, suelo(terrenoRef.current, j.x) - 10 - y), dano = d < 92 ? Math.round((1 - d / 92) * 58) : 0; return dano ? { ...j, vida: Math.max(0, j.vida - dano) } : j; }));
      for (let p = inicio; p <= fin; p += 1) { const d = Math.abs(p - x), profundidad = Math.sqrt(Math.max(0, radio ** 2 - d ** 2)) * .72; terrenoRef.current[p] = limitar(Math.max(terrenoRef.current[p], y + profundidad), 0, H); }
      dibujar(); window.setTimeout(avanzar, 500);
    }; frameRef.current = requestAnimationFrame(animarImpacto);
  }, [avanzar, dibujar, guardarJugadores]);
  const disparar = (potenciaDisparo = potenciaRef.current, anguloDisparo = angulo) => {
    if (!activa || disparando || ganador) return; const j = jugadoresRef.current[turnoRef.current], dir = j.id % 2 === 0 ? 1 : -1, rad = anguloDisparo * Math.PI / 180, velocidad = 180 + potenciaDisparo * 4.1;
    balaRef.current = { x: j.x + Math.cos(rad) * 31 * dir, y: suelo(terrenoRef.current, j.x) - 27 - Math.sin(rad) * 26, vx: Math.cos(rad) * velocidad * dir, vy: -Math.sin(rad) * velocidad, tiempo: performance.now(), giro: 0, tirador: j.id, estela: [] };
    setDisparando(true); setMensaje("Proyectil en vuelo…");
    const animar = (ahora: number) => { const b = balaRef.current; if (!b) return; const dt = Math.min((ahora - b.tiempo) / 1000, .033), anteriorX = b.x, anteriorY = b.y; b.tiempo = ahora; b.estela.push({ x: b.x, y: b.y }); if (b.estela.length > 18) b.estela.shift(); b.giro = Math.atan2(b.vy, b.vx); b.vx += vientoRef.current * dt; b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -30 || b.x > W + 30 || b.y > H + 30) { balaRef.current = null; setMensaje("El disparo salió del mapa."); avanzar(); return; }
      const impactoVehiculo = jugadoresRef.current.filter(objetivo => objetivo.vida > 0 && objetivo.id !== b.tirador).map(objetivo => { const centroY = suelo(terrenoRef.current, objetivo.x) - 13; return { objetivo, choque: distanciaASegmento(objetivo.x, centroY, anteriorX, anteriorY, b.x, b.y) }; }).find(({ choque }) => choque.distancia <= 27);
      if (impactoVehiculo) { explotar(impactoVehiculo.choque.x, impactoVehiculo.choque.y); return; }
      if (b.y >= suelo(terrenoRef.current, b.x)) { explotar(b.x, b.y); return; } dibujar(); frameRef.current = requestAnimationFrame(animar); };
    frameRef.current = requestAnimationFrame(animar);
  };
  const iniciarCarga = (evento?: React.PointerEvent<HTMLButtonElement>) => {
    if (!activa || !esMiTurno || disparando || ganador || cargandoRef.current) return; evento?.currentTarget.setPointerCapture(evento.pointerId); cargandoRef.current = true; setCargando(true); potenciaRef.current = 20; setPotencia(20); setMensaje("Cargando potencia… suelta para disparar."); const inicioCarga = performance.now();
    const cargar = (ahora: number) => { if (!cargandoRef.current) return; const valor = limitar(20 + (ahora - inicioCarga) / 40, 20, 100); potenciaRef.current = valor; setPotencia(Math.round(valor)); if (valor < 100) cargaFrameRef.current = requestAnimationFrame(cargar); else { cargaFrameRef.current = null; setMensaje("Potencia máxima: suelta para disparar."); } }; cargaFrameRef.current = requestAnimationFrame(cargar);
  };
  const soltarCarga = () => {
    if (!cargandoRef.current) return; cargandoRef.current = false; setCargando(false); if (cargaFrameRef.current !== null) cancelAnimationFrame(cargaFrameRef.current); cargaFrameRef.current = null; const valor = Math.round(potenciaRef.current); socketSalaRef.current?.send(JSON.stringify({ tipo: "accion_artilleria", accion: "disparar", valor, angulo })); disparar(valor, angulo);
  };
  accionSalaRef.current = datos => { if (datos.jugadorId === propioIdSala) return; if (datos.accion === "mover" && (datos.valor === -1 || datos.valor === 1)) mover(datos.valor, true); if (datos.accion === "angulo" && Number.isFinite(datos.valor)) setAngulo(limitar(Number(datos.valor), 10, 80)); if (datos.accion === "disparar" && Number.isFinite(datos.valor) && Number.isFinite(datos.angulo)) { setAngulo(Number(datos.angulo)); setPotencia(Number(datos.valor)); potenciaRef.current = Number(datos.valor); disparar(Number(datos.valor), Number(datos.angulo)); } };
  const actual = jugadores[turno];
  return <article className="artilleria-juego">
    <header className="artilleria-cabecera"><div><small>Prototipo táctico · Solo administración</small><h2>CRA Artillería</h2><p>Controla ángulo y potencia. El viento cambia en cada turno.</p></div><div className="artilleria-viento"><span>{viento < 0 ? "←" : viento > 0 ? "→" : "·"}</span><strong>{Math.abs(viento)}</strong><small>VIENTO</small></div></header>
    {!activa && !ganador && <section className="artilleria-lobby"><header><small>MULTIJUGADOR · 2 A 4 JUGADORES</small><h3>Sala de batalla</h3><p>{estadoSala}</p></header>{!codigoSala ? <div className="artilleria-lobby-acceso"><button type="button" onClick={crearSala}>Crear una sala</button><span>o</span><label>Código de sala<input value={codigoEntrada} maxLength={6} placeholder="ABC123" onChange={e => setCodigoEntrada(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}/></label><button type="button" disabled={codigoEntrada.length < 4} onClick={() => conectarSala(codigoEntrada)}>Unirme</button></div> : <div className="artilleria-sala"><div className="artilleria-codigo"><small>CÓDIGO DE SALA</small><strong>{codigoSala}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(codigoSala)}>Copiar</button></div><div className="artilleria-participantes">{participantesSala.map((p, i) => <article key={p.id}><i style={{ background: COLORES[i] }}>{i + 1}</i><span><strong>{p.nombre}</strong><small>{p.anfitrion ? "Anfitrión" : "Preparado"}</small></span></article>)}{Array.from({ length: Math.max(0, 4 - participantesSala.length) }, (_, i) => <article className="vacio" key={`vacio-${i}`}><i>+</i><span><strong>Esperando…</strong><small>Plaza disponible</small></span></article>)}</div>{soyAnfitrion ? <button className="artilleria-iniciar-sala" type="button" disabled={participantesSala.length < 2} onClick={() => socketSalaRef.current?.send(JSON.stringify({ tipo: "iniciar_artilleria" }))}>Iniciar batalla con {participantesSala.length} jugadores</button> : <p>Esperando a que el anfitrión inicie la batalla…</p>}</div>}</section>}
    {(activa || ganador) && <><div className="artilleria-marcadores">{jugadores.map((j, i) => <div className={`${i === turno && activa ? "activo" : ""} ${j.vida <= 0 ? "eliminado" : ""}`} key={j.id}><i style={{ background: COLORES[j.id] }} /><span><strong>{j.nombre}</strong><small>{j.vida > 0 ? `${j.vida} PV` : "ELIMINADO"}</small></span></div>)}</div>
      <div className="artilleria-lienzo-marco"><canvas ref={canvasRef} width={W} height={H} aria-label="Campo de batalla de CRA Artillería" />{ganador && <div className="artilleria-ganador"><small>PARTIDA FINALIZADA</small><strong>{ganador}</strong><button type="button" onClick={() => iniciar(participantesSala.map(p => p.nombre))}>Jugar otra vez</button></div>}</div>
      <section className="artilleria-movimiento"><div><small>MOVIMIENTO</small><strong>{movimiento} m</strong></div><button type="button" onClick={() => mover(-1)} disabled={!esMiTurno || disparando || cargando || !activa || movimiento <= 0}>◀</button><div className="artilleria-movimiento-barra"><i style={{ width: `${movimiento / MOVIMIENTO_POR_TURNO * 100}%` }} /></div><button type="button" onClick={() => mover(1)} disabled={!esMiTurno || disparando || cargando || !activa || movimiento <= 0}>▶</button></section>
      <section className="artilleria-controles"><div className="artilleria-turno"><small>TURNO ACTUAL</small><strong>{actual?.nombre}</strong><span>{esMiTurno ? mensaje : `Esperando el turno de ${actual?.nombre ?? "otro jugador"}.`}</span></div><div className="artilleria-dial"><small>ÁNGULO DE TIRO</small><div className="artilleria-dial-visor"><i style={{ transform: `rotate(${-angulo}deg)` }} /><b>{angulo}°</b></div><div className="artilleria-ajuste"><button type="button" disabled={!esMiTurno || disparando || !activa || angulo <= 10} onClick={() => cambiarAngulo(angulo - 1)}>−</button><input aria-label="Ángulo" type="range" min="10" max="80" value={angulo} disabled={!esMiTurno || disparando || !activa || cargando} onChange={e => cambiarAngulo(Number(e.target.value))} /><button type="button" disabled={!esMiTurno || disparando || !activa || angulo >= 80} onClick={() => cambiarAngulo(angulo + 1)}>+</button></div></div><div className={`artilleria-potencia ${cargando ? "cargando" : ""}`}><span>Potencia</span><output>{potencia}%</output><div className="artilleria-potencia-carga"><i style={{ width: `${potencia}%` }} /></div><small>{esMiTurno ? "MANTÉN PULSADO" : "ESPERANDO TURNO"}</small></div><button className={`artilleria-disparar ${cargando ? "cargando" : ""}`} type="button" disabled={!esMiTurno || disparando || !activa} onPointerDown={iniciarCarga} onPointerUp={soltarCarga} onPointerCancel={soltarCarga} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); iniciarCarga(); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); soltarCarga(); } }}>{disparando ? "EN VUELO" : cargando ? "⚡ SUELTA" : "🔥 MANTÉN"}</button></section></>}
  </article>;
};
