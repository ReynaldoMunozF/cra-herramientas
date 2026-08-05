import React from "react";
import { useLocation } from "react-router-dom";

interface Sesion { rol: "administrador" | "invitado"; }
interface Feedback {
  id: number;
  matricula: string | null;
  pagina: string;
  mensaje: string;
  creado_en: string;
}

/** Formulario global y, para el administrador, bandeja privada de sugerencias. */
export const FeedbackGlobal: React.FC = () => {
  const ubicacion = useLocation();
  const [abierto, establecerAbierto] = React.useState(false);
  const [rol, establecerRol] = React.useState<Sesion["rol"]>("invitado");
  const [vista, establecerVista] = React.useState<"enviar" | "recibidos">("enviar");
  const [matricula, establecerMatricula] = React.useState("");
  const [mensaje, establecerMensaje] = React.useState("");
  const [estado, establecerEstado] = React.useState("");
  const [recibidos, establecerRecibidos] = React.useState<Feedback[]>([]);

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((datos: Sesion) => establecerRol(datos.rol))
      .catch(() => establecerRol("invitado"));
  }, []);

  const cargarRecibidos = async () => {
    const respuesta = await fetch("/api/administracion/feedback", { credentials: "same-origin" });
    if (!respuesta.ok) return;
    const datos = await respuesta.json() as { feedback: Feedback[] };
    establecerRecibidos(datos.feedback);
  };

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    establecerEstado("Enviando…");
    const respuesta = await fetch("/api/feedback", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula, mensaje, pagina: ubicacion.pathname }),
    });
    if (respuesta.ok) {
      establecerMensaje("");
      establecerEstado("Gracias. Tu sugerencia ha sido enviada.");
    } else {
      establecerEstado("No se pudo enviar la sugerencia.");
    }
  };

  const eliminar = async (id: number) => {
    const respuesta = await fetch("/api/administracion/feedback", {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (respuesta.ok) establecerRecibidos((actuales) => actuales.filter((item) => item.id !== id));
  };

  return (
    <aside className={`feedback-global ${abierto ? "abierto" : ""}`}>
      {abierto && (
        <section className="feedback-panel">
          <header><div><small>Mejora continua</small><h2>Feedback de la aplicación</h2></div><button type="button" onClick={() => establecerAbierto(false)}>×</button></header>
          {rol === "administrador" && (
            <nav>
              <button className={vista === "enviar" ? "activo" : ""} onClick={() => establecerVista("enviar")}>Enviar</button>
              <button className={vista === "recibidos" ? "activo" : ""} onClick={() => { establecerVista("recibidos"); cargarRecibidos(); }}>Recibidos</button>
            </nav>
          )}
          {vista === "enviar" ? (
            <form onSubmit={enviar}>
              <label>Matrícula o nombre (opcional)<input value={matricula} onChange={(evento) => establecerMatricula(evento.target.value)} maxLength={40} /></label>
              <label>¿Qué mejorarías?<textarea value={mensaje} onChange={(evento) => establecerMensaje(evento.target.value)} minLength={5} maxLength={1500} rows={5} required /></label>
              <button type="submit">Enviar sugerencia</button>
              {estado && <p>{estado}</p>}
            </form>
          ) : (
            <div className="feedback-recibidos">
              {recibidos.length === 0 ? <p>No hay sugerencias recibidas.</p> : recibidos.map((item) => (
                <article key={item.id}>
                  <small>{item.matricula || "Anónimo"} · {item.pagina} · {new Date(`${item.creado_en}Z`).toLocaleString("es-ES")}</small>
                  <p>{item.mensaje}</p>
                  <button type="button" onClick={() => eliminar(item.id)}>Eliminar</button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <button className="feedback-activador" type="button" onClick={() => establecerAbierto((valor) => !valor)}>
        <span aria-hidden="true">✎</span> Feedback
      </button>
    </aside>
  );
};
