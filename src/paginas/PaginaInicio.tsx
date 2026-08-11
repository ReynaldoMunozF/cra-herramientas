import React from "react";
import { Link } from "react-router-dom";
import imagenManual from "../recursos/inicio/manual-operativo.png";
import imagenCuadrante from "../recursos/inicio/gestion-cuadrante.png";
import imagenComputoAnual from "../recursos/inicio/computo-anual.svg";
import imagenHerramientasRapidas from "../recursos/inicio/herramientas-rapidas.svg";
import imagenZonaDescanso from "../recursos/inicio/zona-descanso.svg";
import { PanelEstadisticasUso } from "../componentes/PanelEstadisticasUso";
import { EditorCuadranteAdmin } from "../componentes/EditorCuadranteAdmin";
import { PanelReinicioMarcadores } from "../componentes/PanelReinicioMarcadores";
import { PanelJuegosInvitados } from "../componentes/PanelJuegosInvitados";
import { RinconJavi } from "../componentes/RinconJavi";

interface HerramientaPortal {
  titulo: string;
  descripcion: string;
  ruta: string;
  imagen: string;
  textoBoton: string;
  clase: string;
  nuevaVentana?: boolean;
}

/**
 * El manual permanece desarrollado y accesible en el código, pero su tarjeta
 * se oculta temporalmente de la portada para administradores e invitados.
 */
const MOSTRAR_MANUAL_EN_PORTADA = false;

/** Accesos auxiliares compactos situados antes de las herramientas principales. */
const accesosRapidos: HerramientaPortal[] = [
  {
    titulo: "Herramientas rápidas",
    descripcion: "Consultas auxiliares para la gestión diaria.",
    ruta: "/herramientas-rapidas",
    imagen: imagenHerramientasRapidas,
    textoBoton: "Abrir",
    clase: "herramientas-rapidas",
    nuevaVentana: true,
  },
  {
    titulo: "Zona de descanso",
    descripcion: "Juegos breves de memoria, lógica y competición.",
    ruta: "/zona-descanso",
    imagen: imagenZonaDescanso,
    textoBoton: "Entrar",
    clase: "zona-descanso-tarjeta",
    nuevaVentana: true,
  },
];

/** Catálogo de accesos disponibles en la portada privada. */
const herramientas: HerramientaPortal[] = [
  {
    titulo: "Manual operativo",
    descripcion: "Consulta señales, comentarios frecuentes y procedimientos guiados paso a paso.",
    ruta: "/manual",
    imagen: imagenManual,
    textoBoton: "Entrar al manual",
    clase: "manual",
  },
  {
    titulo: "Gestión del cuadrante",
    descripcion: "Revisa turnos, compara operadores y prepara propuestas de cambio de forma sencilla.",
    ruta: "/cuadrante",
    imagen: imagenCuadrante,
    textoBoton: "Gestionar cuadrante",
    clase: "cuadrante",
  },
  {
    titulo: "Cómputo anual",
    descripcion: "Registra tus turnos y consulta automáticamente las horas trabajadas, nocturnas y el saldo anual.",
    ruta: "/computo-anual",
    imagen: imagenComputoAnual,
    textoBoton: "Abrir cómputo anual",
    clase: "computo-anual",
  },
];

