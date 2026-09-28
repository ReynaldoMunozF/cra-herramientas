import React from "react";
import { Link } from "react-router-dom";
import { PanelEstadisticasUso } from "../componentes/PanelEstadisticasUso";
import { EditorCuadranteAdmin } from "../componentes/EditorCuadranteAdmin";
import { PanelJuegosInvitados } from "../componentes/PanelJuegosInvitados";
import { PanelPinesOperadores } from "../componentes/PanelPinesOperadores";
import { PanelReinicioMarcadores } from "../componentes/PanelReinicioMarcadores";
import { RinconJavi } from "../componentes/RinconJavi";
import { PanelComunidadInicio } from "../componentes/PanelComunidadInicio";
import { PanelBibliotecaAdmin } from "../componentes/Biblioteca";

/** Área privada: el servidor decide el rol antes de revelar los paneles. */
export const PaginaHerramientasAdministrador: React.FC = () => {
  const [cargando, establecerCargando] = React.useState(true);
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) => establecerEsAdministrador(sesion.rol === "administrador"))
      .catch(() => establecerEsAdministrador(false))
      .finally(() => establecerCargando(false));
  }, []);

  if (cargando) {
    return <main className="pagina-administracion-privada"><p>Comprobando acceso…</p></main>;
  }

  if (!esAdministrador) {
    return (
      <main className="pagina-administracion-privada acceso-denegado">
        <span aria-hidden="true">🔒</span>
        <h1>Área privada</h1>
        <p>Esta sección está disponible únicamente para el administrador.</p>
        <Link to="/">Volver a Herramientas CRA</Link>
      </main>
    );
  }

  return (
    <main className="pagina-administracion-privada">
      <header className="cabecera-administracion-privada">
        <span>Solo administrador</span>
        <h1>Herramientas de administración</h1>
        <p>Gestiona el contenido y consulta el funcionamiento de la aplicación sin cargar la portada de los operadores.</p>
        <Link to="/">← Volver a la portada</Link>
      </header>
      <PanelComunidadInicio />
      <PanelBibliotecaAdmin />
      <PanelEstadisticasUso />
      <EditorCuadranteAdmin />
      <PanelPinesOperadores />
      <PanelJuegosInvitados />
      <PanelReinicioMarcadores />
      <RinconJavi esAdministrador soloEditor />
    </main>
  );
};
