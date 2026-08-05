import { ContextoPagina, responderJson } from "./_utilidades";

type EstadoSala = "espera" | "preparacion" | "en_curso" | "finalizada" | "abandonada";
interface Disparo { celda: number; impacto: boolean; }
interface Sala {
  id: string; codigo: string; jugador1: string; jugador2: string | null;
  flota1: string | null; flota2: string | null; disparos1: string; disparos2: string;
  listo1: number; listo2: number; turno: string | null; ganador: string | null;
  estado: EstadoSala; creada_en: number; actualizada_en: number;
}

const TAMANO = 8;
const BARCOS = [3, 3, 2, 2, 2, 1, 1];
const NOMBRES_VEHICULOS = [
  "Furgón blindado 1",
  "Furgón blindado 2",
  "Coche de intervención 1",
  "Coche de intervención 2",
  "Coche de intervención 3",
  "Acuda pequeño 1",
  "Acuda pequeño 2",
];
const ACTIVOS = ["espera", "preparacion", "en_curso"];
const normalizarMatricula = (valor: unknown) => {
  const matricula = typeof valor === "string" ? valor.trim().toUpperCase() : "";
  return /^[A-Z0-9]{2,8}$/.test(matricula) ? matricula : null;
};
const normalizarCodigo = (valor: unknown) => {
  const codigo = typeof valor === "string" ? valor.trim().toUpperCase().replace(/^CRA-/, "") : "";
  return /^[A-Z2-9]{4}$/.test(codigo) ? codigo : null;
};
const aleatorio = (maximo: number) => {
  const valor = new Uint32Array(1); crypto.getRandomValues(valor); return valor[0] % maximo;
};
const crearCodigo = () => {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => caracteres[aleatorio(caracteres.length)]).join("");
};
const leerJson = <T,>(valor: string | null, reserva: T): T => {
  try { return valor ? JSON.parse(valor) as T : reserva; } catch { return reserva; }
};
const flotaValida = (valor: unknown): valor is number[][] => {
  if (!Array.isArray(valor) || valor.length !== BARCOS.length) return false;
  const ocupadas = new Set<number>();
  return valor.every((barco, indice) => {
    if (!Array.isArray(barco) || barco.length !== BARCOS[indice]) return false;
    const celdas = barco.map(Number);
    if (celdas.some((celda) => !Number.isInteger(celda) || celda < 0 || celda >= TAMANO * TAMANO || ocupadas.has(celda))) return false;
    const filas = new Set(celdas.map((celda) => Math.floor(celda / TAMANO)));
    const columnas = new Set(celdas.map((celda) => celda % TAMANO));
    const ordenadas = [...celdas].sort((a, b) => a - b);
    const horizontal = filas.size === 1 && ordenadas.every((celda, posicion) => !posicion || celda === ordenadas[posicion - 1] + 1);
    const vertical = columnas.size === 1 && ordenadas.every((celda, posicion) => !posicion || celda === ordenadas[posicion - 1] + TAMANO);
    if (!horizontal && !vertical) return false;
    celdas.forEach((celda) => ocupadas.add(celda));
    return true;
  });
};
const crearFlota = () => {
  for (let intento = 0; intento < 200; intento += 1) {
    const flota: number[][] = []; const ocupadas = new Set<number>();
    for (const longitud of BARCOS) {
      let colocado = false;
      for (let prueba = 0; prueba < 100 && !colocado; prueba += 1) {
        const horizontal = aleatorio(2) === 0;
        const fila = aleatorio(horizontal ? TAMANO : TAMANO - longitud + 1);
        const columna = aleatorio(horizontal ? TAMANO - longitud + 1 : TAMANO);
        const barco = Array.from({ length: longitud }, (_, i) => (fila + (horizontal ? 0 : i)) * TAMANO + columna + (horizontal ? i : 0));
        if (barco.every((celda) => !ocupadas.has(celda))) {
          barco.forEach((celda) => ocupadas.add(celda)); flota.push(barco); colocado = true;
        }
      }
    }
    if (flotaValida(flota)) return flota;
  }
  return [[0, 1, 2], [8, 9, 10], [16, 17], [24, 25], [32, 33], [48], [56]];
};
const limpiar = async (db: ContextoPagina["env"]["CONTENIDO_DB"]) => {
  // Invalida salas antiguas: ambos jugadores deben usar la flota actual completa.
  await db.prepare(`UPDATE salas_hundir_flota SET estado='abandonada', actualizada_en=unixepoch()
    WHERE estado IN ('preparacion','en_curso') AND (
      (flota1 IS NOT NULL AND json_array_length(flota1)<>?) OR
      (flota2 IS NOT NULL AND json_array_length(flota2)<>?)
    )`).bind(BARCOS.length, BARCOS.length).run();
  await db.prepare(`UPDATE salas_hundir_flota SET estado='abandonada', actualizada_en=unixepoch()
    WHERE estado='espera' AND actualizada_en < unixepoch()-900`).run();
  await db.prepare(`UPDATE salas_hundir_flota SET estado='abandonada', actualizada_en=unixepoch()
    WHERE estado IN ('preparacion','en_curso') AND actualizada_en < unixepoch()-3600`).run();
};
const obtenerSala = (db: ContextoPagina["env"]["CONTENIDO_DB"], codigo: string) => db.prepare(
  `SELECT * FROM salas_hundir_flota WHERE codigo=?`
).bind(codigo).first<Sala>();
const respuestaSala = (sala: Sala, matricula: string) => {
  const primero = sala.jugador1 === matricula;
  if (!primero && sala.jugador2 !== matricula) return null;
  const miFlota = leerJson<number[][]>(primero ? sala.flota1 : sala.flota2, []);
  const misDisparos = leerJson<Disparo[]>(primero ? sala.disparos1 : sala.disparos2, []);
  const recibidos = leerJson<Disparo[]>(primero ? sala.disparos2 : sala.disparos1, []);
  return {
    codigo: `CRA-${sala.codigo}`, estado: sala.estado, jugador: matricula,
    rival: primero ? sala.jugador2 : sala.jugador1, miFlota, misDisparos,
    disparosRecibidos: recibidos, listo: Boolean(primero ? sala.listo1 : sala.listo2),
    rivalListo: Boolean(primero ? sala.listo2 : sala.listo1), turno: sala.turno,
    ganador: sala.ganador, creadaEn: sala.creada_en,
  };
};

