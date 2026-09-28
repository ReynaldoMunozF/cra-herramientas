import React from "react";
import { Link } from "react-router-dom";
import imagenCuadrante from "../recursos/inicio/gestion-cuadrante.png";
import imagenComputoAnual from "../recursos/inicio/computo-anual.svg";
import { PanelEstadisticasUso } from "../componentes/PanelEstadisticasUso";
import { EditorCuadranteAdmin } from "../componentes/EditorCuadranteAdmin";
import { PanelReinicioMarcadores } from "../componentes/PanelReinicioMarcadores";
import { PanelJuegosInvitados } from "../componentes/PanelJuegosInvitados";
import { PanelPinesOperadores } from "../componentes/PanelPinesOperadores";
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

/** Accesos principales visibles al entrar al portal. */
const herramientas: HerramientaPortal[] = [
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

/** Bloques de comunidad preparados para gestionar desde administración en una siguiente fase. */
const InicioComunidad: React.FC = () => (
  <section className="inicio-comunidad" aria-label="Espacio recomendado y tablón de anuncios">
    <article className="inicio-recomendado">
      <header><span aria-hidden="true">✦</span><strong>Espacio recomendado</strong><em>Patrocinado</em></header>
      <div className="inicio-recomendado-ilustracion" aria-hidden="true">☕</div>
      <div>
        <h2>Tu emprendimiento, aquí</h2>
        <p>Un espacio breve y cuidado para recomendar lo que quieras compartir con el equipo.</p>
        <small>Próximamente gestionable desde administración.</small>
      </div>
    </article>
    <article className="inicio-tablon">
      <header><span aria-hidden="true">📌</span><h2>Tablón</h2><button type="button" disabled>Ver todo →</button></header>
      <div className="inicio-tablon-vacio">
        <b>Próximos mini eventos</b>
        <p>Este espacio mostrará avisos breves, actividades y recordatorios del equipo.</p>
      </div>
    </article>
  </section>
);

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
    telefonos: <><path d="M7.2 4.5c1.2-.4 3.4 3.4 2.8 4.7l-1.6 1.2c1.2 2.6 2.7 4.1 5.3 5.3l1.2-1.6c1.3-.6 5.1 1.6 4.7 2.8-.5 2-2.2 3-4.3 2.5C10 18 6 14 4.7 8.8c-.5-2.1.5-3.8 2.5-4.3Z" /><path d="M14 4h6v6M20 4l-6 6" /></>,
    mensajes: <><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /><path d="m15.5 18 1.5 1.5 3-3" /></>,
    seguridad: <><path d="M6 10V8a6 6 0 0 1 12 0v2" /><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M12 14v3" /></>,
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

    <article className="novedad-cuadrante novedad-cuadrante-principal">
      <div className="novedad-icono"><IconoNovedad tipo="cuadrante" /></div>
      <div>
        <span className="novedad-actualizacion">Actualización de hoy</span>
        <h3>Cuadrante de octubre subido</h3>
        <p>Ya está disponible el cuadrante de octubre con sus días, turnos y horas actualizados.</p>
        <strong className="novedad-fecha-cuadrante">✓ Actualizado hoy, 23 de septiembre de 2026</strong>
      </div>
    </article>

    <article className="novedad-general novedad-seguridad-pin">
      <div className="novedad-icono"><IconoNovedad tipo="seguridad" /></div>
      <div className="novedad-seguridad-contenido">
        <span className="novedad-alerta-pin"><b aria-hidden="true">!</b> IMPORTANTE · NUEVA PROTECCIÓN</span>
        <h3>Protege tus datos con un PIN personal</h3>
        <p>La productividad y el cómputo anual de horas quedan protegidos por matrícula para evitar que otras personas consulten o modifiquen tus datos.</p>
        <strong><span aria-hidden="true">🔑</span><span>¿Todavía no tienes PIN?<small>Solicítalo al administrador para proteger tu matrícula.</small></span></strong>
      </div>
    </article>

    <article className="novedad-telefonos">
      <div className="novedad-icono"><IconoNovedad tipo="telefonos" /></div>
      <div className="novedad-telefonos-contenido">
        <span>Nueva herramienta</span>
        <h3>Teléfonos de interés compartidos</h3>
        <p>Ya está disponible un directorio común con acceso rápido a los números importantes para el servicio.</p>
        <strong>¿Falta algún contacto útil? Envía al administrador los teléfonos que consideres importantes. Se comprobarán antes de incorporarlos a la lista.</strong>
        <Link to="/herramientas-rapidas" target="_blank" rel="noopener">Consultar teléfonos <b aria-hidden="true">→</b></Link>
      </div>
    </article>

    <article className="novedad-general novedad-herramientas-destacada">
      <div className="novedad-icono"><IconoNovedad tipo="general" /></div>
      <div className="novedad-herramientas-contenido">
        <span><b>Nueva</b> · Barra flotante</span>
        <h3>Todas las herramientas ocupando mucho menos espacio</h3>
        <p>La nueva barra flotante reúne todas las consultas auxiliares en una sola fila de iconos. Solo despliega la herramienta que estás usando, deja más espacio libre en pantalla y puede mantenerse visible mientras trabajas.</p>
        <div className="novedad-herramientas-resumen" aria-label="Resumen de herramientas rápidas">
          <b>Fuerzas de Seguridad</b>
          <b>Clima</b>
          <b>Cuadrante</b>
          <b>Comentarios</b>
          <b>Localización</b>
          <b>Alfabeto fonético</b>
          <b>Productividad</b>
          <b>Teléfonos de interés</b>
          <b>Resoluciones y SMS</b>
        </div>
        <small>Busca en el encabezado el botón <strong>«NUEVA · Barra flotante»</strong> para abrirla.</small>
      </div>
    </article>

    <article className="novedad-mensajes">
      <div className="novedad-icono"><IconoNovedad tipo="mensajes" /></div>
      <div className="novedad-mensajes-contenido">
        <span>Nueva herramienta incluida</span>
        <h3>Mensajes de cierre y SMS preparados para usar</h3>
        <p>Encuentra rápidamente el texto o código adecuado para cerrar una gestión o comunicar una incidencia al cliente, sin tener que buscarlo fuera de la aplicación.</p>
        <div className="novedad-mensajes-opciones">
          <b><i>✓</i><span>Resoluciones<small>Mensajes para el cierre de gestiones</small></span></b>
          <b><i>SMS</i><span>Comandos SMS<small>Plantillas rápidas de comunicación</small></span></b>
        </div>
        <strong>Disponible dentro de la nueva barra flotante en el icono de documento.</strong>
      </div>
    </article>

    <article className="novedad-juegos">
      <div className="novedad-icono"><IconoNovedad tipo="juegos" /></div>
      <div className="novedad-juegos-contenido">
        <span>Pausas activas</span>
        <h3>Zona de descanso</h3>
        <p>Aprovecha los tiempos muertos con partidas rápidas, desde unos segundos hasta aproximadamente cinco minutos.</p>
        <div className="novedad-juegos-etiquetas"><b>Código secreto</b><b>Palabra clave</b><b>Caso del asesino</b><b>Hundir la flota</b><b>Desactivar el panel</b></div>
        <strong>El administrador irá activando y rotando los juegos periódicamente para mantener nuevos retos disponibles.</strong>
      </div>
    </article>
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
        <span>Herramientas CRA</span>
        <h1>¿Qué necesitas gestionar hoy?</h1>
        <p>Accede primero a lo más importante. Las consultas auxiliares siguen disponibles arriba, en la barra tradicional y la flotante.</p>
      </header>

      <section className="inicio-herramientas" aria-label="Herramientas disponibles">
        {herramientas.map((herramienta) => (
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

      {sesionCargada && <RinconJavi esAdministrador={esAdministrador} />}
      <InicioComunidad />
      {sesionCargada && <NovedadesInvitados />}
      {esAdministrador && <PanelEstadisticasUso />}
      {esAdministrador && <EditorCuadranteAdmin />}
      {esAdministrador && <PanelJuegosInvitados />}
      {esAdministrador && <PanelPinesOperadores />}
      {esAdministrador && <PanelReinicioMarcadores />}
      {esAdministrador && <RinconJavi esAdministrador soloEditor />}
      <p className="inicio-proximamente">Nuevas herramientas se incorporarán próximamente.</p>
    </main>
  );
};
