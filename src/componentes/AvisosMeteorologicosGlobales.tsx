import React from "react";

type NivelAviso = "rojo" | "naranja" | "amarillo" | "desconocido";
interface AvisoMeteorologico { id: string; nivel: NivelAviso; fenomeno: string; zona: string; descripcion: string; enlace: string; esViento: boolean; rachas: string | null; }
interface RespuestaAvisos { fuente: string; actualizadoEn: string; avisos: AvisoMeteorologico[]; }

const prioridad: Record<NivelAviso, number> = { rojo: 4, naranja: 3, amarillo: 2, desconocido: 1 };

/** Barra persistente con los avisos oficiales activos para las zonas de España. */
export const AvisosMeteorologicosGlobales: React.FC = () => {
  const [datos, establecerDatos] = React.useState<RespuestaAvisos | null>(null);
  const [error, establecerError] = React.useState(false);
  const [abierto, establecerAbierto] = React.useState(false);
  const [actualizando, establecerActualizando] = React.useState(false);

  const cargarAvisos = React.useCallback(async () => {
    establecerActualizando(true);
    try {
      const respuesta = await fetch("/api/avisos-meteorologicos");
      if (!respuesta.ok) throw new Error("Consulta no disponible");
      establecerDatos(await respuesta.json());
      establecerError(false);
    } catch {
      establecerError(true);
    } finally {
      establecerActualizando(false);
    }
  }, []);

  React.useEffect(() => {
    void cargarAvisos();
    const temporizador = window.setInterval(() => void cargarAvisos(), 5 * 60 * 1000);
    const actualizarAlVolver = () => { if (document.visibilityState === "visible") void cargarAvisos(); };
    document.addEventListener("visibilitychange", actualizarAlVolver);
    return () => { window.clearInterval(temporizador); document.removeEventListener("visibilitychange", actualizarAlVolver); };
  }, [cargarAvisos]);

  const avisos = datos?.avisos || [];
  const nivelMaximo = avisos.reduce<NivelAviso>((maximo, aviso) => prioridad[aviso.nivel] > prioridad[maximo] ? aviso.nivel : maximo, "desconocido");
  const avisosViento = avisos.filter((aviso) => aviso.esViento);
  const ordenados = [...avisos].sort((a, b) => Number(b.esViento) - Number(a.esViento) || prioridad[b.nivel] - prioridad[a.nivel] || a.zona.localeCompare(b.zona, "es"));
  const resumen = avisos.length === 0 ? "Sin avisos activos" : `${avisos.length} avisos activos en España`;

  return (
    <section className={`avisos-globales nivel-${nivelMaximo} ${abierto ? "abierto" : ""}`} aria-label="Avisos meteorológicos oficiales de España">
      <button className="avisos-resumen" onClick={() => establecerAbierto((valor) => !valor)} aria-expanded={abierto}>
        <span className="avisos-icono" aria-hidden="true">⚠</span>
        <span><small>Avisos oficiales AEMET</small><strong>{error ? "Información temporalmente no disponible" : resumen}</strong></span>
        {avisos.length > 0 && <span className="avisos-niveles">
          {avisosViento.length > 0 && <b className="nivel-viento">💨 {avisosViento.length} zonas con viento</b>}
          {(["rojo", "naranja", "amarillo"] as NivelAviso[]).map((nivel) => {
            const cantidad = avisos.filter((aviso) => aviso.nivel === nivel).length;
            return cantidad > 0 ? <b className={`nivel-${nivel}`} key={nivel}>{cantidad} {nivel}</b> : null;
          })}
        </span>}
        <span className="avisos-desplegar" aria-hidden="true">{abierto ? "Cerrar ↑" : "Ver zonas ↓"}</span>
      </button>

      {abierto && <div className="avisos-panel">
        <header><div><span>España · Información oficial</span><h2>Zonas con avisos meteorológicos</h2></div><button onClick={() => void cargarAvisos()} disabled={actualizando}>{actualizando ? "Actualizando…" : "Actualizar"}</button></header>
        {error ? <p className="avisos-estado">No ha sido posible conectar con AEMET. Inténtalo de nuevo en unos minutos.</p>
          : ordenados.length === 0 ? <p className="avisos-estado correcto">AEMET no muestra avisos activos en este momento.</p>
          : <div className="avisos-listado">{ordenados.map((aviso) => <article className={`aviso-tarjeta nivel-${aviso.nivel} ${aviso.esViento ? "aviso-viento" : ""}`} key={aviso.id}>
              <span>{aviso.nivel}</span><div><strong>{aviso.fenomeno}</strong><h3>{aviso.zona}</h3><p>{aviso.descripcion}</p></div>
              <a href={aviso.enlace} target="_blank" rel="noreferrer" aria-label={`Ver aviso oficial de ${aviso.zona}`}>AEMET ↗</a>
              {aviso.esViento && <div className="aviso-impacto-viento"><b>💨 {aviso.rachas ? `Rachas ${aviso.rachas}` : "Rachas fuertes"}</b><small>Atención a posibles vibraciones en sensores</small></div>}
            </article>)}</div>}
        <footer><span>Fuente: Agencia Estatal de Meteorología (AEMET)</span>{datos && <time>Actualizado {new Date(datos.actualizadoEn).toLocaleString("es-ES")}</time>}</footer>
      </div>}
    </section>
  );
};
