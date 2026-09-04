import React from "react";

const JUEGOS = [
  { id: "codigo", nombre: "Código secreto", icono: "◆" },
  { id: "palabra", nombre: "Palabra clave", icono: "A" },
  { id: "asesino", nombre: "Caso del asesino", icono: "⌕" },
  { id: "flota", nombre: "Hundir la flota", icono: "⚓" },
  { id: "panel", nombre: "Desactivar el panel", icono: "⚡" },
  { id: "infiltrado", nombre: "El infiltrado", icono: "?" },
  { id: "social", nombre: "CRA Social", icono: "💬" },
  { id: "artilleria", nombre: "CRA Artillería", icono: "◎" },
];

/** Permite al administrador rotar los juegos visibles para invitados sin desplegar código. */
export const PanelJuegosInvitados: React.FC = () => {
  const [activos, setActivos] = React.useState<string[]>([]);
  const [guardando, setGuardando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState("Cargando configuración…");

  React.useEffect(() => {
    fetch("/api/administracion/juegos-disponibles", { credentials: "same-origin" })
      .then((r) => r.json()).then((d: { juegos?: string[] }) => { setActivos(d.juegos ?? []); setMensaje(""); })
      .catch(() => setMensaje("No se pudo cargar la selección."));
  }, []);

  const alternar = (id: string) => setActivos((actual) => actual.includes(id) ? actual.filter((j) => j !== id) : [...actual, id]);
  const guardar = async () => {
    if (!activos.length) { setMensaje("Debes dejar al menos un juego habilitado."); return; }
    setGuardando(true); setMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/juegos-disponibles", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ juegos: activos }) });
      const datos = await respuesta.json() as { error?: string; juegos?: string[] };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar.");
      setActivos(datos.juegos ?? activos);
      setMensaje(`Cambios guardados: ${datos.juegos?.length ?? activos.length} juego(s) habilitado(s).`);
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo guardar."); }
    finally { setGuardando(false); }
  };

  return <section className="panel-juegos-invitados" aria-labelledby="titulo-juegos-invitados">
    <header><span>Solo administrador</span><h2 id="titulo-juegos-invitados">Juegos disponibles para invitados</h2><p>Activa o desactiva juegos para ir rotándolos. Como administrador siempre podrás verlos todos.</p></header>
    <div className="juegos-invitados-lista">{JUEGOS.map((juego) => <label className={activos.includes(juego.id) ? "activo" : ""} key={juego.id}><span aria-hidden="true">{juego.icono}</span><strong>{juego.nombre}</strong><input type="checkbox" checked={activos.includes(juego.id)} onChange={() => alternar(juego.id)} /><i aria-hidden="true" /></label>)}</div>
    <footer><p role="status">{mensaje}</p><button type="button" onClick={guardar} disabled={guardando || !activos.length}>{guardando ? "Guardando…" : "Guardar selección"}</button></footer>
  </section>;
};
