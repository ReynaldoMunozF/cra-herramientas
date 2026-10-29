import React from "react";
import { ResultadoTeo, SesionTeoError } from "../servicios/teo";
import { cuerposValidacionFseTeo, guardarValidacionFseTeo } from "../servicios/validacionFseTeo";
interface Props { codigoPostal: string; resultado: ResultadoTeo; alGuardar: (resultado: ResultadoTeo) => void; alCaducarSesion: () => void; }
export const ValidacionFseTeo: React.FC<Props> = ({ codigoPostal, resultado, alGuardar, alCaducarSesion }) => {
  const [corrigiendo, setCorrigiendo] = React.useState(false);
  const [cuerpo, setCuerpo] = React.useState("");
  const [guardando, setGuardando] = React.useState(false);
  const [error, setError] = React.useState("");
  const [mensaje, setMensaje] = React.useState("");
  const peticion = React.useRef<AbortController | null>(null);
  const id = React.useId();
  React.useEffect(() => () => peticion.current?.abort(), []);
  const guardar = async (esCorrecto: boolean) => {
    if (peticion.current) return;
    if (!esCorrecto && (!cuerpo || cuerpo === resultado.orientacion.principal)) { setError("Selecciona una FSE distinta a la mostrada."); return; }
    const controlador = new AbortController();peticion.current = controlador;setGuardando(true);setError("");
    try {
      const actualizado = await guardarValidacionFseTeo(codigoPostal, resultado, esCorrecto, cuerpo, controlador.signal);
      if (controlador.signal.aborted) return;
      alGuardar(actualizado);setCorrigiendo(false);setCuerpo("");
      setMensaje(esCorrecto ? `Confirmación guardada para ${codigoPostal}.` : `Corrección guardada para ${codigoPostal}.`);
    } catch (e) {
      if (controlador.signal.aborted) return;
      if (e instanceof SesionTeoError) alCaducarSesion();
      else setError(e instanceof Error ? e.message : "No se pudo guardar la validación.");
    } finally {
      if (!controlador.signal.aborted) { peticion.current = null;setGuardando(false); }
    }
  };
  return <section className="teo-validacion-fse" aria-label="Confirmar o corregir FSE" aria-busy={guardando}>
    {mensaje ? <><p role="status">{mensaje}</p><button type="button" onClick={() => { setMensaje("");setError(""); }}>Volver a comprobar</button></> : <>
      <p><strong>¿Es la FSE que corresponde?</strong></p>
      <div className="teo-validacion-acciones"><button type="button" disabled={guardando} onClick={() => guardar(true)}>{guardando && !corrigiendo ? "Guardando…" : "Sí, es correcta"}</button><button type="button" disabled={guardando} aria-expanded={corrigiendo} onClick={() => { setCorrigiendo(true);setError(""); }}>No, es otra FSE</button></div>
      {corrigiendo && <div className="teo-validacion-correccion"><label htmlFor={`${id}-cuerpo`}>FSE correcta</label><select id={`${id}-cuerpo`} value={cuerpo} disabled={guardando} onChange={e => { setCuerpo(e.target.value);setError(""); }}><option value="">Selecciona la FSE</option>{cuerposValidacionFseTeo.filter(c => c !== resultado.orientacion.principal).map(c => <option key={c} value={c}>{c}</option>)}</select><div className="teo-validacion-acciones"><button type="button" disabled={guardando || !cuerpo} onClick={() => guardar(false)}>{guardando ? "Guardando…" : "Guardar corrección"}</button><button type="button" disabled={guardando} onClick={() => { setCorrigiendo(false);setCuerpo("");setError(""); }}>Cancelar</button></div></div>}
      {error && <p className="teo-error" role="alert">{error}</p>}
    </>}
  </section>;
};
