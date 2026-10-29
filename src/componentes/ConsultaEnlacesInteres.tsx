import React from "react";

interface EnlaceInteres {
  id: number;
  nombre: string;
  url: string;
  color_fondo: string;
  color_texto: string;
}

/** Muestra, sin duplicar datos, los enlaces que el administrador publica en portada. */
export const ConsultaEnlacesInteres: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [enlaces, establecerEnlaces] = React.useState<EnlaceInteres[]>([]);
  const [cargando, establecerCargando] = React.useState(false);
  const [error, establecerError] = React.useState("");

  const cargar = React.useCallback(async () => {
    establecerCargando(true);
    establecerError("");
    try {
      const respuesta = await fetch("/api/enlaces-portada", { credentials: "same-origin", cache: "no-store" });
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json() as { enlaces?: EnlaceInteres[] };
      establecerEnlaces(datos.enlaces ?? []);
    } catch {
      establecerError("No se pudieron cargar los enlaces.");
    } finally {
      establecerCargando(false);
    }
  }, []);

  React.useEffect(() => {
    if (abierto) void cargar();
  }, [abierto, cargar]);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "enlaces") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: seAbrira ? "enlaces" : "ninguna" }));
    establecerAbierto(seAbrira);
  };

  return <aside className={`enlaces-interes-rapidos ${abierto ? "abierto" : ""}`}>
    <button className="enlaces-interes-rapidos-activador" data-nombre="Enlaces de interés" type="button" onClick={alternar} aria-expanded={abierto} aria-label={abierto ? "Cerrar enlaces de interés" : "Abrir enlaces de interés"} title="Enlaces de interés">
      <span className="herramienta-menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M10.4 13.6a4 4 0 0 0 5.66 0l2.12-2.12a4 4 0 0 0-5.66-5.66l-1.2 1.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M13.6 10.4a4 4 0 0 0-5.66 0l-2.12 2.12a4 4 0 0 0 5.66 5.66l1.2-1.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></span>
      <strong>Enlaces</strong>
    </button>

    {abierto && <section className="enlaces-interes-rapidos-panel">
      <header><div><small>Accesos configurados por administración</small><h2>Enlaces de interés</h2></div><button type="button" onClick={alternar} aria-label="Cerrar">×</button></header>
      <div className="enlaces-interes-rapidos-contenido">
        {cargando ? <p className="enlaces-interes-rapidos-estado">Cargando enlaces…</p> : error ? <p className="enlaces-interes-rapidos-estado error">{error}</p> : !enlaces.length ? <p className="enlaces-interes-rapidos-estado">Aún no hay enlaces publicados.</p> : <div className="enlaces-interes-rapidos-lista">
          {enlaces.map((enlace) => <a key={enlace.id} href={enlace.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: enlace.color_fondo, color: enlace.color_texto }}>
            <span aria-hidden="true">↗</span><strong>{enlace.nombre}</strong><small>Se abre en una pestaña nueva</small>
          </a>)}
        </div>}
      </div>
    </section>}
  </aside>;
};
