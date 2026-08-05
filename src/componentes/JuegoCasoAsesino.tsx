import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";
import imagenesMurdoku from "../recursos/juegos/murdoku-cra-sprites.png";

interface Caso {
  titulo: string;
  dificultad: "fácil" | "medio" | "difícil";
  introduccion: string;
  sospechosos: string[];
  lugares: string[];
  objetos: string[];
  pistas: string[];
  solucion: { sospechoso: string; lugar: string; objeto: string };
}

type EstadoCasilla = "desconocido" | "imposible" | "confirmado";

const PERSONAS = ["Operador CRA", "Acuda", "Técnico instalador", "Vendedor de alarmas"];
const OBJETOS = ["Auriculares", "Teclado", "Tarjeta de acceso", "Cuaderno"];
const LUGARES = ["Sala CRA", "Office", "Baños", "Vestuario"];

const TarjetaVisual: React.FC<{ indice: number; nombre: string; detalle?: string }> = ({ indice, nombre, detalle }) => (
  <article className="murdoku-tarjeta">
    <div
      className={`murdoku-imagen sprite-${indice}`}
      style={{ backgroundImage: `url(${imagenesMurdoku})` }}
      role="img"
      aria-label={nombre}
    />
    <strong>{nombre}</strong>
    {detalle && <small>{detalle}</small>}
  </article>
);

