import React from "react";

interface FilaEstadistica {
  tipo: string;
  total: number;
  hoy: number;
  ultimos_siete_dias: number;
}

interface RespuestaEstadisticas {
  estadisticas: FilaEstadistica[];
  actualizadoEn: string;
}

const indicadores = [
  { tipo: "busqueda_direccion", titulo: "Direcciones", icono: "⌖" },
  { tipo: "busqueda_coordenadas", titulo: "Coordenadas", icono: "◎" },
  { tipo: "copia_comentario", titulo: "Comentarios copiados", icono: "▤" },
  { tipo: "uso_manual", titulo: "Entradas al manual", icono: "◇" },
  { tipo: "uso_cuadrante", titulo: "Entradas al cuadrante", icono: "▦" },
  { tipo: "consulta_clima", titulo: "Consultas de clima", icono: "☁" },
  { tipo: "consulta_fse", titulo: "Consultas FSE", icono: "◉" },
];

/** Cuadro privado que resume el uso real de las funciones principales. */
export const PanelEstadisticasUso: React.FC = () => {
  const [datos, establecerDatos] = React.useState<RespuestaEstadisticas | null>(null);
  const [cargando, establecerCargando] = React.useState(true);
  const [error, establecerError] = React.useState("");

  const cargar = React.useCallback(async () => {
    establecerCargando(true);
    establecerError("");
    try {
      const respuesta = await fetch("/api/administracion/estadisticas", { credentials: "same-origin" });
      if (!respuesta.ok) throw new Error();
      establecerDatos(await respuesta.json() as RespuestaEstadisticas);
    } catch {
      establecerError("No se pudieron cargar las estadísticas.");
    } finally {
      establecerCargando(false);
    }
  }, []);

  React.useEffect(() => { void cargar(); }, [cargar]);

  const porTipo = new Map((datos?.estadisticas ?? []).map((fila) => [fila.tipo, fila]));
  const totalGeneral = Array.from(porTipo.values()).reduce((suma, fila) => suma + Number(fila.total), 0);

  return (
    <section className="estadisticas-uso" aria-labelledby="titulo-estadisticas">
      <header>
        <div>
          <span>Solo administrador</span>
          <h2 id="titulo-estadisticas">Funcionamiento de la aplicación</h2>
          <p>Acciones completadas por todos los usuarios y equipos.</p>
        </div>
        <div className="estadisticas-resumen"><strong>{totalGeneral}</strong><small>usos registrados</small></div>
        <button type="button" onClick={() => void cargar()} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </header>
      {error ? <p className="estadisticas-error">{error}</p> : (
        <div className="estadisticas-cuadricula">
          {indicadores.map((indicador) => {
            const fila = porTipo.get(indicador.tipo);
            return (
              <article key={indicador.tipo}>
                <span aria-hidden="true">{indicador.icono}</span>
                <div><h3>{indicador.titulo}</h3><strong>{Number(fila?.total ?? 0)}</strong></div>
                <dl>
                  <div><dt>Hoy</dt><dd>{Number(fila?.hoy ?? 0)}</dd></div>
                  <div><dt>7 días</dt><dd>{Number(fila?.ultimos_siete_dias ?? 0)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
      {datos && <small className="estadisticas-actualizacion">Actualizado {new Date(datos.actualizadoEn).toLocaleString("es-ES")}</small>}
    </section>
  );
};
