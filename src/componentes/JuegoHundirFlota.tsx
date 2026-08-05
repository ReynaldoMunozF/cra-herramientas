import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";
import imagenFurgonBlindado from "../recursos/flota/furgon-blindado-amarillo-v4.png";
import imagenVehiculoAcuda from "../recursos/flota/vehiculo-acuda.png";
import imagenVehiculoIntervencion from "../recursos/flota/vehiculo-intervencion.png";

interface Disparo { celda: number; impacto: boolean; }
interface Sala {
  codigo: string; estado: "espera" | "preparacion" | "en_curso" | "finalizada" | "abandonada";
  jugador: string; rival: string | null; miFlota: number[][]; misDisparos: Disparo[];
  disparosRecibidos: Disparo[]; listo: boolean; rivalListo: boolean; turno: string | null; ganador: string | null;
}
interface Pendiente { codigo: string; jugador1: string; creada_en: number; }
interface Ranking { matricula: string; partidas: number; victorias: number; }
const BARCOS = [3, 3, 2, 2, 2, 1, 1];
const VEHICULOS = [
  { nombre: "Furgón blindado 1", imagen: imagenFurgonBlindado },
  { nombre: "Furgón blindado 2", imagen: imagenFurgonBlindado },
  { nombre: "Intervención 1", imagen: imagenVehiculoIntervencion },
  { nombre: "Intervención 2", imagen: imagenVehiculoIntervencion },
  { nombre: "Intervención 3", imagen: imagenVehiculoIntervencion },
  { nombre: "Acuda pequeño 1", imagen: imagenVehiculoAcuda },
  { nombre: "Acuda pequeño 2", imagen: imagenVehiculoAcuda },
];
const operadores = Array.from(new Map(CUADRANTES.flatMap((c) => c.operadores).map((o) => [o.matricula, o])).values())
  .sort((a, b) => a.matricula === "RMI" ? -1 : b.matricula === "RMI" ? 1 : a.matricula.localeCompare(b.matricula));
const nombre = (matricula: string) => operadores.find((o) => o.matricula === matricula)?.nombre ?? "Operador CRA";

const Tablero: React.FC<{
  tipo: "propio" | "rival"; flota?: number[][]; disparos: Disparo[]; activo?: boolean; alPulsar?: (celda: number) => void;
  previsualizacion?: Array<number[] | null>; alColocar?: (celda: number) => void;
}> = ({ tipo, flota = [], disparos, activo, alPulsar, previsualizacion = [], alColocar }) => {
  const flotaVisible = flota.length ? flota : previsualizacion.filter((vehiculo): vehiculo is number[] => Boolean(vehiculo));
  const barcos = new Set(flota.flat()); const marcadas = new Set(flotaVisible.flat());
  return <div className="flota-cuadricula">
    <div className="flota-columnas" aria-hidden="true">{"ABCDEFGH".split("").map((letra) => <span key={letra}>{letra}</span>)}</div>
    <div className="flota-cuerpo">
      <div className="flota-filas" aria-hidden="true">{Array.from({ length: 8 }, (_, indice) => <span key={indice}>{indice + 1}</span>)}</div>
      <div className={`flota-tablero ${activo ? "turno-activo" : ""}`}>
    {tipo === "propio" && flotaVisible.map((vehiculo, indice) => {
      const inicio = Math.min(...vehiculo); const fila = Math.floor(inicio / 8); const columna = inicio % 8;
      const vertical = vehiculo.length > 1 && vehiculo[1] - vehiculo[0] === 8;
      return <span className={`flota-vehiculo ${vertical ? "vertical" : "horizontal"}`} style={{ left: `${columna * 12.5}%`, top: `${fila * 12.5}%`, width: `${(vertical ? 1 : vehiculo.length) * 12.5}%`, height: `${(vertical ? vehiculo.length : 1) * 12.5}%`, "--longitud": vehiculo.length } as React.CSSProperties} key={`vehiculo-${indice}`}><img src={VEHICULOS[indice]?.imagen} alt={VEHICULOS[indice]?.nombre} /></span>;
    })}
    {Array.from({ length: 64 }, (_, celda) => {
      const tiro = disparos.find((d) => d.celda === celda);
      const clase = tiro ? (tiro.impacto ? "impacto" : "agua") : tipo === "propio" && barcos.has(celda) ? "barco" : marcadas.has(celda) ? "barco" : "";
      return <button type="button" className={clase} disabled={tipo === "rival" ? !activo || Boolean(tiro) : !alColocar}
        onClick={() => tipo === "rival" ? alPulsar?.(celda) : alColocar?.(celda)} key={celda}
        aria-label={`Fila ${Math.floor(celda / 8) + 1}, columna ${celda % 8 + 1}${tiro ? tiro.impacto ? ", impacto" : ", agua" : ""}`}>
        {""}
      </button>;
    })}
      </div>
    </div>
  </div>;
};

