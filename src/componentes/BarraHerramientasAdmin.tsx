import React from "react";
import { ConsultaAlfabetoFonetico } from "./ConsultaAlfabetoFonetico";
import { ConsultaClimaRapida } from "./ConsultaClimaRapida";
import { ConsultaCodigosOperativos } from "./ConsultaCodigosOperativos";
import { ConsultaComentariosRapidos } from "./ConsultaComentariosRapidos";
import { ConsultaCuadranteRapida } from "./ConsultaCuadranteRapida";
import { ConsultaFseRapida } from "./ConsultaFseRapida";
import { ConsultaProductividadRapida } from "./ConsultaProductividadRapida";
import { ConsultaTelefonosInteres } from "./ConsultaTelefonosInteres";
import { ConsultaUbicacionRapida } from "./ConsultaUbicacionRapida";

/**
 * Versión experimental, integrada en la portada y reservada al administrador.
 * Reutiliza las herramientas existentes para conservar todas sus operaciones.
 */
export const BarraHerramientasAdmin: React.FC<{ flotante?: boolean; esAdministrador?: boolean }> = ({ flotante = false, esAdministrador = false }) => {
  const [modoNoche, establecerModoNoche] = React.useState(
    () => localStorage.getItem("cra-barra-flotante-tema") !== "dia"
  );

  React.useEffect(() => {
    localStorage.setItem("cra-barra-flotante-tema", modoNoche ? "noche" : "dia");
  }, [modoNoche]);

  return <section className={`barra-herramientas-admin ${flotante ? "barra-herramientas-admin-flotante" : ""} ${modoNoche ? "modo-noche" : ""}`} aria-labelledby="titulo-barra-herramientas-admin">
    <header className="barra-herramientas-admin-cabecera">
      <span aria-hidden="true">⚡</span>
      <div>
        <small>Nueva vista · Solo administrador</small>
        <strong id="titulo-barra-herramientas-admin">Herramientas auxiliares</strong>
      </div>
      <em>Selecciona una para desplegarla</em>
    </header>
    <nav className="barra-herramientas-admin-accesos" aria-label="Herramientas auxiliares administrativas">
      <ConsultaFseRapida />
      <ConsultaClimaRapida />
      <ConsultaCuadranteRapida />
      <ConsultaComentariosRapidos />
      <ConsultaUbicacionRapida />
      <ConsultaAlfabetoFonetico />
      <ConsultaProductividadRapida />
      <ConsultaTelefonosInteres esAdministrador={esAdministrador} />
      <ConsultaCodigosOperativos esAdministrador={esAdministrador} />
      <button className="barra-flotante-tema" type="button" onClick={() => establecerModoNoche((valor) => !valor)} aria-label={modoNoche ? "Activar modo día" : "Activar modo noche"} title={modoNoche ? "Modo día" : "Modo noche"}>
        <span aria-hidden="true">{modoNoche ? "☀" : "☾"}</span>
      </button>
    </nav>
  </section>;
};