const MatrizDeduccion: React.FC<{
  titulo: string;
  filas: string[];
  columnas: string[];
  prefijo: string;
  estados: Record<string, EstadoCasilla>;
  cambiar: (clave: string) => void;
}> = ({ titulo, filas, columnas, prefijo, estados, cambiar }) => (
  <section className="murdoku-matriz">
    <h3>{titulo}</h3>
    <div className="murdoku-tabla-contenedor">
      <table>
        <thead><tr><th />{columnas.map((columna) => <th key={columna}>{columna}</th>)}</tr></thead>
        <tbody>{filas.map((fila) => (
          <tr key={fila}>
            <th>{fila}</th>
            {columnas.map((columna) => {
              const clave = `${prefijo}:${fila}:${columna}`;
              const estado = estados[clave] ?? "desconocido";
              return <td key={columna}><button type="button" className={`casilla-${estado}`} onClick={() => cambiar(clave)} aria-label={`${fila}, ${columna}: ${estado}`}>{estado === "confirmado" ? "✓" : estado === "imposible" ? "×" : "○"}</button></td>;
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  </section>
);

interface EntradaRanking {
  matricula: string;
  duracion_segundos: number;
  intentos: number;
  numero_caso?: number;
  casos_completados?: number;
}

const operadores = Array.from(new Map(
  CUADRANTES.flatMap((cuadrante) => cuadrante.operadores)
    .map((operador) => [operador.matricula, operador])
).values()).sort((a, b) =>
  a.matricula === "RMI" ? -1 : b.matricula === "RMI" ? 1 : a.matricula.localeCompare(b.matricula)
);
const nombreOperador = (matricula: string) =>
  operadores.find((operador) => operador.matricula === matricula)?.nombre ?? "Operador CRA";
const formatearTiempo = (segundos: number) =>
  `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(segundos % 60).padStart(2, "0")}`;

const CASOS: Caso[] = [
  {
    titulo: "El acceso fuera de turno",
    dificultad: "fácil",
    introduccion: "Una tarjeta fue utilizada fuera del horario previsto. Cada profesional estuvo en un lugar distinto y llevaba un objeto diferente.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El acceso irregular se registró en la sala CRA y se realizó con la tarjeta de acceso.",
      "El operador CRA estuvo en el office y llevaba el cuaderno.",
      "El acuda permaneció en el vestuario.",
      "La persona que estuvo en el vestuario llevaba los auriculares.",
      "El técnico instalador estuvo en los baños.",
      "La persona que estuvo en los baños llevaba el teclado.",
    ],
    solucion: { sospechoso: "Vendedor de alarmas", lugar: "Sala CRA", objeto: "Tarjeta de acceso" },
  },
  {
    titulo: "El cuaderno extraviado",
    dificultad: "fácil",
    introduccion: "El cuaderno de incidencias cambió de ubicación. Cada profesional estuvo en un lugar distinto y llevaba un objeto diferente.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El cuaderno extraviado terminó en los baños.",
      "El operador CRA permaneció en la sala CRA y utilizaba los auriculares.",
      "El vendedor de alarmas estuvo en el office y llevaba el teclado.",
      "El acuda permaneció en el vestuario.",
      "La tarjeta de acceso estaba con la persona del vestuario.",
      "El técnico instalador no estuvo ni en la sala CRA, ni en el office, ni en el vestuario.",
    ],
    solucion: { sospechoso: "Técnico instalador", lugar: "Baños", objeto: "Cuaderno" },
  },
  {
    titulo: "El teclado intercambiado",
    dificultad: "fácil",
    introduccion: "Un teclado apareció conectado en un puesto distinto. Cada profesional estuvo en un lugar distinto y llevaba un objeto diferente.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El teclado intercambiado fue encontrado en la sala CRA.",
      "El acuda estuvo en el vestuario y llevaba la tarjeta de acceso.",
      "El técnico instalador permaneció en el office.",
      "El cuaderno se quedó con la persona que estuvo en el office.",
      "El vendedor de alarmas estuvo en los baños y llevaba los auriculares.",
      "El operador CRA no estuvo en el office, el vestuario ni los baños.",
    ],
    solucion: { sospechoso: "Operador CRA", lugar: "Sala CRA", objeto: "Teclado" },
  },
  {
    titulo: "Los auriculares olvidados",
    dificultad: "medio",
    introduccion: "Unos auriculares aparecieron fuera de su puesto. Relaciona los movimientos para descubrir quién los dejó.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El objeto investigado son los auriculares y apareció en el office.",
      "El operador CRA permaneció en la sala CRA.",
      "El teclado se utilizó en la sala CRA.",
      "El técnico instalador estuvo en el vestuario con la tarjeta de acceso.",
      "El vendedor de alarmas pasó por los baños.",
      "La persona de los baños llevaba el cuaderno.",
    ],
    solucion: { sospechoso: "Acuda", lugar: "Office", objeto: "Auriculares" },
  },
  {
    titulo: "La tarjeta desplazada",
    dificultad: "medio",
    introduccion: "La tarjeta de acceso apareció en una zona inesperada. Reconstruye el reparto de objetos y lugares.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "La incidencia corresponde a la tarjeta encontrada en los baños.",
      "El operador CRA estuvo en el office con el cuaderno.",
      "El acuda permaneció en la sala CRA.",
      "Los auriculares se quedaron en la sala CRA.",
      "El técnico instalador estuvo en el vestuario con el teclado.",
      "La persona investigada no fue el operador, el acuda ni el técnico.",
    ],
    solucion: { sospechoso: "Vendedor de alarmas", lugar: "Baños", objeto: "Tarjeta de acceso" },
  },
  {
    titulo: "El teclado del office",
    dificultad: "medio",
    introduccion: "Un teclado fue trasladado al office. Utiliza los descartes para identificar al responsable.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El objeto investigado es el teclado encontrado en el office.",
      "El operador CRA permaneció en la sala CRA con los auriculares.",
      "El acuda estuvo en los baños con la tarjeta de acceso.",
      "El vendedor de alarmas pasó por el vestuario.",
      "El cuaderno se encontró en el vestuario.",
      "El técnico instalador no estuvo en la sala CRA, los baños ni el vestuario.",
    ],
    solucion: { sospechoso: "Técnico instalador", lugar: "Office", objeto: "Teclado" },
  },
  {
    titulo: "El cuaderno sin registro",
    dificultad: "difícil",
    introduccion: "Falta un registro del cuaderno. Las pistas indican principalmente dónde no estuvo cada elemento.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El objeto investigado es el cuaderno.",
      "El cuaderno no estuvo en la sala CRA, el office ni los baños.",
      "El acuda estuvo en la sala CRA con los auriculares.",
      "El técnico instalador estuvo en el office con el teclado.",
      "El vendedor pasó por los baños con la tarjeta de acceso.",
      "La persona investigada no fue el acuda, el técnico ni el vendedor.",
    ],
    solucion: { sospechoso: "Operador CRA", lugar: "Vestuario", objeto: "Cuaderno" },
  },
  {
    titulo: "El acceso sin asignar",
    dificultad: "difícil",
    introduccion: "Una tarjeta quedó sin asignación. Sigue la cadena de exclusiones para localizarla y saber quién la llevaba.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El objeto investigado es la tarjeta de acceso.",
      "La tarjeta no apareció en el office, los baños ni el vestuario.",
      "El operador CRA estuvo en el office con el teclado.",
      "El técnico instalador estuvo en los baños con los auriculares.",
      "El vendedor permaneció en el vestuario con el cuaderno.",
      "Quien quedó en la sala CRA no fue ninguno de esos tres profesionales.",
    ],
    solucion: { sospechoso: "Acuda", lugar: "Sala CRA", objeto: "Tarjeta de acceso" },
  },
  {
    titulo: "Los auriculares sin responsable",
    dificultad: "difícil",
    introduccion: "Nadie reconoce haber utilizado los auriculares. Resuelve primero los demás movimientos y encuentra la combinación restante.",
    sospechosos: PERSONAS, lugares: LUGARES, objetos: OBJETOS,
    pistas: [
      "El objeto investigado son los auriculares.",
      "Los auriculares no estuvieron en la sala CRA, el office ni el vestuario.",
      "El operador CRA estuvo en la sala CRA con el teclado.",
      "El acuda pasó por el office con la tarjeta de acceso.",
      "El vendedor permaneció en el vestuario con el cuaderno.",
      "La persona de los baños no fue el operador, el acuda ni el vendedor.",
    ],
    solucion: { sospechoso: "Técnico instalador", lugar: "Baños", objeto: "Auriculares" },
  },
];

