import React from "react";

/** Control destructivo reservado al administrador y protegido por dos confirmaciones. */
export const PanelReinicioMarcadores: React.FC = () => {
  const [confirmando, establecerConfirmando] = React.useState(false);
  const [procesando, establecerProcesando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");

  const reiniciar = async () => {
    if (!window.confirm("Última confirmación: ¿quieres borrar todos los marcadores y rankings? Esta acción no se puede deshacer.")) return;
    establecerProcesando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/marcadores", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion: "REINICIAR_MARCADORES" }),
      });
      const datos = await respuesta.json() as { eliminados?: number; error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudieron reiniciar los marcadores.");
      establecerMensaje(`Marcadores reiniciados. Se eliminaron ${datos.eliminados ?? 0} resultados.`);
      establecerConfirmando(false);
    } catch (error) {
      establecerMensaje(error instanceof Error ? error.message : "No se pudieron reiniciar los marcadores.");
    } finally { establecerProcesando(false); }
  };

  return <section className="panel-reinicio-marcadores" aria-labelledby="titulo-reinicio-marcadores">
    <div><span>Solo administrador</span><h2 id="titulo-reinicio-marcadores">Marcadores de los juegos</h2><p>Reinicia las clasificaciones sin afectar partidas activas ni otros datos.</p></div>
    {!confirmando ? <button type="button" onClick={() => establecerConfirmando(true)}>Reiniciar marcadores</button> : <div className="reinicio-confirmacion"><strong>¿Seguro que quieres borrar todos los resultados?</strong><button type="button" onClick={() => establecerConfirmando(false)} disabled={procesando}>Cancelar</button><button type="button" className="peligro" onClick={reiniciar} disabled={procesando}>{procesando ? "Reiniciando…" : "Sí, reiniciar todo"}</button></div>}
    {mensaje && <p className="reinicio-mensaje" role="status">{mensaje}</p>}
  </section>;
};