/** Juego multijugador de dos operadores con turnos y flotas validados por el servidor. */
export const JuegoHundirFlota: React.FC = () => {
  const [matricula, setMatricula] = React.useState(() => localStorage.getItem("cra-zona-descanso-matricula") ?? "RMI");
  const [codigo, setCodigo] = React.useState(() => localStorage.getItem("cra-flota-sala") ?? "");
  const [entradaCodigo, setEntradaCodigo] = React.useState("");
  const [sala, setSala] = React.useState<Sala | null>(null);
  const [pendientes, setPendientes] = React.useState<Pendiente[]>([]);
  const [ranking, setRanking] = React.useState<Ranking[]>([]);
  const [mensaje, setMensaje] = React.useState("Crea una sala o únete mediante un código privado.");
  const [cargando, setCargando] = React.useState(false);
  const [manual, setManual] = React.useState(false);
  const [horizontal, setHorizontal] = React.useState(true);
  const crearFlotaManualVacia = (): Array<number[] | null> => BARCOS.map(() => null);
  const [flotaManual, setFlotaManual] = React.useState<Array<number[] | null>>(() => crearFlotaManualVacia());
  const [barcoSeleccionado, setBarcoSeleccionado] = React.useState(0);

  const peticion = async (cuerpo: Record<string, unknown>) => {
    const respuesta = await fetch("/api/hundir-flota", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cuerpo, matricula }) });
    const datos = await respuesta.json() as { sala?: Sala; codigo?: string; error?: string; impacto?: boolean; vehiculoHundido?: string | null; victoria?: boolean; abandonada?: boolean };
    if (!respuesta.ok) throw new Error(datos.error || "No se pudo completar la acción.");
    return datos;
  };
  const cargarLobby = React.useCallback(async () => {
    const respuesta = await fetch("/api/hundir-flota", { credentials: "same-origin" });
    if (!respuesta.ok) return;
    const datos = await respuesta.json() as { pendientes?: Pendiente[]; ranking?: Ranking[] };
    setPendientes(datos.pendientes ?? []); setRanking(datos.ranking ?? []);
  }, []);
  const cargarSala = React.useCallback(async (codigoSala: string, silenciosa = false) => {
    if (!codigoSala) return;
    try {
      const respuesta = await fetch(`/api/hundir-flota?codigo=${encodeURIComponent(codigoSala)}&matricula=${encodeURIComponent(matricula)}`, { credentials: "same-origin" });
      const datos = await respuesta.json() as { sala?: Sala; error?: string };
      if (!respuesta.ok || !datos.sala) throw new Error(datos.error || "Sala no disponible.");
      if (datos.sala.estado === "abandonada") {
        setSala(null); setCodigo(""); localStorage.removeItem("cra-flota-sala");
        if (!silenciosa) setMensaje("La partida utilizaba una flota anterior. Crea una sala nueva para jugar con los seis vehículos.");
        return;
      }
      setSala(datos.sala); setCodigo(datos.sala.codigo); localStorage.setItem("cra-flota-sala", datos.sala.codigo);
    } catch (error) {
      if (!silenciosa) setMensaje(error instanceof Error ? error.message : "Sala no disponible.");
    }
  }, [matricula]);

  React.useEffect(() => { localStorage.setItem("cra-zona-descanso-matricula", matricula); }, [matricula]);
  React.useEffect(() => { cargarLobby().catch(() => undefined); }, [cargarLobby]);
  React.useEffect(() => { if (codigo) cargarSala(codigo, true); }, []); // Recupera la última sala al abrir la ventana.
  React.useEffect(() => {
    if (!codigo || !sala || ["finalizada", "abandonada"].includes(sala.estado)) return undefined;
    const intervalo = window.setInterval(() => cargarSala(codigo, true), 1500);
    return () => window.clearInterval(intervalo);
  }, [codigo, sala?.estado, cargarSala]);

  const crear = async () => {
    setCargando(true);
    try { const datos = await peticion({ accion: "crear" }); await cargarSala(datos.codigo!); setMensaje(datos.codigo ? `Sala ${datos.codigo} creada.` : "Sala recuperada."); }
    catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo crear."); } finally { setCargando(false); }
  };
  const unirse = async (codigoSala: string) => {
    setCargando(true);
    try { const datos = await peticion({ accion: "unirse", codigo: codigoSala }); setSala(datos.sala!); setCodigo(datos.sala!.codigo); localStorage.setItem("cra-flota-sala", datos.sala!.codigo); setMensaje("Te has unido a la partida."); }
    catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo unir."); } finally { setCargando(false); }
  };
  const colocar = async (automatica: boolean) => {
    setCargando(true);
    try { const datos = await peticion({ accion: "colocar", codigo, automatica, flota: automatica ? undefined : flotaManual }); setSala(datos.sala!); setManual(false); setMensaje("Flota preparada. Esperando al rival."); }
    catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo colocar."); } finally { setCargando(false); }
  };
  const colocarManual = (inicio: number) => {
    const longitud = BARCOS[barcoSeleccionado];
    const fila = Math.floor(inicio / 8); const columna = inicio % 8;
    if ((horizontal && columna + longitud > 8) || (!horizontal && fila + longitud > 8)) { setMensaje("El vehículo se saldría del tablero."); return; }
    const barco = Array.from({ length: longitud }, (_, i) => inicio + (horizontal ? i : i * 8));
    const ocupadas = new Set(flotaManual.flatMap((barco, indice) => indice === barcoSeleccionado || !barco ? [] : barco));
    if (barco.some((celda) => ocupadas.has(celda))) { setMensaje("Los vehículos no pueden superponerse."); return; }
    setFlotaManual((actual) => {
      const nueva = [...actual]; nueva[barcoSeleccionado] = barco;
      const siguiente = nueva.findIndex((item) => item === null);
      if (siguiente >= 0) setBarcoSeleccionado(siguiente);
      return nueva;
    });
    setMensaje(`${VEHICULOS[barcoSeleccionado].nombre} colocado. Puedes seleccionarlo de nuevo para moverlo.`);
  };
  const disparar = async (celda: number) => {
    setCargando(true);
    try { const datos = await peticion({ accion: "disparar", codigo, celda }); setSala(datos.sala!); setMensaje(datos.victoria ? "¡Has destruido todos los vehículos rivales!" : datos.vehiculoHundido ? `¡Has destruido su ${datos.vehiculoHundido.toLowerCase()}!` : datos.impacto ? "¡Impacto! El vehículo aún no está destruido." : "Agua. Ahora juega el rival."); }
    catch (e) { setMensaje(e instanceof Error ? e.message : "No se pudo disparar."); } finally { setCargando(false); }
  };
  const abandonar = async () => {
    try { await peticion({ accion: "abandonar", codigo }); } catch { /* La salida local continúa. */ }
    setSala(null); setCodigo(""); setFlotaManual(crearFlotaManualVacia()); localStorage.removeItem("cra-flota-sala"); cargarLobby().catch(() => undefined);
  };

  if (!sala) return <>
    <section className="flota-lobby">
      <header><span>Multijugador · 2 operadores</span><h2>Hundir la flota</h2><p>Crea un código privado o entra en una sala pendiente.</p></header>
      <label>Jugador<select value={matricula} onChange={(e) => setMatricula(e.target.value)}>{operadores.map((o) => <option value={o.matricula} key={o.matricula}>{o.matricula} · {o.nombre}</option>)}</select></label>
      <button type="button" className="flota-principal" onClick={crear} disabled={cargando}>Crear partida</button>
      <div className="flota-unirse"><input value={entradaCodigo} onChange={(e) => setEntradaCodigo(e.target.value.toUpperCase())} placeholder="CRA-7K4P" maxLength={8} /><button type="button" onClick={() => unirse(entradaCodigo)} disabled={!entradaCodigo || cargando}>Unirme</button></div>
      <p className="codigo-secreto-mensaje">{mensaje}</p>
      <div className="flota-pendientes"><h3>Salas esperando rival</h3>{pendientes.length ? pendientes.map((p) => <button type="button" onClick={() => unirse(`CRA-${p.codigo}`)} key={p.codigo}><b>CRA-{p.codigo}</b><span>{p.jugador1} · {nombre(p.jugador1)}</span><strong>Unirme</strong></button>) : <p>No hay salas pendientes.</p>}</div>
    </section>
    <aside className="codigo-secreto-ranking"><header><span>Clasificación compartida</span><h2>Capitanes destacados</h2></header>{ranking.length ? <ol>{ranking.map((r, i) => <li key={r.matricula}><span>{i + 1}</span><div><strong>{r.matricula}</strong><small>{nombre(r.matricula)}</small></div><p><strong>{r.victorias} victorias</strong><small>{r.partidas} partidas</small></p></li>)}</ol> : <p className="ranking-vacio">Todavía no hay partidas finalizadas.</p>}</aside>
  </>;

  const enTurno = sala.estado === "en_curso" && sala.turno === matricula && !cargando;
  if (sala.estado === "espera") return <section className="flota-espera"><span>CÓDIGO DE SALA</span><h2>{sala.codigo}</h2><p>Comparte este código con otro operador. La sala caduca en 15 minutos si nadie se une.</p><button type="button" onClick={() => navigator.clipboard.writeText(sala.codigo)}>Copiar código</button><button type="button" className="secundario" onClick={abandonar}>Cancelar sala</button></section>;

  return <section className="flota-partida">
    <header><div><span>{sala.codigo}</span><h2>{matricula} contra {sala.rival ?? "Esperando rival"}</h2></div><button type="button" onClick={abandonar}>Abandonar</button></header>
    {sala.estado === "preparacion" && !sala.listo && <div className="flota-preparacion"><h3>Prepara tus vehículos</h3><p>1 furgón blindado, 3 coches de intervención y 2 acudas pequeños.</p><div className="flota-modos"><button type="button" onClick={() => colocar(true)} disabled={cargando}>Colocación automática</button><button type="button" onClick={() => { setManual(true); setFlotaManual(crearFlotaManualVacia()); setBarcoSeleccionado(0); }}>Colocación manual</button></div>{manual && <div className="flota-manual"><div className="flota-selector-barcos">{BARCOS.map((longitud, indice) => <button type="button" className={`${barcoSeleccionado === indice ? "seleccionado" : ""} ${flotaManual[indice] ? "colocado" : ""}`} onClick={() => setBarcoSeleccionado(indice)} key={indice}><span>{VEHICULOS[indice].nombre}</span><img src={VEHICULOS[indice].imagen} alt="" /><small>{flotaManual[indice] ? "Colocado · mover" : `${longitud} ${longitud === 1 ? "casilla" : "casillas"}`}</small></button>)}</div><div className="flota-orientacion"><b>Orientación del vehículo</b><button type="button" onClick={() => setHorizontal(!horizontal)} disabled={BARCOS[barcoSeleccionado] === 1}>{BARCOS[barcoSeleccionado] === 1 ? "Una casilla" : horizontal ? "↔ Horizontal" : "↕ Vertical"}</button></div><Tablero tipo="propio" disparos={[]} previsualizacion={flotaManual} alColocar={colocarManual} /><div className="flota-manual-acciones"><button type="button" onClick={() => { setFlotaManual(crearFlotaManualVacia()); setBarcoSeleccionado(0); }}>Reiniciar</button><button type="button" onClick={() => colocar(false)} disabled={flotaManual.some((barco) => barco === null)}>Confirmar vehículos</button></div></div>}</div>}
    {sala.estado === "preparacion" && sala.listo && <div className="flota-esperando"><span>✓</span><h3>Tu flota está preparada</h3><p>{sala.rivalListo ? "Iniciando batalla…" : "Esperando que el rival coloque sus barcos."}</p></div>}
    {sala.estado === "en_curso" && <><p className={`flota-turno ${enTurno ? "mio" : "rival"}`}>{enTurno ? "Tu turno: selecciona una casilla del rival" : `Turno de ${sala.turno}`}</p><div className="flota-tableros"><div><h3>Tu flota</h3><Tablero tipo="propio" flota={sala.miFlota} disparos={sala.disparosRecibidos} /></div><div><h3>Aguas del rival</h3><Tablero tipo="rival" disparos={sala.misDisparos} activo={enTurno} alPulsar={disparar} /></div></div></>}
    {sala.estado === "finalizada" && <div className={`flota-resultado ${sala.ganador === matricula ? "victoria" : "derrota"}`}><span>{sala.ganador === matricula ? "★" : "×"}</span><h3>{sala.ganador === matricula ? "¡Victoria!" : "Partida finalizada"}</h3><p>{sala.ganador === matricula ? "Has hundido la flota rival." : `${sala.ganador} ha ganado la partida.`}</p><button type="button" onClick={abandonar}>Volver al lobby</button></div>}
    <p className="codigo-secreto-mensaje">{mensaje}</p>
  </section>;
};
