import React from "react";
import { BrowserRouter as Enrutador, Routes as Rutas, Route as Ruta, useLocation } from "react-router-dom";
import { PaginaOperativas } from "./paginas/PaginaOperativas";
import { PaginaInicio } from "./paginas/PaginaInicio";
import { PaginaListado } from "./paginas/PaginaListado";
import { PaginaDetalle } from "./paginas/PaginaDetalle";
import { PaginaCuadrante } from "./paginas/PaginaCuadrante";
import { RelojGlobal } from "./componentes/RelojGlobal";
import { PaginaAdministracionManual } from "./paginas/PaginaAdministracionManual";
import { AvisosMeteorologicosGlobales } from "./componentes/AvisosMeteorologicosGlobales";
import { BotonHerramientasRapidas } from "./componentes/BotonHerramientasRapidas";
import { PaginaHerramientasRapidas } from "./paginas/PaginaHerramientasRapidas";
import { FeedbackGlobal } from "./componentes/FeedbackGlobal";
import { ConsejosOperador } from "./componentes/ConsejosOperador";
import { PaginaComputoAnual } from "./paginas/PaginaComputoAnual";
import { PaginaZonaDescanso } from "./paginas/PaginaZonaDescanso";

// Las hojas se importan en orden: fundamentos, estructura y módulos concretos.
// Mantener este orden evita que una regla general sobrescriba estilos específicos.
import "./estilos/base.css";
import "./estilos/inicio.css";
import "./estilos/estructura-general.css";
import "./estilos/listado.css";
import "./estilos/operativas.css";
import "./estilos/comentarios.css";
import "./estilos/clima.css";
import "./estilos/fse.css";
import "./estilos/reloj.css";
import "./estilos/administracion-manual.css";
import "./estilos/avisos-meteorologicos.css";
import "./estilos/herramientas-rapidas.css";
import "./estilos/ubicacion.css";
import "./estilos/alfabeto-fonetico.css";
import "./estilos/productividad.css";
import "./estilos/editor-cuadrante-admin.css";
import "./estilos/feedback.css";
import "./estilos/estadisticas.css";
import "./estilos/computo-anual.css";
import "./estilos/zona-descanso.css";
import "./estilos/cra-social.css";
import "./estilos/codigos-operativos.css";
import "./cuadrante/cuadrante.css";

/**
 * Componente raíz de la aplicación.
 * BrowserRouter permite cambiar de pantalla utilizando rutas del navegador
 * sin recargar la página completa.
 */
const ContenidoAplicacion: React.FC = () => {
  const rutaActual = useLocation().pathname;
  const esVentanaHerramientas = rutaActual === "/herramientas-rapidas";
  const esVentanaZonaDescanso = rutaActual === "/zona-descanso";
  const esVentanaAuxiliar = esVentanaHerramientas || esVentanaZonaDescanso;
  // Conservamos los avisos meteorológicos preparados, pero quedan ocultos
  // temporalmente hasta decidir su nueva ubicación en la portada.
  const MOSTRAR_AVISOS_METEOROLOGICOS = false;

  return (
    <>
      {/* Cloudflare elimina la cookie segura y vuelve a mostrar la pantalla de acceso. */}
      {!esVentanaAuxiliar && <header className="barra-superior-global">
        <span className="barra-superior-espacio" aria-hidden="true" />
        <div className="barra-superior-centro">
          <RelojGlobal />
          <div className="herramientas-cabecera">
            <BotonHerramientasRapidas />
          </div>
        </div>
        <a className="boton-cerrar-sesion" href="/cerrar-sesion" aria-label="Cerrar sesión">Salir</a>
      </header>}
      {!esVentanaAuxiliar && <section className="consejo-operador-destacado"><ConsejosOperador /></section>}
      {!esVentanaAuxiliar && MOSTRAR_AVISOS_METEOROLOGICOS && <AvisosMeteorologicosGlobales />}
      {!esVentanaAuxiliar && <FeedbackGlobal />}
      <Rutas>
        <Ruta path="/herramientas-rapidas" element={<PaginaHerramientasRapidas />} />
        <Ruta path="/zona-descanso" element={<PaginaZonaDescanso />} />

        {/* Portada privada y escalable con acceso a todas las herramientas. */}
        <Ruta path="/" element={<PaginaInicio />} />

        {/* Manual CRA y flujogramas interactivos. */}
        <Ruta path="/manual" element={<PaginaOperativas />} />

        {/* Editor versionado del contenido operativo. */}
        <Ruta path="/administracion/manual" element={<PaginaAdministracionManual />} />

        {/* Consulta individual del cuadrante mensual por siglas. */}
        <Ruta path="/cuadrante" element={<PaginaCuadrante />} />

        {/* Registro personal de turnos y cálculo anual de horas por matrícula. */}
        <Ruta path="/computo-anual" element={<PaginaComputoAnual />} />

        {/* Rutas heredadas del ejercicio original de Lemoncode. */}
        <Ruta path="/list" element={<PaginaListado />} />

        {/* :id es un parámetro dinámico que identifica al usuario. */}
        <Ruta path="/detail/:id" element={<PaginaDetalle />} />
      </Rutas>

      {/* Autoría visible en todas las páginas de la herramienta. */}
      {!esVentanaAuxiliar && <footer className="pie-desarrollador">
        <p>© 2026 Reynaldo Muñoz · Todos los derechos reservados</p>
        <a href="mailto:reynaldo.munozf21@gmail.com">reynaldo.munozf21@gmail.com</a>
      </footer>}
    </>
  );
};

export const Aplicacion = () => <Enrutador><ContenidoAplicacion /></Enrutador>;
