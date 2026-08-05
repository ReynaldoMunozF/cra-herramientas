import React from "react";
import { LocalizacionPostal, localizarCodigoPostal } from "../servicios/localizacionPostal";
import { registrarUso } from "../servicios/estadisticasUso";
import iconoClima from "../recursos/herramientas/clima.svg";

interface CondicionesActuales {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
  is_day: number;
}

interface ResultadoClima {
  ubicacion: LocalizacionPostal;
  condiciones: CondicionesActuales;
}

/** Convierte el código meteorológico internacional en una descripción breve. */
const describirClima = (codigo: number) => {
  if (codigo === 0) return "Cielo despejado";
  if (codigo <= 3) return "Parcialmente nuboso";
  if (codigo === 45 || codigo === 48) return "Niebla";
  if (codigo >= 51 && codigo <= 57) return "Llovizna";
  if (codigo >= 61 && codigo <= 67) return "Lluvia";
  if (codigo >= 71 && codigo <= 77) return "Nieve";
  if (codigo >= 80 && codigo <= 82) return "Chubascos";
  if (codigo >= 85 && codigo <= 86) return "Chubascos de nieve";
  if (codigo >= 95) return "Tormenta";
  return "Condiciones variables";
};

const obtenerIconoClima = (codigo: number, esDeDia: boolean) => {
  if (codigo === 0) return esDeDia ? "☀" : "☾";
  if (codigo <= 3) return "☁";
  if (codigo === 45 || codigo === 48) return "≋";
  if (codigo >= 71 && codigo <= 77) return "❄";
  if (codigo >= 95) return "ϟ";
  return "☂";
};

/** Consulta meteorológica flotante que no modifica la ruta ni la pantalla actual. */
export const ConsultaClimaRapida: React.FC = () => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [codigoPostal, establecerCodigoPostal] = React.useState("");
  const [resultado, establecerResultado] = React.useState<ResultadoClima | null>(null);
  const [cargando, establecerCargando] = React.useState(false);
  const [error, establecerError] = React.useState("");

  // Si se abre otra herramienta flotante, cerramos esta para evitar solapamientos.
  React.useEffect(() => {
    const cerrarAnteOtraHerramienta = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "clima") establecerAbierto(false);
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
    return () => window.removeEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
  }, []);

  const alternarPanel = () => {
    if (abierto) {
      establecerAbierto(false);
      window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "ninguna" }));
    } else {
      window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "clima" }));
      establecerAbierto(true);
    }
  };

  const cerrarPanel = () => {
    establecerAbierto(false);
    window.dispatchEvent(new CustomEvent("herramienta-flotante-abierta", { detail: "ninguna" }));
  };

  const consultarClima = async (evento: React.FormEvent) => {
    evento.preventDefault();
    establecerError("");
    establecerResultado(null);

    if (!/^\d{5}$/.test(codigoPostal)) {
      establecerError("Introduce cinco cifras.");
      return;
    }

    establecerCargando(true);
    try {
      const ubicacion = await localizarCodigoPostal(codigoPostal);

      const variables = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day";
      const respuestaClima = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${ubicacion.latitud}&longitude=${ubicacion.longitud}&current=${variables}&timezone=Europe%2FMadrid`,
      );
      if (!respuestaClima.ok) throw new Error("No se pudo consultar el tiempo.");
      const datosClima = await respuestaClima.json();
      establecerResultado({ ubicacion, condiciones: datosClima.current });
      registrarUso("consulta_clima");
    } catch (errorConsulta) {
      establecerError(errorConsulta instanceof Error ? errorConsulta.message : "Ha ocurrido un error.");
    } finally {
      establecerCargando(false);
    }
  };

  return (
    <aside className={`clima-rapido ${abierto ? "abierto" : ""}`}>
      {abierto && (
        <section className="clima-rapido-panel" aria-label="Consulta rápida del clima">
          <header>
            <div><span>Consulta rápida</span><h2>Clima de la instalación</h2></div>
            <button onClick={cerrarPanel} aria-label="Cerrar consulta">×</button>
          </header>

          <form onSubmit={consultarClima}>
            <label htmlFor="codigo-postal-rapido">Código postal</label>
            <div>
              <input
                id="codigo-postal-rapido"
                value={codigoPostal}
                onChange={(evento) => establecerCodigoPostal(evento.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="Ejemplo: 28001"
                autoFocus
              />
              <button type="submit" disabled={cargando}>{cargando ? "…" : "Consultar"}</button>
            </div>
            {error && <p className="clima-rapido-error" role="alert">{error}</p>}
          </form>

          {resultado && (
            <div className="clima-rapido-resultado" aria-live="polite">
              <div className="clima-rapido-resumen">
                <span aria-hidden="true">{obtenerIconoClima(resultado.condiciones.weather_code, resultado.condiciones.is_day === 1)}</span>
                <div><strong>{resultado.ubicacion.nombre}</strong><small>{resultado.ubicacion.comunidad} · {describirClima(resultado.condiciones.weather_code)}</small></div>
                <b>{Math.round(resultado.condiciones.temperature_2m)}°</b>
              </div>
              <dl>
                <div><dt>Sensación</dt><dd>{Math.round(resultado.condiciones.apparent_temperature)} °C</dd></div>
                <div><dt>Humedad</dt><dd>{resultado.condiciones.relative_humidity_2m} %</dd></div>
                <div><dt>Viento</dt><dd>{Math.round(resultado.condiciones.wind_speed_10m)} km/h</dd></div>
                <div><dt>Rachas</dt><dd>{Math.round(resultado.condiciones.wind_gusts_10m)} km/h</dd></div>
                <div><dt>Lluvia</dt><dd>{resultado.condiciones.precipitation} mm</dd></div>
              </dl>
            </div>
          )}
        </section>
      )}

      <button className="clima-rapido-activador" data-nombre="Clima" onClick={alternarPanel} aria-expanded={abierto} aria-label="Clima" title="Clima">
        <span className="clima-activador-icono herramienta-menu-icono" aria-hidden="true">
          <img src={iconoClima} alt="" />
        </span>
        <span className="clima-activador-texto"><small>Consulta rápida</small><strong>Clima</strong></span>
      </button>
    </aside>
  );
};
