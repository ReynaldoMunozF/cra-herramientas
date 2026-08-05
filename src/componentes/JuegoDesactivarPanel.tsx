import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";

type Dificultad = "facil" | "media" | "dificil";
type Modulo = "cables" | "secuencia" | "memoria" | "interruptores";
interface Resultado { matricula: string; segundos: number; puntos: number; dificultad: Dificultad; fecha: number; }
interface Configuracion {
  modulos: Modulo[]; cables: string[]; cableCorrecto: number; reglaCable: string;
  serie: number; secuencia: number[]; solucionSecuencia: number; pistaSecuencia: string; pistasCodigo: string[];
  patron: number[]; interruptores: boolean[]; solucionInterruptores: boolean[];
}

const operadores = Array.from(new Map(CUADRANTES.flatMap((c) => c.operadores).map((o) => [o.matricula, o])).values());
const CLAVE_RANKING = "cra-ranking-desactivar-panel-v2";
const CLAVE_MATRICULA = "cra-zona-descanso-matricula";
const COLORES = ["rojo", "amarillo", "azul", "verde", "blanco", "morado"];
const AJUSTES = {
  facil: { nombre: "Fácil", modulos: 3, vidas: 3, pistas: 2, penalizacion: 8, multiplicador: 1 },
  media: { nombre: "Media", modulos: 4, vidas: 3, pistas: 1, penalizacion: 12, multiplicador: 1.5 },
  dificil: { nombre: "Difícil", modulos: 4, vidas: 2, pistas: 0, penalizacion: 18, multiplicador: 2 },
};

const aleatorio = (maximo: number) => Math.floor(Math.random() * maximo);
const barajar = <T,>(valores: T[]) => [...valores].sort(() => Math.random() - .5);
const tiempo = (valor: number) => `${String(Math.floor(valor / 60)).padStart(2, "0")}:${String(valor % 60).padStart(2, "0")}`;
const leerRanking = (): Resultado[] => { try { return JSON.parse(localStorage.getItem(CLAVE_RANKING) ?? "[]"); } catch { return []; } };

const crearConfiguracion = (dificultad: Dificultad): Configuracion => {
  const cantidad = dificultad === "facil" ? 4 : dificultad === "media" ? 5 : 6;
  const cables = barajar(COLORES).slice(0, cantidad);
  const serie = 100 + aleatorio(900);
  const contieneAmarillo = cables.includes("amarillo");
  const cableCorrecto = contieneAmarillo && serie % 2 === 0
    ? cables.indexOf("amarillo")
    : serie % 2 !== 0 && cables.includes("azul") ? cables.indexOf("azul") : cables.length - 1;
  const reglaCable = "Si el número de serie es par y hay cable amarillo, córtalo. Si es impar y hay azul, corta el azul. En cualquier otro caso, corta el último cable.";
  const bancoDigitos = barajar([
    { valor: 2, pista: "La mitad de cuatro" },
    { valor: 3, pista: "Lados de un triángulo" },
    { valor: 4, pista: "Estaciones del año" },
    { valor: 5, pista: "Dedos de una mano" },
    { valor: 6, pista: "Una docena dividida entre dos" },
    { valor: 7, pista: "Días de una semana" },
    { valor: 8, pista: "El doble de cuatro" },
    { valor: 9, pista: "Tres elevado al cuadrado" },
  ]).slice(0, 3);
  const secuencia = bancoDigitos.map((elemento) => elemento.valor);
  const pistasCodigo = bancoDigitos.map((elemento) => elemento.pista);
  const solucionSecuencia = Number(secuencia.join(""));
  const pistaSecuencia = `El primer dígito es ${secuencia[0]}.`;
  const patron = Array.from({ length: dificultad === "facil" ? 4 : dificultad === "media" ? 5 : 6 }, () => aleatorio(4));
  const interruptores = Array.from({ length: 4 }, () => Math.random() > .5);
  const solucionInterruptores = dificultad === "dificil"
    ? interruptores.map((valor, indice) => indice % 2 === 0 ? !valor : valor)
    : interruptores.map((valor) => !valor);
  return {
    modulos: (["secuencia", "cables", "memoria", "interruptores"] as Modulo[]).slice(0, AJUSTES[dificultad].modulos),
    cables, cableCorrecto, reglaCable, serie, secuencia, solucionSecuencia, pistaSecuencia, pistasCodigo,
    patron, interruptores, solucionInterruptores,
  };
};