/** Minijuego de deducción, visible solo desde la zona privada del administrador. */
export const JuegoCasoAsesino: React.FC = () => {
  const [matricula, establecerMatricula] = React.useState(() =>
    localStorage.getItem("cra-zona-descanso-matricula") ?? "RMI"
  );
  const [partidaId, establecerPartidaId] = React.useState("");
  const [indiceCaso, establecerIndiceCaso] = React.useState(0);
  const [sospechoso, establecerSospechoso] = React.useState("");
  const [lugar, establecerLugar] = React.useState("");
  const [objeto, establecerObjeto] = React.useState("");
  const [mensaje, establecerMensaje] = React.useState("Lee las pistas y selecciona la combinación que identifica al culpable.");
  const [iniciado, establecerIniciado] = React.useState(false);
  const [pausado, establecerPausado] = React.useState(false);
  const [resuelto, establecerResuelto] = React.useState(false);
  const [intentos, establecerIntentos] = React.useState(0);
  const [segundos, establecerSegundos] = React.useState(0);
  const [rankingPorCaso, establecerRankingPorCaso] = React.useState<EntradaRanking[]>([]);
  const [rankingGeneral, establecerRankingGeneral] = React.useState<EntradaRanking[]>([]);
  const [rankingVisible, establecerRankingVisible] = React.useState<"general" | number>("general");
  const [estadosMatriz, establecerEstadosMatriz] = React.useState<Record<string, EstadoCasilla>>({});
  const caso = CASOS[indiceCaso];
  const seleccionarDificultad = (dificultad: Caso["dificultad"]) => {
    const indice = CASOS.findIndex((opcion) => opcion.dificultad === dificultad);
    if (indice >= 0) establecerIndiceCaso(indice);
  };

  const cambiarCasilla = (clave: string) => establecerEstadosMatriz((actuales) => {
    const actual = actuales[clave] ?? "desconocido";
    const siguiente: EstadoCasilla = actual === "desconocido" ? "imposible" : actual === "imposible" ? "confirmado" : "desconocido";
    return { ...actuales, [clave]: siguiente };
  });

  const cargarRanking = React.useCallback(async () => {
    const respuesta = await fetch("/api/caso-asesino", { credentials: "same-origin" });
    if (!respuesta.ok) return;
    const datos = await respuesta.json() as {
      rankingPorCaso?: EntradaRanking[];
      rankingGeneral?: EntradaRanking[];
    };
    establecerRankingPorCaso(datos.rankingPorCaso ?? []);
    establecerRankingGeneral(datos.rankingGeneral ?? []);
  }, []);

  const iniciarPartida = React.useCallback(async (numeroCaso: number) => {
    const respuesta = await fetch("/api/caso-asesino", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "iniciar", numeroCaso }),
    });
    const datos = await respuesta.json() as { partidaId?: string };
    if (!respuesta.ok || !datos.partidaId) throw new Error("No se pudo iniciar la partida.");
    establecerPartidaId(datos.partidaId);
  }, []);

  React.useEffect(() => {
    cargarRanking().catch(() => undefined);
  }, [cargarRanking]);
  React.useEffect(() => { localStorage.setItem("cra-zona-descanso-matricula", matricula); }, [matricula]);
  React.useEffect(() => {
    if (!iniciado || pausado || resuelto || !partidaId) return undefined;
    const intervalo = window.setInterval(() => establecerSegundos((valor) => valor + 1), 1000);
    return () => window.clearInterval(intervalo);
  }, [iniciado, pausado, resuelto, partidaId]);

  const cambiarPausa = async () => {
    if (!partidaId || resuelto) return;
    const accion = pausado ? "reanudar" : "pausar";
    try {
      const respuesta = await fetch("/api/caso-asesino", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion, partidaId }),
      });
      if (!respuesta.ok) throw new Error("No se pudo cambiar la pausa.");
      establecerPausado(!pausado);
      establecerMensaje(pausado ? "Caso reanudado. Continúa desde donde lo dejaste." : "Caso pausado. El avance está protegido.");
    } catch {
      establecerMensaje("No se pudo cambiar el estado de la pausa. Inténtalo de nuevo.");
    }
  };

  const comenzarCaso = async () => {
    establecerMensaje("Preparando el expediente…");
    try {
      await iniciarPartida(indiceCaso + 1);
      establecerSegundos(0);
      establecerIniciado(true);
      establecerPausado(false);
      establecerMensaje("Analiza las pistas y selecciona la combinación correcta.");
    } catch {
      establecerMensaje("No se pudo iniciar el caso. Inténtalo de nuevo.");
    }
  };

  const comprobar = async () => {
    const nuevosIntentos = intentos + 1;
    establecerIntentos(nuevosIntentos);
    const acierto = sospechoso === caso.solucion.sospechoso
      && lugar === caso.solucion.lugar
      && objeto === caso.solucion.objeto;
    if (acierto) {
      establecerResuelto(true);
      try {
        const respuesta = await fetch("/api/caso-asesino", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "finalizar", partidaId, matricula, intentos: nuevosIntentos }),
        });
        const datos = await respuesta.json() as { duracionSegundos?: number };
        if (datos.duracionSegundos) establecerSegundos(datos.duracionSegundos);
        establecerMensaje(
          `¡Caso resuelto en ${nuevosIntentos} ${nuevosIntentos === 1 ? "intento" : "intentos"} y ${formatearTiempo(datos.duracionSegundos ?? segundos)}!`
        );
        cargarRanking().catch(() => undefined);
      } catch {
        establecerMensaje("Caso resuelto, pero no se pudo guardar el ranking.");
      }
    } else {
      establecerMensaje("Esa combinación contradice alguna pista. Revisa las relaciones e inténtalo de nuevo.");
    }
  };

  const nuevoCaso = () => {
    establecerPartidaId("");
    establecerIndiceCaso((actual) => (actual + 1) % CASOS.length);
    establecerSospechoso("");
    establecerLugar("");
    establecerObjeto("");
    establecerEstadosMatriz({});
    establecerIntentos(0);
    establecerSegundos(0);
    establecerIniciado(false);
    establecerPausado(false);
    establecerResuelto(false);
    establecerMensaje("Pulsa «Iniciar caso» cuando estés preparado.");
  };

  return (
    <>
    <div className={`caso-asesino ${iniciado && !resuelto ? "en-curso" : ""}`}>
      <header className="codigo-secreto-titulo">
        <div><span>Deducción lógica · Nueve expedientes</span><h2>Caso del asesino</h2></div>
        <div className="murdoku-controles-tiempo">
          <strong>{formatearTiempo(segundos)}</strong>
          {iniciado && !resuelto && <button type="button" onClick={cambiarPausa}>{pausado ? "Reanudar" : "Pausar"}</button>}
        </div>
      </header>

      <div className="codigo-secreto-identificacion">
        <label>Jugador
          <select value={matricula} disabled={iniciado && !resuelto} onChange={(e) => establecerMatricula(e.target.value)}>
            {operadores.map((operador) => (
              <option value={operador.matricula} key={operador.matricula}>
                {operador.matricula} · {operador.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="caso-contador-intentos"><small>Intentos</small><strong>{intentos}</strong></div>
      </div>

      {!iniciado ? (
        <section className="caso-asesino-portada">
          <div className="murdoku-portada-sello" aria-hidden="true">⌕</div>
          <span>EXPEDIENTE INTERACTIVO · 9 CASOS</span>
          <h3>Murdoku CRA</h3>
          <p>Investiga qué profesional intervino, qué objeto utilizó y en qué zona ocurrió. Marca las matrices hasta descubrir la combinación correcta.</p>
          <div className="murdoku-portada-muestras">
            <TarjetaVisual indice={0} nombre="Personas" detalle="4 perfiles" />
            <TarjetaVisual indice={6} nombre="Objetos" detalle="4 elementos" />
            <TarjetaVisual indice={8} nombre="Lugares" detalle="4 zonas" />
          </div>
          <div className="murdoku-selector-nivel">
            <label>Nivel
              <select value={caso.dificultad} onChange={(e) => seleccionarDificultad(e.target.value as Caso["dificultad"])}>
                <option value="fácil">Fácil · Aprendizaje</option>
                <option value="medio">Medio · Relaciones</option>
                <option value="difícil">Difícil · Descartes</option>
              </select>
            </label>
            <label>Expediente
              <select value={indiceCaso} onChange={(e) => establecerIndiceCaso(Number(e.target.value))}>
                {CASOS.map((opcion, indice) => opcion.dificultad === caso.dificultad && (
                  <option value={indice} key={opcion.titulo}>Caso {indice + 1} · {opcion.titulo}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="murdoku-portada-datos"><span>◉ Nivel {caso.dificultad}</span><span>◫ Matrices interactivas</span><span>🏅 Ranking interno</span></div>
          <button type="button" onClick={comenzarCaso}>Iniciar caso</button>
          <p className="codigo-secreto-mensaje" aria-live="polite">{mensaje}</p>
        </section>
      ) : pausado ? (
        <section className="murdoku-pausa" aria-live="polite">
          <div aria-hidden="true">Ⅱ</div>
          <span>CASO EN PAUSA</span>
          <h3>El expediente está oculto</h3>
          <p>Las pistas, respuestas y marcas realizadas se conservan. El tiempo del ranking está detenido.</p>
          <button type="button" onClick={cambiarPausa}>Reanudar investigación</button>
        </section>
      ) : (
        <>
      <section className="caso-asesino-historia">
        <small>EXPEDIENTE {String(indiceCaso + 1).padStart(2, "0")} · NIVEL {caso.dificultad.toUpperCase()}</small>
        <h3>{caso.titulo}</h3>
        <p>{caso.introduccion}</p>
      </section>

      <section className="murdoku-categorias">
        <div><h3>Personas</h3><div className="murdoku-tarjetas">
          <TarjetaVisual indice={0} nombre="Operador CRA" detalle="Cascos y micrófono" />
          <TarjetaVisual indice={1} nombre="Acuda" detalle="Uniforme y llaves" />
          <TarjetaVisual indice={2} nombre="Técnico instalador" detalle="Herramientas" />
          <TarjetaVisual indice={3} nombre="Vendedor" detalle="Tableta comercial" />
        </div></div>
        <div><h3>Objetos</h3><div className="murdoku-tarjetas">
          <TarjetaVisual indice={4} nombre="Auriculares" />
          <TarjetaVisual indice={5} nombre="Teclado" />
          <TarjetaVisual indice={6} nombre="Tarjeta" />
          <TarjetaVisual indice={7} nombre="Cuaderno" />
        </div></div>
        <div><h3>Lugares</h3><div className="murdoku-tarjetas">
          <TarjetaVisual indice={8} nombre="Sala CRA" />
          <TarjetaVisual indice={9} nombre="Office" />
          <TarjetaVisual indice={10} nombre="Baños" />
          <TarjetaVisual indice={11} nombre="Vestuario" />
        </div></div>
      </section>

      <section className="caso-asesino-pistas">
        <h3>Pistas del caso</h3>
        <ol>{caso.pistas.map((pista, indice) => <li key={pista}><span>{indice + 1}</span>{pista}</li>)}</ol>
      </section>

      <section className="murdoku-matrices">
        <MatrizDeduccion titulo="Personas × Objetos" filas={PERSONAS} columnas={OBJETOS} prefijo="po" estados={estadosMatriz} cambiar={cambiarCasilla} />
        <MatrizDeduccion titulo="Personas × Lugares" filas={PERSONAS} columnas={LUGARES} prefijo="pl" estados={estadosMatriz} cambiar={cambiarCasilla} />
        <MatrizDeduccion titulo="Objetos × Lugares" filas={OBJETOS} columnas={LUGARES} prefijo="ol" estados={estadosMatriz} cambiar={cambiarCasilla} />
      </section>
      <p className="murdoku-leyenda"><span>✓ Confirmado</span><span>× Imposible</span><span>○ Desconocido</span></p>

      <section className="caso-asesino-respuesta">
        <h3>Tu resolución</h3>
        <div>
          <label>Sospechoso
            <select value={sospechoso} disabled={resuelto} onChange={(e) => establecerSospechoso(e.target.value)}>
              <option value="">Seleccionar</option>
              {caso.sospechosos.map((valor) => <option key={valor}>{valor}</option>)}
            </select>
          </label>
          <label>Lugar
            <select value={lugar} disabled={resuelto} onChange={(e) => establecerLugar(e.target.value)}>
              <option value="">Seleccionar</option>
              {caso.lugares.map((valor) => <option key={valor}>{valor}</option>)}
            </select>
          </label>
          <label>Objeto
            <select value={objeto} disabled={resuelto} onChange={(e) => establecerObjeto(e.target.value)}>
              <option value="">Seleccionar</option>
              {caso.objetos.map((valor) => <option key={valor}>{valor}</option>)}
            </select>
          </label>
        </div>
        <button type="button" onClick={comprobar} disabled={!partidaId || !sospechoso || !lugar || !objeto || resuelto}>
          Comprobar solución
        </button>
      </section>

      <p className={`codigo-secreto-mensaje ${resuelto ? "caso-resuelto" : ""}`} aria-live="polite">{mensaje}</p>
      <button type="button" className="caso-asesino-nuevo" onClick={nuevoCaso}>Abrir otro caso</button>
        </>
      )}
    </div>
    {(!iniciado || resuelto) && <aside className="codigo-secreto-ranking">
      <header><span>Clasificación compartida</span><h2>Podio de detectives</h2></header>
      <nav className="caso-ranking-selector" aria-label="Seleccionar clasificación">
        <button type="button" className={rankingVisible === "general" ? "activo" : ""} onClick={() => establecerRankingVisible("general")}>General</button>
        <select value={rankingVisible} onChange={(e) => establecerRankingVisible(e.target.value === "general" ? "general" : Number(e.target.value))}>
          <option value="general">Clasificación general</option>
          {CASOS.map((opcion, indice) => <option value={indice + 1} key={opcion.titulo}>Caso {indice + 1} · {opcion.dificultad}</option>)}
        </select>
      </nav>
      {(rankingVisible === "general"
        ? rankingGeneral
        : rankingPorCaso.filter((entrada) => entrada.numero_caso === rankingVisible)).length ? (
        <ol className="ranking-medallas">{(rankingVisible === "general"
          ? rankingGeneral
          : rankingPorCaso.filter((entrada) => entrada.numero_caso === rankingVisible)).map((entrada, indice) => (
          <li className={entrada.matricula === matricula ? "jugador-actual" : ""} key={entrada.matricula}>
            <span className={`medalla medalla-${indice + 1}`} aria-label={`${indice + 1}.º puesto`}>
              {indice === 0 ? "★" : indice === 1 ? "◆" : "●"}
            </span>
            <div><strong>{entrada.matricula}</strong><small>{nombreOperador(entrada.matricula)}</small></div>
            <p><strong>{formatearTiempo(entrada.duracion_segundos)}</strong><small>{entrada.intentos} intentos</small></p>
          </li>
        ))}</ol>
      ) : <p className="ranking-vacio">
        {rankingVisible === "general"
          ? "El podio general aparecerá cuando haya operadores que completen los nueve casos."
          : `Todavía no hay resultados para el caso ${rankingVisible}.`}
      </p>}
    </aside>}
    </>
  );
};
