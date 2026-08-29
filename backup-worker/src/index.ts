interface Env {
  CONTENIDO_DB: D1Database;
  RESPALDOS: KVNamespace;
}

const PAGE_SIZE = 500;
const TABLES = [
  "cambios_cuadrante",
  "codigos_operativos_personalizados",
  "codigos_postales_cache",
  "comentarios_frecuentes",
  "computo_anual_turnos",
  "configuracion_juegos_invitados",
  "configuracion_palabra_clave",
  "d1_migrations",
  "estadisticas_uso",
  "feedback_usuarios",
  "jugadores_infiltrado",
  "partidas_caso_asesino",
  "partidas_codigo_secreto",
  "partidas_palabra_clave",
  "registros_productividad",
  "rincon_javi",
  "rincon_javi_historial",
  "rincon_javi_votos",
  "salas_hundir_flota",
  "salas_infiltrado",
  "telefonos_interes",
  "validaciones_fse",
  "versiones_manual",
] as const;

async function buildDataBackup(db: D1Database, createdAt: string): Promise<{ json: string; tables: number; rows: number }> {
  const data: Record<string, Record<string, unknown>[]> = {};
  let rowCount = 0;

  for (const table of TABLES) {
    const tableRows: Record<string, unknown>[] = [];
    let offset = 0;
    while (true) {
      const page = await db
        .prepare(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`)
        .bind(PAGE_SIZE, offset)
        .all<Record<string, unknown>>();
      const rows = page.results ?? [];
      tableRows.push(...rows);
      rowCount += rows.length;
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    data[table] = tableRows;
  }

  return {
    json: JSON.stringify({ format: "manual-cra-d1-data-v1", database: "manual-cra-contenido", createdAt, tables: data }),
    tables: TABLES.length,
    rows: rowCount,
  };
}

async function gzip(value: string): Promise<ArrayBuffer> {
  const stream = new Blob([value]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

async function runBackup(env: Env, scheduledTime: number): Promise<void> {
  const createdAt = new Date(scheduledTime || Date.now()).toISOString();
  try {
    const backup = await buildDataBackup(env.CONTENIDO_DB, createdAt);
    const compressed = await gzip(backup.json);
    const safeTimestamp = createdAt.replaceAll(":", "-");
    const key = `diarias/${createdAt.slice(0, 7)}/manual-cra-contenido-${safeTimestamp}.json.gz`;
    const checksum = await crypto.subtle.digest("SHA-256", compressed);
    const sha256 = Array.from(new Uint8Array(checksum), (byte) => byte.toString(16).padStart(2, "0")).join("");

    await env.RESPALDOS.put(key, compressed, {
      expirationTtl: 30 * 24 * 60 * 60,
      metadata: {
        database: "manual-cra-contenido",
        createdAt,
        tables: String(backup.tables),
        rows: String(backup.rows),
        sha256,
      },
    });

    const stored = await env.RESPALDOS.get(key, "arrayBuffer");
    if (!stored || stored.byteLength !== compressed.byteLength) {
      throw new Error("La verificación del archivo guardado no coincide con el tamaño generado.");
    }

    await env.RESPALDOS.put(
      "estado/ultima-copia.json",
      JSON.stringify({ ok: true, createdAt, key, bytes: stored.byteLength, tables: backup.tables, rows: backup.rows, sha256 }, null, 2),
    );
    await env.RESPALDOS.delete("estado/ultimo-error.json");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.RESPALDOS.put(
      "estado/ultimo-error.json",
      JSON.stringify({ ok: false, createdAt, message }, null, 2),
    );
    throw error;
  }
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runBackup(env, controller.scheduledTime));
  },
};