/** Motor de Hundir la flota: la flota rival nunca se entrega al navegador. */
export const onRequest = async (contexto: ContextoPagina) => {
  const db = contexto.env.CONTENIDO_DB;
  await limpiar(db);
  const metodo = contexto.request.method.toUpperCase();
  if (metodo === "GET") {
    const url = new URL(contexto.request.url);
    const codigo = normalizarCodigo(url.searchParams.get("codigo"));
    const matricula = normalizarMatricula(url.searchParams.get("matricula"));
    if (codigo && matricula) {
      const sala = await obtenerSala(db, codigo);
      const datos = sala && respuestaSala(sala, matricula);
      return datos ? responderJson({ sala: datos }) : responderJson({ error: "La sala no existe o no perteneces a ella." }, 404);
    }
    const [pendientes, ranking] = await Promise.all([
      db.prepare(`SELECT codigo, jugador1, creada_en FROM salas_hundir_flota WHERE estado='espera' ORDER BY creada_en DESC LIMIT 20`).all(),
      db.prepare(`WITH jugadores AS (
        SELECT jugador1 matricula, ganador FROM salas_hundir_flota WHERE estado='finalizada'
        UNION ALL SELECT jugador2, ganador FROM salas_hundir_flota WHERE estado='finalizada' AND jugador2 IS NOT NULL
      ) SELECT matricula, COUNT(*) partidas, SUM(CASE WHEN ganador=matricula THEN 1 ELSE 0 END) victorias
        FROM jugadores GROUP BY matricula ORDER BY victorias DESC, partidas ASC LIMIT 10`).all(),
    ]);
    return responderJson({ pendientes: pendientes.results ?? [], ranking: ranking.results ?? [] });
  }
  if (metodo !== "POST") return responderJson({ error: "Método no permitido." }, 405);
  let datos: Record<string, unknown>;
  try { datos = await contexto.request.json(); } catch { return responderJson({ error: "Datos no válidos." }, 400); }
  const accion = typeof datos.accion === "string" ? datos.accion : "";
  const matricula = normalizarMatricula(datos.matricula);
  if (!matricula) return responderJson({ error: "Matrícula no válida." }, 400);

  if (accion === "crear") {
    const activas = await db.prepare(`SELECT COUNT(*) total FROM salas_hundir_flota WHERE estado IN ('espera','preparacion','en_curso')`).first<{ total: number }>();
    if ((activas?.total ?? 0) >= 50) return responderJson({ error: "Se alcanzó el límite temporal de 50 partidas activas." }, 409);
    const existente = await db.prepare(`SELECT codigo FROM salas_hundir_flota WHERE estado IN ('espera','preparacion','en_curso') AND (jugador1=? OR jugador2=?)`).bind(matricula, matricula).first<{ codigo: string }>();
    if (existente) return responderJson({ codigo: `CRA-${existente.codigo}`, recuperada: true });
    for (let intento = 0; intento < 8; intento += 1) {
      const codigo = crearCodigo();
      try {
        await db.prepare(`INSERT INTO salas_hundir_flota (id,codigo,jugador1,estado,creada_en,actualizada_en) VALUES (?,?,?,'espera',unixepoch(),unixepoch())`)
          .bind(crypto.randomUUID(), codigo, matricula).run();
        return responderJson({ codigo: `CRA-${codigo}` });
      } catch { /* Código ocupado: genera otro. */ }
    }
    return responderJson({ error: "No se pudo generar un código libre." }, 503);
  }

  const codigo = normalizarCodigo(datos.codigo);
  if (!codigo) return responderJson({ error: "Código de sala no válido." }, 400);
  let sala = await obtenerSala(db, codigo);
  if (!sala) return responderJson({ error: "La sala no existe o ha caducado." }, 404);

  if (accion === "unirse") {
    if (sala.jugador1 === matricula || sala.jugador2 === matricula) return responderJson({ sala: respuestaSala(sala, matricula) });
    const otra = await db.prepare(`SELECT codigo FROM salas_hundir_flota WHERE estado IN ('espera','preparacion','en_curso') AND (jugador1=? OR jugador2=?)`).bind(matricula, matricula).first();
    if (otra) return responderJson({ error: "Ya participas en otra partida activa." }, 409);
    const resultado = await db.prepare(`UPDATE salas_hundir_flota SET jugador2=?, estado='preparacion', actualizada_en=unixepoch() WHERE codigo=? AND estado='espera' AND jugador2 IS NULL`).bind(matricula, codigo).run() as { meta?: { changes?: number } };
    if (!resultado.meta?.changes) return responderJson({ error: "Otro jugador ya ocupó esta sala." }, 409);
    sala = (await obtenerSala(db, codigo))!;
    return responderJson({ sala: respuestaSala(sala, matricula) });
  }

  const primero = sala.jugador1 === matricula;
  if (!primero && sala.jugador2 !== matricula) return responderJson({ error: "No perteneces a esta sala." }, 403);

  if (accion === "colocar") {
    if (sala.estado !== "preparacion") return responderJson({ error: "La colocación ya terminó." }, 409);
    const flota = datos.automatica ? crearFlota() : datos.flota;
    if (!flotaValida(flota)) return responderJson({ error: "La flota no tiene la disposición correcta." }, 400);
    const campoFlota = primero ? "flota1" : "flota2"; const campoListo = primero ? "listo1" : "listo2";
    await db.prepare(`UPDATE salas_hundir_flota SET ${campoFlota}=?, ${campoListo}=1, actualizada_en=unixepoch() WHERE codigo=? AND estado='preparacion'`)
      .bind(JSON.stringify(flota), codigo).run();
    sala = (await obtenerSala(db, codigo))!;
    if (sala.listo1 && sala.listo2) {
      await db.prepare(`UPDATE salas_hundir_flota SET estado='en_curso', turno=jugador1, actualizada_en=unixepoch() WHERE codigo=? AND estado='preparacion'`).bind(codigo).run();
      sala = (await obtenerSala(db, codigo))!;
    }
    return responderJson({ sala: respuestaSala(sala, matricula) });
  }

  if (accion === "disparar") {
    const celda = Number(datos.celda);
    if (sala.estado !== "en_curso" || sala.turno !== matricula || !Number.isInteger(celda) || celda < 0 || celda >= 64) {
      return responderJson({ error: "No puedes disparar ahora o la casilla no es válida." }, 409);
    }
    const tiros = leerJson<Disparo[]>(primero ? sala.disparos1 : sala.disparos2, []);
    if (tiros.some((tiro) => tiro.celda === celda)) return responderJson({ error: "Ya habías disparado en esa casilla." }, 409);
    const flotaRival = leerJson<number[][]>(primero ? sala.flota2 : sala.flota1, []);
    const impacto = flotaRival.flat().includes(celda); tiros.push({ celda, impacto });
    const indiceVehiculo = flotaRival.findIndex((vehiculo) => vehiculo.includes(celda));
    const vehiculoHundido = indiceVehiculo >= 0 && flotaRival[indiceVehiculo].every((posicion) =>
      tiros.some((tiro) => tiro.celda === posicion && tiro.impacto)
    ) ? NOMBRES_VEHICULOS[indiceVehiculo] : null;
    const hundida = flotaRival.flat().every((posicion) => tiros.some((tiro) => tiro.celda === posicion && tiro.impacto));
    const campo = primero ? "disparos1" : "disparos2"; const rival = primero ? sala.jugador2 : sala.jugador1;
    const resultado = await db.prepare(`UPDATE salas_hundir_flota SET ${campo}=?, turno=?, estado=?, ganador=?, finalizada_en=CASE WHEN ?='finalizada' THEN unixepoch() ELSE NULL END, actualizada_en=unixepoch() WHERE codigo=? AND estado='en_curso' AND turno=?`)
      .bind(JSON.stringify(tiros), rival, hundida ? "finalizada" : "en_curso", hundida ? matricula : null, hundida ? "finalizada" : "en_curso", codigo, matricula).run() as { meta?: { changes?: number } };
    if (!resultado.meta?.changes) return responderJson({ error: "El turno ya había cambiado." }, 409);
    sala = (await obtenerSala(db, codigo))!;
    return responderJson({ impacto, vehiculoHundido, victoria: hundida, sala: respuestaSala(sala, matricula) });
  }

  if (accion === "abandonar") {
    const ganador = sala.jugador2 ? (primero ? sala.jugador2 : sala.jugador1) : null;
    await db.prepare(`UPDATE salas_hundir_flota SET estado=?, ganador=?, finalizada_en=unixepoch(), actualizada_en=unixepoch() WHERE codigo=? AND estado IN ('espera','preparacion','en_curso')`)
      .bind(ganador ? "finalizada" : "abandonada", ganador, codigo).run();
    return responderJson({ abandonada: true });
  }
  return responderJson({ error: "Acción no permitida." }, 400);
};
