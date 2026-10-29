import React from "react";
import { CUADRANTES } from "../cuadrante/constantes";

interface Cuenta { matricula: string; nombre_visible: string; activa: number; debe_cambiar_clave: number; creada_en: number; ultimo_acceso_en: number | null; }
const operadores = Array.from(new Map(CUADRANTES.flatMap((cuadrante) => cuadrante.operadores).map((operador) => [operador.matricula, operador])).values())
  .sort((a, b) => a.matricula.localeCompare(b.matricula));

export const PanelUsuariosOperadores: React.FC = () => {
  const [cuentas, establecerCuentas] = React.useState<Cuenta[]>([]);
  const [matricula, establecerMatricula] = React.useState(operadores[0]?.matricula ?? "");
  const [clave, establecerClave] = React.useState("");
  const [mensaje, establecerMensaje] = React.useState("");
  const [ocupado, establecerOcupado] = React.useState(false);
  const leerJson = async <T,>(respuesta: Response): Promise<T> => {
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (!tipo.includes("application/json")) {
      throw new Error(respuesta.status === 401 || respuesta.status === 403
        ? "Tu sesión administrativa ha caducado. Sal y vuelve a entrar como administrador."
        : `El servidor no pudo responder correctamente (${respuesta.status}).`);
    }
    return respuesta.json() as Promise<T>;
  };
  const cargar = React.useCallback(async () => {
    try { const respuesta = await fetch("/api/administracion/usuarios-operadores", { cache: "no-store" }); const datos = await leerJson<{ cuentas?: Cuenta[] }>(respuesta); if (!respuesta.ok) throw new Error("No se pudo cargar la configuración de cuentas."); establecerCuentas(datos.cuentas ?? []); }
    catch { establecerMensaje("No se pudieron cargar las cuentas personales."); }
  }, []);
  React.useEffect(() => { cargar(); }, [cargar]);
  const cuentaSeleccionada = cuentas.find((cuenta) => cuenta.matricula === matricula);
  const operador = operadores.find((elemento) => elemento.matricula === matricula);

  const crear = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (clave.length < 10) { establecerMensaje("La contraseña temporal debe tener al menos 10 caracteres."); return; }
    establecerOcupado(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/usuarios-operadores", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matricula, nombre: operador?.nombre ?? matricula, clave }) });
      const datos = await leerJson<{ error?: string }>(respuesta);
      if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo crear la cuenta.");
      establecerClave(""); establecerMensaje(`Cuenta de ${matricula} creada. Entrega la contraseña temporal por un canal privado.`); await cargar();
    } catch (error) { establecerMensaje(error instanceof Error ? error.message : "No se pudo crear la cuenta."); }
    finally { establecerOcupado(false); }
  };
  const actualizar = async (accion: "estado" | "restablecer") => {
    if (accion === "restablecer" && clave.length < 10) { establecerMensaje("Escribe una nueva contraseña temporal de al menos 10 caracteres."); return; }
    establecerOcupado(true); establecerMensaje("");
    try {
      const respuesta = await fetch("/api/administracion/usuarios-operadores", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matricula, accion, activa: !cuentaSeleccionada?.activa, clave }) });
      const datos = await leerJson<{ error?: string }>(respuesta);
      if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo actualizar la cuenta.");
      establecerClave(""); establecerMensaje(accion === "estado" ? `Cuenta ${cuentaSeleccionada?.activa ? "bloqueada" : "reactivada"}.` : "Contraseña temporal restablecida; sus sesiones anteriores se cerraron."); await cargar();
    } catch (error) { establecerMensaje(error instanceof Error ? error.message : "No se pudo actualizar la cuenta."); }
    finally { establecerOcupado(false); }
  };
  return <section className="panel-usuarios-operadores">
    <header><span>ACCESOS PERSONALES · FASE INICIAL</span><h2>Crear cuentas de operadores</h2><p>Empieza con las 10 matrículas que elijas. Una matrícula con cuenta activa deja de estar disponible para invitados en Productividad y Cómputo anual; el cuadrante sigue mostrándola con normalidad.</p></header>
    <form onSubmit={crear}><label>Matrícula<select value={matricula} disabled={ocupado} onChange={(evento) => { establecerMatricula(evento.target.value); establecerClave(""); establecerMensaje(""); }}>{operadores.map((elemento) => <option value={elemento.matricula} key={elemento.matricula}>{elemento.matricula} · {elemento.nombre}</option>)}</select></label><label>Contraseña temporal<input type="password" autoComplete="new-password" value={clave} onChange={(evento) => establecerClave(evento.target.value)} placeholder="Mínimo 10 caracteres" disabled={ocupado}/><small>No se guarda en texto legible. Entrégala de forma privada.</small></label><div className="acciones-cuenta">{cuentaSeleccionada ? <><button type="button" onClick={() => actualizar("restablecer")} disabled={ocupado}>{ocupado ? "Guardando…" : "Restablecer clave"}</button><button type="button" className="cuenta-secundaria" onClick={() => actualizar("estado")} disabled={ocupado}>{cuentaSeleccionada.activa ? "Bloquear cuenta" : "Reactivar cuenta"}</button></> : <button type="submit" disabled={ocupado}>{ocupado ? "Creando…" : "Crear cuenta"}</button>}</div></form>
    <div className="cuentas-resumen"><strong>{cuentas.filter((cuenta) => cuenta.activa).length} cuenta(s) activa(s)</strong><span>Las cuentas bloqueadas no aparecen a invitados mientras se resuelven.</span></div>
    {cuentas.length > 0 && <ul>{cuentas.map((cuenta) => <li key={cuenta.matricula}><b>{cuenta.matricula}</b><span>{cuenta.nombre_visible}</span><em className={cuenta.activa ? "activa" : "bloqueada"}>{cuenta.activa ? "Activa" : "Bloqueada"}</em></li>)}</ul>}
    {mensaje && <p role="status" aria-live="polite">{mensaje}</p>}
  </section>;
};