const IconoNovedad: React.FC<{ tipo: string }> = ({ tipo }) => {
  const rutas: Record<string, React.ReactNode> = {
    general: <><path d="M4 6h16v12H4zM4 10h16M8 14h3M15 14h1" /></>,
    fse: <><path d="M6 17h12l-1.2-8.2A4.8 4.8 0 0 0 12 5a4.8 4.8 0 0 0-4.8 3.8L6 17Z" /><path d="M4 21h16M8 17v4M16 17v4" /></>,
    comentarios: <><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></>,
    cuadrante: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16M8 13h2M14 13h2M8 17h2" /></>,
    ubicacion: <><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
    alfabeto: <><path d="M4 5h16v14H4zM8 9h8M8 13h5M8 16h8" /><path d="m17 12 2 2-2 2" /></>,
    juegos: <><path d="M7 8h10a4 4 0 0 1 3.8 5.2l-1.4 4.2a2 2 0 0 1-3.2.9L14 16h-4l-2.2 2.3a2 2 0 0 1-3.2-.9l-1.4-4.2A4 4 0 0 1 7 8Z" /><path d="M7 12h4M9 10v4M16 11h.01M18 13h.01" /></>,
    productividad: <><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /><path d="M2 19h22M5 6l5-3 6 5 6-6" /></>,
    computo: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M7 3l-2 2M17 3l2 2" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{rutas[tipo]}</svg>;
};

const NovedadesInvitados: React.FC = () => (
  <section className="inicio-novedades" aria-labelledby="titulo-novedades">
    <header>
      <span>Últimas actualizaciones</span>
      <h2 id="titulo-novedades">Novedades para los operadores</h2>
      <p>Nuevas herramientas y mejoras pensadas para agilizar la gestión diaria.</p>
    </header>

    <article className="novedad-juegos">
      <div className="novedad-icono"><IconoNovedad tipo="juegos" /></div>
      <div className="novedad-juegos-contenido">
        <span>Nuevo · Pausas activas</span>
        <h3>Zona de descanso</h3>
        <p>Aprovecha los tiempos muertos con partidas rápidas, desde unos segundos hasta aproximadamente cinco minutos.</p>
        <div className="novedad-juegos-etiquetas"><b>Código secreto</b><b>Palabra clave</b><b>Caso del asesino</b><b>Hundir la flota</b><b>Desactivar el panel</b></div>
        <strong>El administrador irá activando y rotando los juegos periódicamente para mantener nuevos retos disponibles.</strong>
      </div>
    </article>

    <article className="novedad-general">
      <div className="novedad-icono"><IconoNovedad tipo="general" /></div>
      <div><span>Herramientas rápidas</span><h3>Más compactas y adaptadas al móvil</h3><p>Accesos reorganizados, resultados más visibles y mejor aprovechamiento del espacio.</p></div>
    </article>

    <div className="novedades-listado">
      <article><div className="novedad-icono"><IconoNovedad tipo="fse" /></div><div><h3>Fuerzas de Seguridad</h3><p>Confirma si el resultado es correcto o corrígelo para mejorar próximas consultas.</p></div></article>
      <article><div className="novedad-icono"><IconoNovedad tipo="comentarios" /></div><div><h3>Comentarios frecuentes</h3><p>Crea, elimina y ordena tus comentarios personales para copiar primero los más utilizados.</p></div></article>
      <article className="novedad-productividad"><div className="novedad-icono"><IconoNovedad tipo="productividad" /></div><div><h3>Gestión de productividad</h3><p>Registra alarmas y gestiones con un toque, ajusta las horas trabajadas o extras y consulta la productividad diaria y acumulada.</p><small>Permite corregir días anteriores y descontar el tiempo de gestiones largas comunicadas por correo.</small></div></article>
      <article className="novedad-computo"><div className="novedad-icono"><IconoNovedad tipo="computo" /></div><div><h3>Cómputo anual de horas</h3><p>Registra o modifica tus turnos y consulta automáticamente las horas trabajadas, nocturnas y el saldo anual por matrícula.</p></div></article>
      <article className="novedad-cuadrante"><div className="novedad-icono"><IconoNovedad tipo="cuadrante" /></div><div><h3>Cuadrante</h3><p>Consulta los días y turnos con un diseño más compacto y fácil de leer.</p><strong className="novedad-fecha-cuadrante">✓ Actualizado hasta el 24 de julio de 2026</strong></div></article>
      <article><div className="novedad-icono"><IconoNovedad tipo="ubicacion" /></div><div><h3>Localización</h3><p>Busca mediante latitud y longitud separadas o pegando una dirección completa.</p></div></article>
      <article className="novedad-destacada">
        <span className="novedad-nueva">★ Nueva herramienta de gestión</span>
        <div className="novedad-icono"><IconoNovedad tipo="alfabeto" /></div>
        <div><h3>Alfabeto fonético</h3><p>Consulta el alfabeto o escribe una palabra, matrícula o número para obtener y copiar su deletreo.</p></div>
      </article>
    </div>
  </section>
);

/** Portada privada; el cuadro estadístico solo se monta para el administrador. */
export const PaginaInicio: React.FC = () => {
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);
  const [sesionCargada, establecerSesionCargada] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) =>
        establecerEsAdministrador(sesion.rol === "administrador")
      )
      .catch(() => establecerEsAdministrador(false))
      .finally(() => establecerSesionCargada(true));
  }, []);

  return (
    <main className="pagina-inicio">
      <header className="inicio-cabecera">
        <span>Portal privado CRA</span>
        <h1>¿Qué necesitas gestionar?</h1>
        <p>Selecciona una herramienta para comenzar. Este espacio crecerá con nuevas funcionalidades.</p>
      </header>

      {sesionCargada && <RinconJavi esAdministrador={esAdministrador} />}

      <nav className="inicio-accesos-rapidos" aria-label="Accesos rápidos">
        {accesosRapidos.map((acceso) => <Link className={acceso.clase} to={acceso.ruta} target="_blank" rel="noopener" key={acceso.ruta}>
          <img src={acceso.imagen} alt="" aria-hidden="true" />
          <span><small>Acceso rápido</small><strong>{acceso.titulo}</strong><em>{acceso.descripcion}</em></span>
          <b aria-hidden="true">→</b>
        </Link>)}
      </nav>

      <section className="inicio-herramientas" aria-label="Herramientas disponibles">
        {herramientas
          .filter((herramienta) =>
            MOSTRAR_MANUAL_EN_PORTADA || herramienta.ruta !== "/manual"
          )
          .map((herramienta) => (
          <article className={`inicio-tarjeta ${herramienta.clase}`} key={herramienta.ruta}>
            <div className="inicio-imagen">
              <img src={herramienta.imagen} alt="" aria-hidden="true" />
              <span>Disponible</span>
            </div>
            <div className="inicio-contenido">
              <h2>{herramienta.titulo}</h2>
              <p>{herramienta.descripcion}</p>
              <Link to={herramienta.ruta} target={herramienta.nuevaVentana ? "_blank" : undefined} rel={herramienta.nuevaVentana ? "noopener" : undefined}>
                {herramienta.textoBoton}<span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </section>

      {sesionCargada && <NovedadesInvitados />}
      {esAdministrador && <PanelEstadisticasUso />}
      {esAdministrador && <EditorCuadranteAdmin />}
      {esAdministrador && <PanelJuegosInvitados />}
      {esAdministrador && <PanelReinicioMarcadores />}
      {esAdministrador && <RinconJavi esAdministrador soloEditor />}
      <p className="inicio-proximamente">Nuevas herramientas se incorporarán próximamente.</p>
    </main>
  );
};
