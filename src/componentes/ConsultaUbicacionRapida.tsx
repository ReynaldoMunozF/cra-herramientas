import React from "react";
import { registrarUso } from "../servicios/estadisticasUso";
import iconoLocalizacion from "../recursos/herramientas/localizacion.svg";

interface PropiedadesConsultaUbicacion {
  variante?: "global" | "toolbar";
}

interface ResultadoUbicacion {
  latitud: number;
  longitud: number;
  direccionCompleta: string;
  localidad: string;
  provincia: string;
  comunidad: string;
  codigoPostal: string;
  pais: string;
}

type ModoBusqueda = "coordenadas" | "direccion";

/** Consulta coordenadas sin abandonar la gestión que está realizando el operador. */
export const ConsultaUbicacionRapida: React.FC<PropiedadesConsultaUbicacion> = ({
  variante = "toolbar",
}) => {
  const [abierto, establecerAbierto] = React.useState(false);
  const [latitud, establecerLatitud] = React.useState("");
  const [longitud, establecerLongitud] = React.useState("");
  const [direccion, establecerDireccion] = React.useState("");
  const [modo, establecerModo] = React.useState<ModoBusqueda>("coordenadas");
  const [resultado, establecerResultado] =
    React.useState<ResultadoUbicacion | null>(null);
  const [error, establecerError] = React.useState("");
  const [cargando, establecerCargando] = React.useState(false);

  React.useEffect(() => {
    const cerrarAnteOtraHerramienta = (evento: Event) => {
      if ((evento as CustomEvent<string>).detail !== "ubicacion") {
        establecerAbierto(false);
      }
    };
    window.addEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
    return () =>
      window.removeEventListener("herramienta-flotante-abierta", cerrarAnteOtraHerramienta);
  }, []);

  const alternar = () => {
    const seAbrira = !abierto;
    window.dispatchEvent(
      new CustomEvent("herramienta-flotante-abierta", {
        detail: seAbrira ? "ubicacion" : "ninguna",
      })
    );
    establecerAbierto(seAbrira);
  };

  const consultar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    establecerError("");
    establecerResultado(null);
    const latitudNumerica = Number(latitud.trim().replace(",", "."));
    const longitudNumerica = Number(longitud.trim().replace(",", "."));
    if (
      !Number.isFinite(latitudNumerica) ||
      !Number.isFinite(longitudNumerica) ||
      Math.abs(latitudNumerica) > 90 ||
      Math.abs(longitudNumerica) > 180
    ) {
      establecerError("Revisa la latitud y la longitud.");
      return;
    }

    establecerCargando(true);
    try {
      const parametros = new URLSearchParams({
        latitud: String(latitudNumerica),
        longitud: String(longitudNumerica),
      });
      const respuesta = await fetch(`/api/ubicacion?${parametros}`, {
        credentials: "same-origin",
      });
      const datos = (await respuesta.json()) as ResultadoUbicacion & { error?: string };
      if (!respuesta.ok) throw new Error(datos.error);
      establecerResultado(datos);
      registrarUso("busqueda_coordenadas");
    } catch (motivo) {
      establecerError(
        motivo instanceof Error && motivo.message
          ? motivo.message
          : "No se pudo consultar la ubicación."
      );
    } finally {
      establecerCargando(false);
    }
  };

  const consultarDireccion = async (evento: React.FormEvent) => {
    evento.preventDefault();
    establecerError("");
    establecerResultado(null);
    const direccionLimpia = direccion.replace(/\s+/g, " ").trim();
    if (direccionLimpia.length < 5) {
      establecerError("Pega una dirección con calle, localidad o código postal.");
      return;
    }

    establecerCargando(true);
    try {
      const parametros = new URLSearchParams({ direccion: direccionLimpia });
      const respuesta = await fetch(`/api/ubicacion?${parametros}`, {
        credentials: "same-origin",
      });
      const datos = (await respuesta.json()) as ResultadoUbicacion & { error?: string };
      if (!respuesta.ok) throw new Error(datos.error);
      establecerResultado(datos);
      registrarUso("busqueda_direccion");
    } catch (motivo) {
      establecerError(
        motivo instanceof Error && motivo.message
          ? motivo.message
          : "No se pudo buscar la dirección."
      );
    } finally {
      establecerCargando(false);
    }
  };

  const abrirMapa = () => {
    if (!resultado) return;
    const { latitud, longitud } = resultado;
    window.open(
      `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=18/${latitud}/${longitud}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const abrirGoogleMaps = () => {
    if (!resultado) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${resultado.latitud},${resultado.longitud}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copiarCoordenada = async (valor: number, documentoActivo: Document) => {
    const texto = String(valor);
    const area = documentoActivo.createElement("textarea");
    area.value = texto;
    area.style.cssText = "position:fixed;left:-9999px;opacity:0";
    documentoActivo.body.appendChild(area);
    area.focus();
    area.select();
    const copiado = documentoActivo.execCommand("copy");
    area.remove();
    if (!copiado) {
      await (documentoActivo.defaultView?.navigator.clipboard ?? navigator.clipboard)
        ?.writeText(texto);
    }
  };

  return (
    <aside className={`ubicacion-rapida ubicacion-${variante} ${abierto ? "abierta" : ""}`}>
      <button
        className="ubicacion-rapida-activador"
        data-nombre="Localización"
        type="button"
        onClick={alternar}
        title="Localizar coordenadas"
        aria-label={abierto ? "Cerrar ubicación" : "Localizar coordenadas"}
        aria-expanded={abierto}
      >
        <span className="herramienta-menu-icono" aria-hidden="true">
          <img src={iconoLocalizacion} alt="" />
        </span>
        <strong>Localización</strong>
      </button>

      {abierto && (
        <section className="ubicacion-rapida-panel">
          <header>
            <div>
              <small>Localización aproximada</small>
              <h2>Buscar coordenadas <span className="ubicacion-en-desarrollo">En desarrollo</span></h2>
            </div>
            <button type="button" onClick={alternar} aria-label="Cerrar">×</button>
          </header>
          <p className="ubicacion-aviso-desarrollo">
            Herramienta en desarrollo. Verifica siempre la dirección y el punto mostrado antes de utilizarlos.
          </p>
          <div className="ubicacion-modos">
            <button className={modo === "coordenadas" ? "activo" : ""} type="button" onClick={() => { establecerModo("coordenadas"); establecerError(""); establecerResultado(null); }}>Coordenadas</button>
            <button className={modo === "direccion" ? "activo" : ""} type="button" onClick={() => { establecerModo("direccion"); establecerError(""); establecerResultado(null); }}>Dirección completa</button>
          </div>

          {modo === "coordenadas" ? (
            <form onSubmit={consultar}>
              <div className="ubicacion-campos-coordenadas">
                <label htmlFor={`latitud-${variante}`}>
                  Latitud
                  <input id={`latitud-${variante}`} value={latitud} onChange={(evento) => establecerLatitud(evento.target.value)} placeholder="40.4168" inputMode="decimal" autoFocus />
                </label>
                <label htmlFor={`longitud-${variante}`}>
                  Longitud
                  <input id={`longitud-${variante}`} value={longitud} onChange={(evento) => establecerLongitud(evento.target.value)} placeholder="-3.7038" inputMode="decimal" />
                </label>
              </div>
              <button type="submit" disabled={cargando}>{cargando ? "Buscando…" : "Localizar coordenadas"}</button>
              <small>Puedes usar punto o coma para los decimales.</small>
              {error && <p className="ubicacion-rapida-error">{error}</p>}
            </form>
          ) : (
            <form onSubmit={consultarDireccion}>
              <label htmlFor={`direccion-${variante}`}>
                Pega todos los datos de la instalación
                <textarea
                  id={`direccion-${variante}`}
                  value={direccion}
                  onChange={(evento) => establecerDireccion(evento.target.value)}
                  placeholder={"Calle y número\nCódigo postal · Localidad\nProvincia"}
                  rows={4}
                  maxLength={500}
                  autoFocus
                />
              </label>
              <button type="submit" disabled={cargando}>{cargando ? "Buscando…" : "Buscar dirección en el mapa"}</button>
              <small>La dirección se consulta en OpenStreetMap y no se guarda en la aplicación.</small>
              {error && <p className="ubicacion-rapida-error">{error}</p>}
            </form>
          )}

          {resultado && (
            <div className="ubicacion-rapida-resultado">
              <span>{resultado.codigoPostal || "Sin código postal"}</span>
              <h3>{resultado.localidad || resultado.provincia || "Ubicación encontrada"}</h3>
              <p>{resultado.direccionCompleta}</p>
              {modo === "direccion" && <p className="ubicacion-coincidencia"><strong>Comprueba que esta coincidencia corresponde a la instalación.</strong></p>}
              <div className="ubicacion-coordenadas-separadas">
                <div>
                  <small>Latitud</small>
                  <code>{resultado.latitud}</code>
                  <button type="button" onClick={(evento) => copiarCoordenada(resultado.latitud, evento.currentTarget.ownerDocument)}>Copiar latitud</button>
                </div>
                <div>
                  <small>Longitud</small>
                  <code>{resultado.longitud}</code>
                  <button type="button" onClick={(evento) => copiarCoordenada(resultado.longitud, evento.currentTarget.ownerDocument)}>Copiar longitud</button>
                </div>
              </div>
              <div>
                <button type="button" onClick={abrirMapa}>OpenStreetMap</button>
                <button type="button" onClick={abrirGoogleMaps}>Google Maps</button>
              </div>
              <small>Ubicación orientativa. Confirma los datos antes de movilizar recursos.</small>
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
