import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";
import { usarCuadrantesActualizados } from "../cuadrante/usarCuadrantesActualizados";
import { obtenerInformacionTurno } from "../cuadrante/utilidades";

/** Editor privado para corregir un único día sin alterar el cuadrante extraído del PDF. */
export const EditorCuadranteAdmin: React.FC = () => {
  const cuadrantesActualizados = usarCuadrantesActualizados();
  const [idCuadrante, establecerIdCuadrante] = React.useState(CUADRANTES[0].id);
  const cuadrante = cuadrantesActualizados.find((valor) => valor.id === idCuadrante) ?? cuadrantesActualizados[0];
  const cuadranteOriginal = CUADRANTES.find((valor) => valor.id === idCuadrante) ?? CUADRANTES[0];
  const [matricula, establecerMatricula] = React.useState(cuadrante.operadores[0]?.matricula ?? "");
  const operador = cuadrante.operadores.find((valor) => valor.matricula === matricula) ?? cuadrante.operadores[0];
  const operadorOriginal = cuadranteOriginal.operadores.find((valor) => valor.matricula === operador?.matricula);
  const [dia, establecerDia] = React.useState(1);
  const turnoActual = operador?.dias[dia - 1] ?? "";
  const turnoOriginal = operadorOriginal?.dias[dia - 1] ?? "";
  const [turno, establecerTurno] = React.useState(turnoActual);
  const [estado, establecerEstado] = React.useState("");
  const [guardando, establecerGuardando] = React.useState(false);

  React.useEffect(() => {
    establecerTurno(turnoActual);
    establecerEstado("");
  }, [idCuadrante, operador?.matricula, dia, turnoActual]);

  const cambiarMes = (nuevoId: string) => {
    const nuevoCuadrante = cuadrantesActualizados.find((valor) => valor.id === nuevoId);
    establecerIdCuadrante(nuevoId);
    establecerMatricula(nuevoCuadrante?.operadores[0]?.matricula ?? "");
    establecerDia(1);
  };

  const guardar = async (turnoElegido = turno) => {
    if (!operador) return;
    establecerGuardando(true);
    establecerEstado("Guardando cambio…");
    try {
      const respuesta = await fetch("/api/administracion/cuadrante", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCuadrante,
          matricula: operador.matricula,
          dia,
          turno: turnoElegido,
        }),
      });
      const datos = await respuesta.json() as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se ha podido guardar.");
      establecerTurno(turnoElegido);
      establecerEstado(turnoElegido ? `Guardado: día ${dia}, turno ${turnoElegido}.` : `Guardado: día ${dia} marcado como libre.`);
      window.dispatchEvent(new CustomEvent("cuadrante-manual-actualizado"));
    } catch (error) {
      establecerEstado(error instanceof Error ? error.message : "No se ha podido guardar.");
    } finally {
      establecerGuardando(false);
    }
  };

  const restaurar = async () => {
    if (!operador) return;
    establecerGuardando(true);
    establecerEstado("Restaurando dato original…");
    try {
      const respuesta = await fetch("/api/administracion/cuadrante", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCuadrante, matricula: operador.matricula, dia }),
      });
      if (!respuesta.ok) throw new Error("No se ha podido restaurar.");
      establecerTurno(turnoOriginal);
      establecerEstado(`Restaurado el valor original: ${turnoOriginal || "Libre"}.`);
      window.dispatchEvent(new CustomEvent("cuadrante-manual-actualizado"));
    } catch (error) {
      establecerEstado(error instanceof Error ? error.message : "No se ha podido restaurar.");
    } finally {
      establecerGuardando(false);
    }
  };

  return (
    <section className="editor-cuadrante-admin" aria-labelledby="titulo-editor-cuadrante">
      <header>
        <div><span>Solo administrador</span><h2 id="titulo-editor-cuadrante">Modificar cuadrante manualmente</h2><p>Cambia un turno o marca un día como libre. El PDF original siempre se conserva.</p></div>
        <div className="editor-cuadrante-escudo" aria-hidden="true">✎</div>
      </header>

      <div className="editor-cuadrante-formulario">
        <label>Mes
          <select value={idCuadrante} onChange={(evento) => cambiarMes(evento.target.value)}>
            {cuadrantesActualizados.map((mes) => <option key={mes.id} value={mes.id}>{mes.mes} {mes.anio}</option>)}
          </select>
        </label>
        <label>Operador
          <select value={operador?.matricula ?? ""} onChange={(evento) => { establecerMatricula(evento.target.value); establecerDia(1); }}>
            {cuadrante.operadores.map((valor) => <option key={valor.codigo} value={valor.matricula}>{valor.matricula} · {valor.nombre}</option>)}
          </select>
        </label>
        <label>Día
          <select value={dia} onChange={(evento) => establecerDia(Number(evento.target.value))}>
            {operador?.dias.map((_, indice) => <option key={indice + 1} value={indice + 1}>Día {indice + 1}</option>)}
          </select>
        </label>
      </div>

      <div className="editor-cuadrante-resumen">
        <div><small>Valor original</small><strong>{obtenerInformacionTurno(turnoOriginal).etiqueta}</strong></div>
        <span aria-hidden="true">→</span>
        <div><small>Valor visible ahora</small><strong>{obtenerInformacionTurno(turnoActual).etiqueta}</strong></div>
      </div>

      <div className="editor-cuadrante-edicion">
        <label htmlFor="turno-manual">Nuevo turno
          <input id="turno-manual" value={turno} onChange={(evento) => establecerTurno(evento.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))} placeholder="Ejemplo: N17" />
        </label>
        <button className="editor-marcar-libre" type="button" onClick={() => void guardar("")} disabled={guardando}>Marcar libre</button>
        <button className="editor-guardar" type="button" onClick={() => void guardar()} disabled={guardando || !turno}>Guardar turno</button>
        <button className="editor-restaurar" type="button" onClick={() => void restaurar()} disabled={guardando}>Restaurar original</button>
      </div>

      {estado && <p className="editor-cuadrante-estado" role="status">{estado}</p>}
    </section>
  );
};
