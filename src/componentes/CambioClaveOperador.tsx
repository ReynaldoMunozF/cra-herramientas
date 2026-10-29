import React from "react";

/** Acceso discreto para que cada cuenta personal pueda renovar su propia contraseña. */
export const CambioClaveOperador: React.FC = () => {
  const [esOperador, establecerEsOperador] = React.useState(false);
  const [abierto, establecerAbierto] = React.useState(false);
  const [actual, establecerActual] = React.useState("");
  const [nueva, establecerNueva] = React.useState("");
  const [confirmacion, establecerConfirmacion] = React.useState("");
  const [mensaje, establecerMensaje] = React.useState("");
  const [guardando, establecerGuardando] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin", cache: "no-store" })
      .then((respuesta) => respuesta.json()).then((sesion: { rol?: string }) => establecerEsOperador(sesion.rol === "operador"))
      .catch(() => establecerEsOperador(false));
  }, []);
  if (!esOperador) return null;
  const cambiar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (nueva.length < 10) { establecerMensaje("La nueva contraseña debe tener al menos 10 caracteres."); return; }
    if (nueva !== confirmacion) { establecerMensaje("La nueva contraseña y la confirmación no coinciden."); return; }
    establecerGuardando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/cambiar-clave", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actual, nueva }) });
      const datos = await respuesta.json() as { error?: string; cambiada?: boolean };
      if (!respuesta.ok || !datos.cambiada) throw new Error(datos.error ?? "No se pudo cambiar la contraseña.");
      window.location.assign("/cerrar-sesion");
    } catch (error) { establecerMensaje(error instanceof Error ? error.message : "No se pudo cambiar la contraseña."); }
    finally { establecerGuardando(false); }
  };
  return <div className="cambio-clave-operador"><button type="button" onClick={() => { establecerAbierto(true); establecerMensaje(""); }}>Cambiar contraseña</button>{abierto && <form onSubmit={cambiar}><h2>Actualizar contraseña</h2><p>Al guardarla se cerrará tu sesión; vuelve a entrar con la nueva contraseña.</p><label>Contraseña actual<input type="password" autoComplete="current-password" value={actual} onChange={(evento) => establecerActual(evento.target.value)} required /></label><label>Nueva contraseña<input type="password" autoComplete="new-password" value={nueva} onChange={(evento) => establecerNueva(evento.target.value)} required /></label><label>Repite la nueva contraseña<input type="password" autoComplete="new-password" value={confirmacion} onChange={(evento) => establecerConfirmacion(evento.target.value)} required /></label>{mensaje && <p role="alert">{mensaje}</p>}<div><button type="button" onClick={() => establecerAbierto(false)}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar contraseña"}</button></div></form>}</div>;
};
