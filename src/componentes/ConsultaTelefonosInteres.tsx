import React from "react";
import iconoTelefonos from "../recursos/herramientas/telefonos.svg";

interface TelefonoInteres {
  id: number;
  nombre: string;
  telefono: string;
  descripcion: string;
  actualizado_en: number;
}

const formatearTelefono = (telefono: string) => {
  const tienePrefijo = telefono.trim().startsWith("+");
  const digitos = telefono.replace(/\D/g, "");
  const agrupado = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${tienePrefijo ? "+" : ""}${agrupado}`;
};

export const ConsultaTelefonosInteres: React.FC<{ esAdministrador: boolean }> = ({ esAdministrador }) => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [telefonos, establecerTelefonos] = React.useState<TelefonoInteres[]>([]);
  const [nombre, establecerNombre] = React.useState("");
  const [telefono, establecerTelefono] = React.useState("");
  const [descripcion, establecerDescripcion] = React.useState("");
  const [mensaje, establecerMensaje] = React.useState("");
  const [cargando, establecerCargando] = React.useState(false);
  const [copiado, establecerCopiado] = React.useState<number | null>(null);

  const cargar = React.useCallback(async (silencioso = false) => {
    if (!silencioso) establecerCargando(true);
    try {
      const respuesta = await fetch("/api/telefonos-interes", { credentials: "same-origin", cache: "no-store" });
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json() as { telefonos?: TelefonoInteres[] };
      establecerTelefonos(datos.telefonos ?? []);
      if (silencioso) establecerMensaje((actual) => actual === "Actualizando…" ? "Lista actualizada." : actual);
    } catch {
      if (!silencioso) establecerMensaje("No se pudo cargar la lista.");
    } finally {
      if (!silencioso) establecerCargando(false);
    }
  }, []);

  React.useEffect(() => {
    if (!abierto) return undefined;
    cargar();
    const intervalo = window.setInterval(() => cargar(true), 4000);
    return () => window.clearInterval(intervalo);
  }, [abierto, cargar]);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "telefonos") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: seAbrira ? "telefonos" : "ninguna" }));
    establecerAbierto(seAbrira);
    establecerMensaje("");
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!nombre.trim() || !telefono.trim()) return;
    establecerCargando(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/telefonos-interes", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, descripcion }),
      });
      if (!respuesta.ok) throw new Error();
      establecerNombre(""); establecerTelefono(""); establecerDescripcion("");
      establecerMensaje("Teléfono publicado. Los demás lo verán automáticamente.");
      await cargar(true);
    } catch { establecerMensaje("No se pudo guardar el teléfono."); }
    finally { establecerCargando(false); }
  };

  const eliminar = async (id: number) => {
    if (!window.confirm("¿Eliminar este teléfono de la lista compartida?")) return;
    establecerCargando(true);
    try {
      const respuesta = await fetch("/api/administracion/telefonos-interes", {
        method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!respuesta.ok) throw new Error();
      establecerTelefonos((actuales) => actuales.filter((item) => item.id !== id));
      establecerMensaje("Teléfono eliminado.");
    } catch { establecerMensaje("No se pudo eliminar el teléfono."); }
    finally { establecerCargando(false); }
  };

  const copiar = async (item: TelefonoInteres) => {
    try {
      await navigator.clipboard.writeText(item.telefono);
      establecerCopiado(item.id);
      window.setTimeout(() => establecerCopiado(null), 1400);
    } catch { establecerMensaje("El navegador no permitió copiar."); }
  };

  return <aside className={`telefonos-interes ${abierto ? "esta-abierto" : ""}`}>
    <button className="telefonos-interes-activador" data-nombre="Teléfonos" type="button" onClick={alternar} aria-label="Teléfonos de interés" title="Teléfonos de interés">
      <span className="herramienta-menu-icono" aria-hidden="true"><img src={iconoTelefonos} alt="" /></span>
      <strong>Teléfonos</strong>
    </button>
    {abierto && <section className="telefonos-interes-panel">
      <header><div><small>Lista compartida · actualización automática</small><h2>Teléfonos de interés</h2></div><button type="button" onClick={alternar} aria-label="Cerrar">×</button></header>
      <div className="telefonos-interes-contenido">
        {esAdministrador && <form className="telefonos-interes-formulario" onSubmit={guardar}>
          <strong>Añadir un teléfono</strong>
          <label>Nombre o servicio<input maxLength={100} value={nombre} onChange={(e) => establecerNombre(e.target.value)} placeholder="Ej. Soporte técnico" required /></label>
          <label>Teléfono<input type="tel" maxLength={30} value={telefono} onChange={(e) => establecerTelefono(e.target.value)} placeholder="Ej. 900 000 000" required /></label>
          <label>Nota opcional<input maxLength={240} value={descripcion} onChange={(e) => establecerDescripcion(e.target.value)} placeholder="Horario, extensión o indicación" /></label>
          <button type="submit" disabled={cargando || !nombre.trim() || !telefono.trim()}>Publicar para todos</button>
        </form>}
        {mensaje && <p className="telefonos-interes-mensaje" aria-live="polite">{mensaje}</p>}
        {cargando && !telefonos.length ? <p className="telefonos-interes-vacio">Cargando teléfonos…</p> : !telefonos.length ? <p className="telefonos-interes-vacio">Todavía no hay teléfonos publicados.</p> : <div className="telefonos-interes-lista">
          {telefonos.map((item) => <article key={item.id}>
            <div><strong>{item.nombre}</strong>{item.descripcion && <small>{item.descripcion}</small>}</div>
            <a href={`tel:${item.telefono.replace(/[^0-9+]/g, "")}`} aria-label={`Llamar al ${item.telefono}`}>{formatearTelefono(item.telefono)}</a>
            <div className="telefonos-interes-acciones"><button type="button" onClick={() => copiar(item)}>{copiado === item.id ? "Copiado" : "Copiar"}</button>{esAdministrador && <button className="eliminar" type="button" disabled={cargando} onClick={() => eliminar(item.id)}>Eliminar</button>}</div>
          </article>)}
        </div>}
      </div>
    </section>}
  </aside>;
};
