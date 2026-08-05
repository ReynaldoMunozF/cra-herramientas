import React from "react";
import { RESOLUCIONES } from "./BuscadorResoluciones";
import { MENSAJES_SMS } from "../paginas/PaginaCodigosOperativos";
import iconoResolucionesSms from "../recursos/herramientas/resoluciones-y-sms.svg";

type CategoriaCodigo = "resoluciones" | "sms";

const normalizarCodigo = (texto: string) => texto
  .toLocaleLowerCase("es")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim();

/** Buscador administrativo de resoluciones y comandos integrado en la barra rápida. */
export const ConsultaCodigosOperativos: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [categoria, establecerCategoria] = React.useState<CategoriaCodigo | null>(null);
  const [consulta, establecerConsulta] = React.useState("");
  const [codigoCopiado, establecerCodigoCopiado] = React.useState<string | null>(null);
  const [errorCopia, establecerErrorCopia] = React.useState<string | null>(null);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "codigos") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", {
      detail: seAbrira ? "codigos" : "ninguna",
    }));
    establecerAbierto(seAbrira);
    if (!seAbrira) {
      establecerCategoria(null);
      establecerConsulta("");
      establecerCodigoCopiado(null);
      establecerErrorCopia(null);
    }
  };

  const datos = categoria === "sms" ? MENSAJES_SMS : RESOLUCIONES;
  const termino = normalizarCodigo(consulta);
  const resultados = termino
    ? datos.filter((item) => normalizarCodigo(`${item.codigo} ${item.descripcion}`).includes(termino))
    : [];

  const seleccionarCategoria = (nuevaCategoria: CategoriaCodigo) => {
    establecerCategoria(nuevaCategoria);
    establecerConsulta("");
    establecerCodigoCopiado(null);
    establecerErrorCopia(null);
  };

  const copiarCodigo = async (codigo: string, documento: Document) => {
    try {
      const portapapeles = documento.defaultView?.navigator.clipboard;
      let copiado = false;
      if (portapapeles?.writeText) {
        try {
          await portapapeles.writeText(codigo);
          copiado = true;
        } catch {
          // Algunas ventanas flotantes exponen la API pero bloquean su permiso.
        }
      }
      if (!copiado) {
        const campoTemporal = documento.createElement("textarea");
        campoTemporal.value = codigo;
        campoTemporal.setAttribute("readonly", "");
        campoTemporal.style.position = "fixed";
        campoTemporal.style.opacity = "0";
        documento.body.appendChild(campoTemporal);
        campoTemporal.select();
        copiado = documento.execCommand("copy");
        campoTemporal.remove();
      }
      if (!copiado) throw new Error("El navegador rechazó la copia");
      establecerErrorCopia(null);
      establecerCodigoCopiado(codigo);
      window.setTimeout(() => establecerCodigoCopiado((actual) => actual === codigo ? null : actual), 1800);
    } catch {
      establecerCodigoCopiado(null);
      establecerErrorCopia(codigo);
      window.setTimeout(() => establecerErrorCopia((actual) => actual === codigo ? null : actual), 2500);
    }
  };

  return <aside className={`codigos-rapidos ${abierto ? "abierto" : ""}`}>
    <button className="codigos-rapidos-activador" data-nombre="Resoluciones y SMS" type="button" onClick={alternar} aria-expanded={abierto}>
      <span className="herramienta-menu-icono" aria-hidden="true">
        <img src={iconoResolucionesSms} alt="" />
      </span>
      <strong>Resoluciones y SMS</strong>
    </button>

    {abierto && <section className="codigos-rapidos-panel">
      <header>
        <div><small>Uso administrativo</small><h2>Resoluciones y mensajes</h2></div>
        <button type="button" onClick={alternar} aria-label="Cerrar">×</button>
      </header>

      {!categoria ? <div className="codigos-rapidos-categorias">
        <button type="button" onClick={() => seleccionarCategoria("resoluciones")}>
          <i>AC</i><span><small>Cierre de gestión</small><strong>Resoluciones</strong></span><b>→</b>
        </button>
        <button type="button" onClick={() => seleccionarCategoria("sms")}>
          <i>SMS</i><span><small>Mensajes predefinidos</small><strong>Comandos SMS</strong></span><b>→</b>
        </button>
      </div> : <div className="codigos-rapidos-contenido">
        <div className="codigos-rapidos-subcabecera">
          <button type="button" onClick={() => seleccionarCategoria(categoria === "sms" ? "resoluciones" : "sms")}>
            {categoria === "sms" ? "Ver resoluciones" : "Ver SMS"}
          </button>
          <strong>{categoria === "sms" ? "Comandos SMS" : "Resoluciones"}</strong>
        </div>
        <label className="codigos-rapidos-busqueda">
          <span aria-hidden="true">⌕</span>
          <input autoFocus value={consulta} onChange={(evento) => establecerConsulta(evento.target.value)}
            placeholder={categoria === "sms" ? "Falta de cierre, batería…" : "Descuido, real, técnico…"} />
          {consulta && <button type="button" onClick={() => establecerConsulta("")} aria-label="Limpiar">×</button>}
        </label>
        {!termino && <p className="codigos-rapidos-ayuda">Escribe un código o una palabra para buscar.</p>}
        {termino && <p className="codigos-rapidos-contador">{resultados.length} resultados</p>}
        {termino && resultados.length > 0 && <div className="codigos-rapidos-resultados">
          {resultados.map((item, indice) => <article key={`${item.codigo}-${indice}`}>
            <strong>{item.codigo}</strong>
            <span>{item.descripcion}</span>
            <button
              type="button"
              className={codigoCopiado === item.codigo ? "copiado" : errorCopia === item.codigo ? "error" : ""}
              onClick={(evento) => void copiarCodigo(item.codigo, evento.currentTarget.ownerDocument)}
              aria-label={`Copiar ${categoria === "sms" ? "mensaje" : "resolución"} ${item.codigo}`}
            >
              {codigoCopiado === item.codigo ? "✓ Copiado" : errorCopia === item.codigo ? "No copiado" : "Copiar"}
            </button>
          </article>)}
        </div>}
        {termino && !resultados.length && <p className="codigos-rapidos-ayuda">No hay coincidencias. Prueba con una palabra más corta.</p>}
      </div>}
    </section>}
  </aside>;
};
