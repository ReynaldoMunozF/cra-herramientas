import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";
import { registrarUso } from "../servicios/estadisticasUso";
import iconoComentarios from "../recursos/herramientas/comentarios.svg";

type VistaComentarios = "lista" | "gestionar";

interface ComentarioGuardado {
  id: number;
  matricula: string;
  texto: string;
  creado_en: string;
  orden: number;
}

const CLAVE_COMENTARIOS_ANTERIORES = "cra-comentarios-personales-v1";
const CLAVE_OPERADOR_COMENTARIOS = "cra-operador-comentarios";

/** Une operadores de todos los meses sin repetir sus matrículas. */
const operadoresComentarios = Array.from(
  new Map(
    CUADRANTES.flatMap((cuadrante) => cuadrante.operadores).map((operador) => [
      operador.matricula,
      operador,
    ])
  ).values()
).sort((operadorA, operadorB) => {
  if (operadorA.matricula === "RMI") return -1;
  if (operadorB.matricula === "RMI") return 1;
  return operadorA.matricula.localeCompare(operadorB.matricula);
});

/** Copia desde el documento real, incluida la ventana Picture-in-Picture. */
const copiarTexto = async (texto: string, documentoActivo: Document) => {
  const elemento = documentoActivo.createElement("textarea");
  elemento.value = texto;
  elemento.style.cssText = "position:fixed;left:-9999px;opacity:0";
  documentoActivo.body.appendChild(elemento);
  elemento.focus();
  elemento.select();
  elemento.setSelectionRange(0, texto.length);
  const copiadoClasico = documentoActivo.execCommand("copy");
  elemento.remove();

  if (copiadoClasico) return;
  const portapapeles =
    documentoActivo.defaultView?.navigator.clipboard ?? navigator.clipboard;
  if (!portapapeles?.writeText) throw new Error("Portapapeles no disponible");
  await portapapeles.writeText(texto);
};

