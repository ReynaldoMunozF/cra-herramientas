import React from "react";

interface OperacionGuardada {
  id: string;
  expresion: string;
  resultado: string;
}

const CLAVE_HISTORIAL = "cra-calculadora-historial-v1";

const leerHistorial = (): OperacionGuardada[] => {
  try {
    const valor = window.localStorage.getItem(CLAVE_HISTORIAL);
    const datos = valor ? JSON.parse(valor) : [];
    return Array.isArray(datos)
      ? datos.filter((dato): dato is OperacionGuardada =>
        typeof dato?.id === "string" && typeof dato?.expresion === "string" && typeof dato?.resultado === "string",
      ).slice(0, 5)
      : [];
  } catch {
    return [];
  }
};

const guardarHistorial = (historial: OperacionGuardada[]) => {
  try {
    window.localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial));
  } catch {
    // El cálculo continúa funcionando aunque el navegador no permita almacenar datos.
  }
};

const normalizarExpresion = (valor: string) => valor.trim()
  .replace(/,/g, ".")
  .replace(/[×xX]/g, "*")
  .replace(/÷/g, "/");

const calcular = (valor: string) => {
  const expresion = normalizarExpresion(valor);
  if (!expresion || !/^[0-9+\-*/().\s]+$/.test(expresion)) throw new Error("Operación no válida");
  // Solo se evalúan números, paréntesis y operadores matemáticos admitidos por la expresión anterior.
  const resultado = Function(`"use strict"; return (${expresion});`)() as unknown;
  if (typeof resultado !== "number" || !Number.isFinite(resultado)) throw new Error("Resultado no válido");
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 10 }).format(resultado);
};

/** Calculadora local: no envía las operaciones al servidor ni a otros usuarios. */
export const ConsultaCalculadoraRapida: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [expresion, establecerExpresion] = React.useState("");
  const [resultado, establecerResultado] = React.useState("0");
  const [historial, establecerHistorial] = React.useState<OperacionGuardada[]>(leerHistorial);

  React.useEffect(() => {
    const cerrarAlAbrirOtra = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "calculadora") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAlAbrirOtra);
  }, []);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: seAbrira ? "calculadora" : "ninguna" }));
    establecerAbierto(seAbrira);
  };

  const resolver = () => {
    try {
      const valor = calcular(expresion);
      establecerResultado(valor);
      const nuevo: OperacionGuardada = { id: `${Date.now()}-${Math.random()}`, expresion, resultado: valor };
      const nuevoHistorial = [nuevo, ...historial].slice(0, 5);
      establecerHistorial(nuevoHistorial);
      guardarHistorial(nuevoHistorial);
    } catch {
      establecerResultado("Revisa la operación");
    }
  };

  const pulsarTecla = (tecla: string) => {
    if (tecla === "C") {
      establecerExpresion("");
      establecerResultado("0");
    } else if (tecla === "⌫") {
      establecerExpresion((valor) => valor.slice(0, -1));
    } else if (tecla === "=") {
      resolver();
    } else {
      establecerExpresion((valor) => valor + tecla);
    }
  };

  const limpiarHistorial = () => {
    establecerHistorial([]);
    try { window.localStorage.removeItem(CLAVE_HISTORIAL); } catch { /* sin almacenamiento disponible */ }
  };

  const teclas = ["C", "⌫", "(", ")", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ",", "=", "+"];

  return <aside className={`calculadora-rapida ${abierto ? "abierta" : ""}`}>
    <button className="calculadora-rapida-activador" data-nombre="Calculadora" type="button" onClick={alternar} aria-expanded={abierto} aria-label={abierto ? "Cerrar calculadora" : "Abrir calculadora"} title="Calculadora">
      <span className="herramienta-menu-icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="2.8" width="14" height="18.4" rx="2.2" stroke="currentColor" strokeWidth="2"/><path d="M8 7.3h8M8.4 11.7h.1m3.45 0h.1m3.45 0h.1M8.4 15.5h.1m3.45 0h.1m3.45 0h.1M8.4 18.6h.1m3.45 0h.1m3.45 0h.1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></span>
      <strong>Calculadora</strong>
    </button>

    {abierto && <section className="calculadora-rapida-panel">
      <header><div><small>Cálculo rápido · historial local</small><h2>Calculadora</h2></div><button type="button" onClick={alternar} aria-label="Cerrar calculadora">×</button></header>
      <div className="calculadora-rapida-contenido">
        <label className="calculadora-entrada">Operación
          <input value={expresion} onChange={(evento) => establecerExpresion(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); resolver(); } }} inputMode="decimal" placeholder="Ej.: 12 + 4 × 3" aria-label="Operación matemática" autoFocus />
        </label>
        <output className="calculadora-resultado" aria-live="polite">{resultado}</output>
        <div className="calculadora-teclado" aria-label="Teclado de calculadora">
          {teclas.map((tecla) => <button key={tecla} type="button" className={tecla === "=" ? "es-igual" : tecla === "C" ? "es-limpiar" : ""} onClick={() => pulsarTecla(tecla)}>{tecla}</button>)}
        </div>
        <section className="calculadora-historial" aria-label="Historial de operaciones">
          <div className="calculadora-historial-cabecera"><strong>Historial</strong>{historial.length > 0 && <button type="button" onClick={limpiarHistorial}>Limpiar</button>}</div>
          {historial.length === 0 ? <p>Tus últimas operaciones aparecerán aquí.</p> : <ol>{historial.map((operacion) => <li key={operacion.id}><button type="button" onClick={() => { establecerExpresion(operacion.expresion); establecerResultado(operacion.resultado); }}><span>{operacion.expresion}</span><strong>= {operacion.resultado}</strong></button></li>)}</ol>}
        </section>
      </div>
    </section>}
  </aside>;
};
