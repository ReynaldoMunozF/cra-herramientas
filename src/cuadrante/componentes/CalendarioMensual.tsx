import React from "react";
import { DIAS_SEMANA, DIAS_SEMANA_COMPLETOS } from "../constantes";
import { obtenerInformacionTurno } from "../utilidades";

interface PropiedadesCalendarioMensual {
  dias: string[];
  nombreAccesible: string;
  diaSolicitado: number | null;
  diaDevolucion: number | null;
  permitirSeleccion?: boolean;
  alSeleccionarDia?: (indiceDia: number) => void;
  prefijoClave?: string;
  desplazamientoPrimerDia: number;
  diaActual: number | null;
}

/**
 * Representa un mes completo y se reutiliza para ambos operadores.
 * En escritorio se muestra como calendario de siete columnas; el CSS lo transforma
 * en una lista de tarjetas cuando el ancho de pantalla es reducido.
 */
export const CalendarioMensual: React.FC<PropiedadesCalendarioMensual> = ({
  dias,
  nombreAccesible,
  diaSolicitado,
  diaDevolucion,
  permitirSeleccion = false,
  alSeleccionarDia,
  prefijoClave = "principal",
  desplazamientoPrimerDia,
  diaActual,
}) => (
  <div className="calendar" aria-label={nombreAccesible}>
    {DIAS_SEMANA.map((dia) => (
      <div className="calendar-weekday" key={`${prefijoClave}-${dia}`}>{dia}</div>
    ))}

    {Array.from({ length: desplazamientoPrimerDia }, (_, indice) => (
      <div className="calendar-blank" key={`${prefijoClave}-hueco-${indice}`} aria-hidden="true" />
    ))}

    {dias.map((codigoTurno, indiceDia) => {
      const informacionTurno = obtenerInformacionTurno(codigoTurno);
      const nombreDia = DIAS_SEMANA_COMPLETOS[(desplazamientoPrimerDia + indiceDia) % 7];
      const clases = [
        "calendar-day",
        informacionTurno.claseCss,
        permitirSeleccion && codigoTurno ? "is-clickable" : "",
        diaSolicitado === indiceDia ? "swap-highlight" : "",
        diaDevolucion === indiceDia ? "return-highlight" : "",
        diaActual === indiceDia ? "today-highlight" : "",
      ].filter(Boolean).join(" ");

      const contenido = (
        <>
          <div className="calendar-date-block">
            <span className="calendar-date">{indiceDia + 1}</span>
            <span className="calendar-mobile-weekday">{nombreDia}</span>
          </div>
          <div className="calendar-shift">
            <strong>{codigoTurno || "LIBRE"}</strong>
            <small>{informacionTurno.etiqueta}</small>
          </div>
        </>
      );

      return permitirSeleccion ? (
        <button
          type="button"
          className={clases}
          key={`${prefijoClave}-${indiceDia}`}
          onClick={() => codigoTurno && alSeleccionarDia?.(indiceDia)}
          disabled={!codigoTurno}
          aria-label={codigoTurno
            ? `Consultar operadores del día ${indiceDia + 1}, turno ${codigoTurno}`
            : `Día ${indiceDia + 1}, libre`}
          aria-current={diaActual === indiceDia ? "date" : undefined}
        >
          {contenido}
        </button>
      ) : (
        <div className={clases} key={`${prefijoClave}-${indiceDia}`} aria-current={diaActual === indiceDia ? "date" : undefined}>{contenido}</div>
      );
    })}
  </div>
);