/** Juego de deducción con módulos aleatorios, dificultad, vidas, pistas y ranking local. */
export const JuegoDesactivarPanel: React.FC = () => {
  const [matricula, setMatricula] = React.useState(() => localStorage.getItem(CLAVE_MATRICULA) ?? "RMI");
  const [dificultad, setDificultad] = React.useState<Dificultad>("facil");
  const [configuracion, setConfiguracion] = React.useState<Configuracion>(() => crearConfiguracion("facil"));
  const [indiceModulo, setIndiceModulo] = React.useState(0);
  const [iniciado, setIniciado] = React.useState(false);
  const [pausado, setPausado] = React.useState(false);
  const [finalizado, setFinalizado] = React.useState(false);
  const [segundos, setSegundos] = React.useState(0);
  const [vidas, setVidas] = React.useState(3);
  const [pistas, setPistas] = React.useState(2);
  const [mensaje, setMensaje] = React.useState("Selecciona dificultad y pulsa Iniciar caso.");
  const [entrada, setEntrada] = React.useState("");
  const [desbloqueandoPanel, setDesbloqueandoPanel] = React.useState(false);
  const [respuestaMemoria, setRespuestaMemoria] = React.useState<number[]>([]);
  const [viendoPatron, setViendoPatron] = React.useState(false);
  const [luzActiva, setLuzActiva] = React.useState<number | null>(null);
  const [luzPulsada, setLuzPulsada] = React.useState<number | null>(null);
  const [cableCortado, setCableCortado] = React.useState<number | null>(null);
  const [procesandoCable, setProcesandoCable] = React.useState(false);
  const [estadoInterruptores, setEstadoInterruptores] = React.useState<boolean[]>([]);
  const [ranking, setRanking] = React.useState<Resultado[]>(leerRanking);
  const modulo = configuracion.modulos[indiceModulo];
  const ajustes = AJUSTES[dificultad];

  React.useEffect(() => {
    if (!iniciado || pausado || finalizado) return undefined;
    const id = window.setInterval(() => setSegundos((actual) => actual + 1), 1000);
    return () => window.clearInterval(id);
  }, [iniciado, pausado, finalizado]);

  const mostrarPatron = React.useCallback(() => {
    setViendoPatron(true); setRespuestaMemoria([]);
    const intervalo = dificultad === "facil" ? 720 : dificultad === "media" ? 610 : 520;
    configuracion.patron.forEach((luz, indice) => {
      window.setTimeout(() => setLuzActiva(luz), 250 + indice * intervalo);
      window.setTimeout(() => setLuzActiva(null), 250 + indice * intervalo + Math.round(intervalo * .58));
    });
    window.setTimeout(() => { setLuzActiva(null); setViendoPatron(false); }, 350 + configuracion.patron.length * intervalo);
  }, [configuracion.patron, dificultad]);

  const iniciar = () => {
    const nueva = crearConfiguracion(dificultad);
    localStorage.setItem(CLAVE_MATRICULA, matricula);
    setConfiguracion(nueva); setIndiceModulo(0); setSegundos(0); setVidas(ajustes.vidas); setPistas(ajustes.pistas);
    setEntrada(""); setDesbloqueandoPanel(false); setRespuestaMemoria([]); setLuzActiva(null); setLuzPulsada(null); setEstadoInterruptores(nueva.interruptores); setCableCortado(null); setProcesandoCable(false);
    setPausado(false); setFinalizado(false); setIniciado(true); setMensaje("Lee las reglas y deduce la solución.");
  };

  const fallar = (texto: string) => {
    const restantes = vidas - 1;
    setVidas(restantes); setSegundos((s) => s + ajustes.penalizacion); setEntrada(""); setRespuestaMemoria([]);
    if (restantes <= 0) { setIniciado(false); setFinalizado(true); setMensaje("Panel bloqueado: agotaste los intentos. Inicia un caso nuevo."); }
    else setMensaje(`${texto} Penalización: ${ajustes.penalizacion} segundos.`);
  };

  const avanzar = () => {
    if (indiceModulo + 1 < configuracion.modulos.length) {
      const siguiente = indiceModulo + 1;
      setIndiceModulo(siguiente); setEntrada(""); setRespuestaMemoria([]); setMensaje("Módulo resuelto. Analiza la siguiente prueba.");
      if (configuracion.modulos[siguiente] === "memoria") window.setTimeout(mostrarPatron, 400);
      return;
    }
    const puntos = Math.max(100, Math.round((1000 - segundos * 4 - (ajustes.vidas - vidas) * 80 + pistas * 25) * ajustes.multiplicador));
    const resultado = { matricula, segundos, puntos, dificultad, fecha: Date.now() };
    const nuevo = [...ranking, resultado].sort((a, b) => b.puntos - a.puntos || a.segundos - b.segundos).slice(0, 7);
    localStorage.setItem(CLAVE_RANKING, JSON.stringify(nuevo)); setRanking(nuevo);
    setIniciado(false); setFinalizado(true); setMensaje(`Panel desactivado: ${puntos} puntos en ${tiempo(segundos)}.`);
  };

  const usarPista = () => {
    if (!pistas) return;
    setPistas((p) => p - 1);
    if (modulo === "secuencia") setMensaje(`Pista: ${configuracion.pistaSecuencia}`);
    if (modulo === "memoria") mostrarPatron();
    if (modulo === "interruptores") setMensaje(dificultad === "dificil" ? "Pista: solo cambian los interruptores de posición impar." : "Pista: todos deben quedar al contrario de su posición inicial.");
  };

  const comprobarSecuencia = () => {
    if (desbloqueandoPanel) return;
    if (Number(entrada) !== configuracion.solucionSecuencia) { fallar("El código no desbloquea el panel."); return; }
    setDesbloqueandoPanel(true);
    setMensaje("Código correcto. Abriendo la cubierta de seguridad…");
    window.setTimeout(() => { setDesbloqueandoPanel(false); avanzar(); }, 1450);
  };
  const cortarCable = (indice: number) => {
    if (procesandoCable || pausado) return;
    if (indice !== configuracion.cableCorrecto) { fallar("Cable incorrecto."); return; }
    setCableCortado(indice); setProcesandoCable(true); setMensaje("Cable correcto. Energía interrumpida…");
    window.setTimeout(() => { setProcesandoCable(false); setCableCortado(null); avanzar(); }, 900);
  };
  const pulsarMemoria = (valor: number) => {
    setLuzPulsada(valor);
    window.setTimeout(() => setLuzPulsada(null), 260);
    const nueva = [...respuestaMemoria, valor];
    if (configuracion.patron[nueva.length - 1] !== valor) { fallar("El patrón no coincide."); window.setTimeout(mostrarPatron, 500); return; }
    setRespuestaMemoria(nueva);
    if (nueva.length === configuracion.patron.length) avanzar();
  };
  const comprobarInterruptores = () => estadoInterruptores.every((v, i) => v === configuracion.solucionInterruptores[i]) ? avanzar() : fallar("La configuración no cumple la regla.");

  return <div className={`juego-panel-layout ${iniciado ? "partida-activa" : ""}`}>
    <section className="juego-panel">
      <header className="juego-panel-cabecera"><div><span>Juego de deducción</span><h2>Desactivar el panel</h2></div><div className="panel-indicadores"><b>{tiempo(segundos)}</b><small>❤ {vidas} · 💡 {pistas}</small></div></header>
      {!iniciado && !finalizado && <div className="juego-panel-portada"><div aria-hidden="true">⚡</div><h3>Panel lógico de seguridad</h3><p>Cada caso cambia. Interpreta las reglas, resuelve los módulos y evita perder todos los intentos.</p><div className="panel-configuracion"><label>Jugador<select value={matricula} onChange={(e) => setMatricula(e.target.value)}>{operadores.map((o) => <option value={o.matricula} key={o.matricula}>{o.matricula} · {o.nombre}</option>)}</select></label><label>Dificultad<select value={dificultad} onChange={(e) => setDificultad(e.target.value as Dificultad)}><option value="facil">Fácil · 3 módulos y 2 pistas</option><option value="media">Media · 4 módulos y 1 pista</option><option value="dificil">Difícil · 4 módulos y sin pistas</option></select></label></div><button type="button" onClick={iniciar}>Iniciar caso aleatorio</button></div>}
      {(iniciado || finalizado) && <>
        <div className="juego-panel-progreso">{configuracion.modulos.map((_, i) => <React.Fragment key={i}><span className={i < indiceModulo || finalizado && vidas > 0 ? "completo" : i === indiceModulo ? "activo" : ""}>{i + 1}</span>{i < configuracion.modulos.length - 1 && <i />}</React.Fragment>)}</div>
        <p className="juego-panel-mensaje" aria-live="polite">{mensaje}</p>
        {iniciado && <section className={`juego-panel-prueba ${pausado ? "oculta" : ""}`}>
          {modulo === "cables" && <><span>MÓDULO · CABLEADO</span><div className={`panel-energia ${procesandoCable ? "apagado" : ""}`}><div className="panel-leds" aria-label={procesandoCable ? "Energía desconectada" : "Panel energizado"}><i /><i /><i /></div><strong>{procesandoCable ? "ENERGÍA INTERRUMPIDA" : "SISTEMA EN TENSIÓN"}</strong></div><h3>Serie del panel: {configuracion.serie}</h3><details className="panel-reglas-cables" open><summary>Consultar reglas de corte</summary><p>{configuracion.reglaCable}</p></details><div className="juego-panel-cables">{configuracion.cables.map((color, i) => <button type="button" className={`${color} ${cableCortado === i ? "cortado" : ""}`} disabled={procesandoCable} onClick={() => cortarCable(i)} key={`${color}-${i}`}><span className="cable-etiqueta"><b>{i + 1}</b><small>{color}</small></span><span className="cable-conector izquierdo" /><span className="cable-linea" /><span className="cable-conector derecho" /></button>)}</div></>}
          {modulo === "secuencia" && <>
            <span>MÓDULO · TECLADO DE ALARMA · VERSIÓN 2</span>
            <h3>Obtén los tres dígitos de la clave</h3>
            <div className="panel-pistas-codigo">{configuracion.pistasCodigo.map((pista, indice) => <div key={pista}><b>{indice + 1}</b><span>{pista}</span><small>Dígito {indice + 1}</small></div>)}</div>
            <div className={`panel-alarma-teclado ${desbloqueandoPanel ? "desbloqueado" : ""}`}>
              <div className="panel-alarma-interior" aria-hidden="true">
                <strong>CABLEADO DESBLOQUEADO</strong>
                {configuracion.cables.map((color, indice) => <div className={`panel-cable-previo ${color}`} key={`${color}-previo`}><b>{indice + 1}</b><i /><span /><i /></div>)}
              </div>
              <div className="panel-alarma-tapa">
              <div className="panel-alarma-cabecera"><i /><strong>CRA · CONTROL DE ACCESO</strong><i /></div>
              <output aria-live="polite">{desbloqueandoPanel ? "OPEN" : entrada || "_ _ _"}</output>
              <div className="panel-alarma-numeros">
                {[1,2,3,4,5,6,7,8,9].map((numero) => <button type="button" disabled={desbloqueandoPanel} onClick={() => setEntrada((valor) => `${valor}${numero}`.slice(0, 3))} key={numero}>{numero}</button>)}
                <button type="button" className="borrar" disabled={desbloqueandoPanel} onClick={() => setEntrada("")} aria-label="Borrar toda la clave">C</button>
                <button type="button" disabled={desbloqueandoPanel} onClick={() => setEntrada((valor) => `${valor}0`.slice(0, 3))}>0</button>
                <button type="button" className="retroceso" disabled={desbloqueandoPanel} onClick={() => setEntrada((valor) => valor.slice(0, -1))} aria-label="Borrar último número">⌫</button>
              </div>
              <button type="button" className="panel-alarma-confirmar" disabled={entrada.length !== 3 || desbloqueandoPanel} onClick={comprobarSecuencia}>✓ Confirmar clave</button>
              </div>
            </div>
          </>}
          {modulo === "memoria" && <><span>MÓDULO · SECUENCIA LUMINOSA</span><h3>{viendoPatron ? "Observa las luces" : "Repite la secuencia de colores"}</h3><div className="juego-panel-luces">{["roja","amarilla","azul","verde"].map((color, n) => <button type="button" aria-label={`Luz ${color}`} disabled={viendoPatron} onClick={() => pulsarMemoria(n)} className={`${color} ${luzActiva === n || luzPulsada === n ? "pulsada" : ""}`} key={color}><i /></button>)}</div><p className="panel-luces-ayuda">{viendoPatron ? "Memoriza el orden…" : `${respuestaMemoria.length} de ${configuracion.patron.length} pulsaciones`}</p></>}
          {modulo === "interruptores" && <><span>MÓDULO · INTERRUPTORES</span><h3>Configura los cuatro interruptores</h3><p className="panel-regla">{dificultad === "dificil" ? "Invierte solo los interruptores que ocupan posiciones impares (1 y 3)." : "Todos deben quedar en la posición contraria a la inicial."}</p><div className="panel-interruptores">{estadoInterruptores.map((encendido, i) => <button type="button" className={encendido ? "encendido" : ""} onClick={() => setEstadoInterruptores((actual) => actual.map((v, x) => x === i ? !v : v))} key={i}><i />{i + 1}</button>)}</div><button type="button" className="panel-comprobar" onClick={comprobarInterruptores}>Comprobar configuración</button></>}
          {pausado && <div className="juego-panel-pausa"><strong>Partida en pausa</strong><p>El caso está oculto y el cronómetro detenido.</p></div>}
        </section>}
        <div className="juego-panel-acciones">{iniciado && pistas > 0 && <button type="button" onClick={usarPista}>Usar pista ({pistas})</button>}{iniciado && <button type="button" onClick={() => setPausado(!pausado)}>{pausado ? "Reanudar" : "Pausar gestión"}</button>}<button type="button" onClick={iniciar}>{finalizado ? "Nuevo caso" : "Reiniciar"}</button></div>
      </>}
    </section>
    {!iniciado && <aside className="codigo-secreto-ranking"><header><span>Clasificación por puntos</span><h2>Mejores técnicos</h2></header>{ranking.length ? <ol>{ranking.map((r, i) => <li key={`${r.fecha}-${i}`}><span>{i + 1}</span><div><strong>{r.matricula}</strong><small>{AJUSTES[r.dificultad].nombre}</small></div><p><strong>{r.puntos} pt</strong><small>{tiempo(r.segundos)}</small></p></li>)}</ol> : <p className="ranking-vacio">Todavía no hay resultados.</p>}</aside>}
  </div>;
};