/** Comentarios compartidos mediante la base de datos central de Cloudflare. */
export const ConsultaComentariosRapidos: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [vista, establecerVista] = React.useState<VistaComentarios>("lista");
  const [comentarios, establecerComentarios] = React.useState<ComentarioGuardado[]>([]);
  const [nuevoComentario, establecerNuevoComentario] = React.useState("");
  const [cargando, establecerCargando] = React.useState(false);
  const [mensaje, establecerMensaje] = React.useState("");
  const [copiado, establecerCopiado] = React.useState<number | null>(null);
  const [matricula, establecerMatricula] = React.useState(
    () => localStorage.getItem(CLAVE_OPERADOR_COMENTARIOS) ?? "RMI"
  );

  const cargarComentarios = React.useCallback(async () => {
    establecerCargando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch(
        `/api/comentarios?matricula=${encodeURIComponent(matricula)}`,
        { credentials: "same-origin" }
      );
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json() as { comentarios: ComentarioGuardado[] };

      // Migra una sola vez los textos creados con la versión que usaba localStorage.
      const anteriores = JSON.parse(localStorage.getItem(CLAVE_COMENTARIOS_ANTERIORES) ?? "[]");
      if (Array.isArray(anteriores) && anteriores.length > 0) {
        await Promise.all(
          anteriores
            .filter((texto): texto is string => typeof texto === "string" && Boolean(texto.trim()))
            .map((texto) =>
              fetch("/api/comentarios", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto, matricula: "RMI" }),
              })
            )
        );
        localStorage.removeItem(CLAVE_COMENTARIOS_ANTERIORES);
        const respuestaActualizada = await fetch(
          `/api/comentarios?matricula=${encodeURIComponent(matricula)}`,
          { credentials: "same-origin" }
        );
        const datosActualizados = await respuestaActualizada.json() as { comentarios: ComentarioGuardado[] };
        establecerComentarios(datosActualizados.comentarios);
      } else {
        establecerComentarios(datos.comentarios);
      }
    } catch {
      establecerMensaje("No se pudieron cargar los comentarios.");
    } finally {
      establecerCargando(false);
    }
  }, [matricula]);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "comentarios") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  React.useEffect(() => {
    if (abierto) cargarComentarios();
  }, [abierto, cargarComentarios]);

  React.useEffect(() => {
    localStorage.setItem(CLAVE_OPERADOR_COMENTARIOS, matricula);
  }, [matricula]);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(
      new CustomEvent("herramienta-flotante-abierta", {
        detail: seAbrira ? "comentarios" : "ninguna",
      })
    );
    establecerAbierto(seAbrira);
  };

  const copiar = async (
    comentario: ComentarioGuardado,
    documentoActivo: Document
  ) => {
    try {
      await copiarTexto(comentario.texto, documentoActivo);
      registrarUso("copia_comentario");
      establecerCopiado(comentario.id);
      window.setTimeout(() => establecerCopiado(null), 1600);
    } catch {
      establecerMensaje("El navegador no permitió copiar el texto.");
    }
  };

  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const texto = nuevoComentario.trim();
    if (!texto) return;

    establecerCargando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch("/api/comentarios", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, matricula }),
      });
      if (!respuesta.ok) throw new Error();
      establecerNuevoComentario("");
      establecerMensaje("Comentario guardado para todos tus equipos.");
      await cargarComentarios();
    } catch {
      establecerMensaje("No se pudo guardar el comentario.");
      establecerCargando(false);
    }
  };

  const eliminar = async (id: number) => {
    establecerCargando(true);
    establecerMensaje("");
    try {
      const respuesta = await fetch("/api/comentarios", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, matricula }),
      });
      if (!respuesta.ok) throw new Error();
      establecerComentarios((actuales) => actuales.filter((item) => item.id !== id));
      establecerMensaje("Comentario eliminado.");
    } catch {
      establecerMensaje("No se pudo eliminar el comentario.");
    } finally {
      establecerCargando(false);
    }
  };

  /** Mueve un comentario y sincroniza la lista completa con todos los equipos. */
  const moverComentario = async (id: number, desplazamiento: -1 | 1) => {
    const indiceActual = comentarios.findIndex((comentario) => comentario.id === id);
    const indiceNuevo = indiceActual + desplazamiento;
    if (indiceActual < 0 || indiceNuevo < 0 || indiceNuevo >= comentarios.length) return;

    const ordenAnterior = comentarios;
    const nuevoOrden = [...comentarios];
    [nuevoOrden[indiceActual], nuevoOrden[indiceNuevo]] = [nuevoOrden[indiceNuevo], nuevoOrden[indiceActual]];
    establecerComentarios(nuevoOrden);
    establecerMensaje("Guardando nuevo orden…");

    try {
      const respuesta = await fetch("/api/comentarios", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, ids: nuevoOrden.map((comentario) => comentario.id) }),
      });
      if (!respuesta.ok) throw new Error();
      establecerMensaje("Orden guardado para todos tus equipos.");
    } catch {
      establecerComentarios(ordenAnterior);
      establecerMensaje("No se pudo guardar el nuevo orden.");
    }
  };

  return (
    <div className={`comentarios-rapidos ${abierto ? "esta-abierto" : ""}`}>
      <button className="comentarios-rapidos-activador" data-nombre="Comentarios" type="button" onClick={alternar} aria-label="Comentarios frecuentes" title="Comentarios frecuentes">
        <span className="herramienta-menu-icono" aria-hidden="true">
          <img src={iconoComentarios} alt="" />
        </span>
        <strong>Comentarios</strong>
      </button>

      {abierto && (
        <section className="comentarios-rapidos-panel">
          <header>
            <div><small>Sincronizados</small><h2>Comentarios MasterMind</h2></div>
            <button type="button" onClick={alternar} aria-label="Cerrar">×</button>
          </header>

          <div className="comentarios-rapidos-pestanas">
            <button className={vista === "lista" ? "esta-activa" : ""} type="button" onClick={() => establecerVista("lista")}>Mis comentarios</button>
            <button className={vista === "gestionar" ? "esta-activa" : ""} type="button" onClick={() => establecerVista("gestionar")}>Agregar o eliminar</button>
          </div>

          <div className="comentarios-rapidos-contenido">
            <label className="comentarios-operador-selector">
              Operador
              <select
                value={matricula}
                onChange={(evento) => {
                  establecerMatricula(evento.target.value);
                  establecerComentarios([]);
                  establecerMensaje("");
                }}
              >
                {operadoresComentarios.map((operador) => (
                  <option key={operador.matricula} value={operador.matricula}>
                    {operador.matricula} · {operador.nombre}
                  </option>
                ))}
              </select>
            </label>
            {mensaje && <p className="comentarios-rapidos-mensaje">{mensaje}</p>}
            {vista === "gestionar" && (
              <form className="comentario-personal-formulario" onSubmit={guardar}>
                <label htmlFor="nuevo-comentario-master">Nuevo comentario</label>
                <textarea id="nuevo-comentario-master" maxLength={1200} rows={3} value={nuevoComentario} onChange={(evento) => establecerNuevoComentario(evento.target.value)} placeholder="Escribe aquí el texto que quieres reutilizar…" />
                <button type="submit" disabled={cargando || !nuevoComentario.trim()}>Guardar para todos los equipos</button>
              </form>
            )}

            {cargando && comentarios.length === 0 ? (
              <p className="comentarios-rapidos-vacio">Cargando comentarios…</p>
            ) : comentarios.length === 0 ? (
              <p className="comentarios-rapidos-vacio">Todavía no hay comentarios guardados.</p>
            ) : (
              <div className="comentarios-rapidos-lista">
                {comentarios.map((comentario, indice) => (
                  <article className="comentario-personal" key={comentario.id}>
                    <p>{comentario.texto}</p>
                    <div>
                      <button type="button" onClick={(evento) => copiar(comentario, evento.currentTarget.ownerDocument)}>
                        {copiado === comentario.id ? "Copiado" : "Copiar"}
                      </button>
                      {vista === "lista" && (
                        <span className="comentario-orden-controles" aria-label="Cambiar posición">
                          <button type="button" disabled={cargando || indice === 0} onClick={() => moverComentario(comentario.id, -1)} aria-label="Subir comentario" title="Subir comentario">↑</button>
                          <button type="button" disabled={cargando || indice === comentarios.length - 1} onClick={() => moverComentario(comentario.id, 1)} aria-label="Bajar comentario" title="Bajar comentario">↓</button>
                        </span>
                      )}
                      {vista === "gestionar" && (
                        <button className="comentario-personal-eliminar" type="button" disabled={cargando} onClick={() => eliminar(comentario.id)}>Eliminar</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
