import React from "react";
import { CalendarioMensual } from "../cuadrante/componentes/CalendarioMensual";
import { FECHA_ACTUALIZACION_CUADRANTES } from "../cuadrante/constantes";
import { normalizarTexto } from "../cuadrante/utilidades";
import { usarCuadrantesActualizados } from "../cuadrante/usarCuadrantesActualizados";
import iconoCuadrante from "../recursos/herramientas/cuadrante.svg";

/** Consulta compacta del cuadrante para la ventana auxiliar. */
export const ConsultaCuadranteRapida: React.FC = () => {
  const cuadrantes = usarCuadrantesActualizados();
  const ahora = new Date();
  const cuadranteInicial = cuadrantes.find((mes) => mes.numeroMes === ahora.getMonth() + 1 && mes.anio === ahora.getFullYear()) ?? cuadrantes[0];
  const [abierto, establecerAbierto] = React.useState(false);
  const [idCuadrante, establecerIdCuadrante] = React.useState(cuadranteInicial.id);
  const [matricula, establecerMatricula] = React.useState("");
  const [matriculaSeleccionada, establecerMatriculaSeleccionada] = React.useState<string | null>(null);
  const cuadrante = cuadrantes.find((mes) => mes.id === idCuadrante) ?? cuadrantes[0];
  const consulta = normalizarTexto(matricula);
  const operador = cuadrante.operadores.find((valor) => valor.matricula === matriculaSeleccionada) ?? null;
  const sugerencias = consulta
    ? cuadrante.operadores.filter((valor) => normalizarTexto(valor.matricula).includes(consulta)).slice(0, 6)
    : [];
  const diaActual = ahora.getFullYear() === cuadrante.anio && ahora.getMonth() + 1 === cuadrante.numeroMes ? ahora.getDate() - 1 : null;

  React.useEffect(() => {
    const cerrarAnteOtraHerramienta = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "cuadrante") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
  }, []);

  const alternar = () => {
    if (abierto) {
      establecerAbierto(false);
      window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "ninguna" }));
    } else {
      // Cada nueva apertura comienza en el cuadrante del mes actual disponible.
      establecerIdCuadrante(cuadranteInicial.id);
      establecerMatriculaSeleccionada(null);
      establecerMatricula("");
      window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "cuadrante" }));
      establecerAbierto(true);
    }
  };

  const cerrarPanel = () => {
    establecerAbierto(false);
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "ninguna" }));
  };

  return (
    <aside className={`cuadrante-rapido ${abierto ? "abierto" : ""}`}>
      {abierto && <section className="cuadrante-rapido-panel" aria-label="Consulta rápida del cuadrante">
        <header><div><span>Consulta mensual</span><h2>Cuadrante del operador</h2></div><button onClick={cerrarPanel} aria-label="Cerrar consulta">×</button></header>
        <p className="cuadrante-rapido-actualizacion">
          <span aria-hidden="true">✓</span> Actualizado al {FECHA_ACTUALIZACION_CUADRANTES}
        </p>
        <div className="cuadrante-rapido-filtros">
          <label>Mes<select value={idCuadrante} onChange={(evento) => { establecerIdCuadrante(evento.target.value); establecerMatriculaSeleccionada(null); }}>{cuadrantes.map((mes) => <option value={mes.id} key={mes.id}>{mes.mes} {mes.anio}</option>)}</select></label>
          <label>Matrícula<input value={matricula} onChange={(evento) => { establecerMatricula(evento.target.value.toUpperCase().slice(0, 5)); establecerMatriculaSeleccionada(null); }} placeholder="Ejemplo: RMI" autoFocus /></label>
          {!matriculaSeleccionada && sugerencias.length > 0 && <div className="cuadrante-rapido-resultados">{sugerencias.map((valor) => <button key={valor.codigo} onClick={() => { establecerMatricula(valor.matricula); establecerMatriculaSeleccionada(valor.matricula); }}><strong>{valor.matricula}</strong><span>{valor.nombre}</span></button>)}</div>}
        </div>
        {operador && <div className="cuadrante-rapido-calendario">
          <div><strong>{operador.nombre}</strong><span>{operador.matricula} · {operador.horas} horas</span></div>
          <CalendarioMensual dias={operador.dias} nombreAccesible={`Cuadrante rápido de ${operador.matricula}`} diaSolicitado={null} diaDevolucion={null} desplazamientoPrimerDia={cuadrante.desplazamientoPrimerDia} diaActual={diaActual} prefijoClave="rapido" />
        </div>}
      </section>}
      <button className="cuadrante-rapido-activador" data-nombre="Cuadrante" onClick={alternar} aria-expanded={abierto} aria-label="Cuadrante" title="Cuadrante">
        <span className="herramienta-menu-icono" aria-hidden="true"><img src={iconoCuadrante} alt="" /></span>
        <div><small>Consulta mensual</small><strong>Cuadrante</strong></div>
      </button>
    </aside>
  );
};
