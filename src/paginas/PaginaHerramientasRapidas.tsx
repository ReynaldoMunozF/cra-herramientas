import React from "react";
import { createPortal } from "react-dom";
import { ConsultaClimaRapida } from "../componentes/ConsultaClimaRapida";
import { ConsultaFseRapida } from "../componentes/ConsultaFseRapida";
import { ConsultaCuadranteRapida } from "../componentes/ConsultaCuadranteRapida";
import { ConsultaComentariosRapidos } from "../componentes/ConsultaComentariosRapidos";
import { ConsultaUbicacionRapida } from "../componentes/ConsultaUbicacionRapida";
import { ConsultaAlfabetoFonetico } from "../componentes/ConsultaAlfabetoFonetico";
import { ConsultaProductividadRapida } from "../componentes/ConsultaProductividadRapida";
import { ConsultaCodigosOperativos } from "../componentes/ConsultaCodigosOperativos";

interface GestorPictureInPicture {
  window: Window | null;
  requestWindow: (opciones: {
    width: number;
    height: number;
    preferInitialWindowPlacement?: boolean;
  }) => Promise<Window>;
}

/** Amplía el tipo de Window mientras la API todavía no forma parte de todos los navegadores. */
const obtenerGestorFlotante = () =>
  (window as Window & { documentPictureInPicture?: GestorPictureInPicture }).documentPictureInPicture;

interface PropiedadesPaginaHerramientasRapidas {
  ventanaFijaExterna?: Window | null;
  alCerrarVentanaFija?: () => void;
}

/** Ventana auxiliar compacta que puede permanecer junto al gestor operativo. */
export const PaginaHerramientasRapidas: React.FC<PropiedadesPaginaHerramientasRapidas> = ({
  ventanaFijaExterna = null,
  alCerrarVentanaFija,
}) => {
  const [herramientaActiva, establecerHerramientaActiva] = React.useState("ninguna");
  const [ventanaFijada, establecerVentanaFijada] = React.useState(false);
  const [contenedorFlotante, establecerContenedorFlotante] = React.useState<HTMLElement | null>(null);
  const [esAdministrador, establecerEsAdministrador] = React.useState(false);
  const referenciaVentanaFija = React.useRef<Window | null>(ventanaFijaExterna);
  const compatibleConVentanaFija = Boolean(obtenerGestorFlotante());

  React.useEffect(() => {
    fetch("/api/sesion", { credentials: "same-origin" })
      .then((respuesta) => respuesta.json())
      .then((sesion: { rol?: string }) => establecerEsAdministrador(sesion.rol === "administrador"))
      .catch(() => establecerEsAdministrador(false));
  }, []);

  React.useEffect(() => {
    referenciaVentanaFija.current = ventanaFijaExterna;
  }, [ventanaFijaExterna]);

  /**
   * Traslada la interfaz actual a una ventana Picture-in-Picture. Esta ventana
   * pertenece al navegador, permanece sobre las demás aplicaciones y no
   * requiere instalar una PWA, extensión ni programa adicional.
   */
  const fijarVentana = async () => {
    const gestor = obtenerGestorFlotante();
    if (!gestor) return;

    if (gestor.window && !gestor.window.closed) {
      gestor.window.focus();
      return;
    }

    try {
      const ventanaFlotante = await gestor.requestWindow({
        // El tamaño fijo evita que Chrome recoloque la ventana al consultar herramientas.
        width: Math.min(340, window.screen.availWidth),
        height: Math.min(430, window.screen.availHeight),
        preferInitialWindowPlacement: true,
      });

      ventanaFlotante.document.title = "Herramientas rápidas CRA";
      ventanaFlotante.document.documentElement.lang = "es";
      ventanaFlotante.document.documentElement.style.minWidth = "0";
      ventanaFlotante.document.documentElement.style.overflowX = "hidden";
      ventanaFlotante.document.body.style.margin = "0";
      ventanaFlotante.document.body.style.minHeight = "100vh";
      ventanaFlotante.document.body.style.minWidth = "0";
      ventanaFlotante.document.body.style.overflowX = "hidden";
      ventanaFlotante.document.body.style.background = "#041b2c";

      // Copia los estilos ya cargados para conservar exactamente el diseño.
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((nodo) => {
        ventanaFlotante.document.head.appendChild(nodo.cloneNode(true));
      });

      const destinoPortal = ventanaFlotante.document.createElement("div");
      destinoPortal.id = "herramientas-rapidas-flotantes";
      destinoPortal.style.minHeight = "100vh";
      ventanaFlotante.document.body.appendChild(destinoPortal);
      referenciaVentanaFija.current = ventanaFlotante;
      establecerContenedorFlotante(destinoPortal);
      establecerVentanaFijada(true);

      // Al cerrar el modo flotante, React vuelve a pintar la interfaz normalmente.
      ventanaFlotante.addEventListener("pagehide", () => {
        referenciaVentanaFija.current = null;
        establecerContenedorFlotante(null);
        establecerVentanaFijada(false);
      }, { once: true });
    } catch {
      // Si una política del navegador lo impide, se conserva la ventana normal.
      establecerVentanaFijada(false);
    }
  };

  React.useEffect(() => {
    let fotogramaAnimacion = 0;

    /** Curva suave: comienza y termina despacio para evitar movimientos bruscos. */
    const suavizarMovimiento = (progreso: number) =>
      progreso < 0.5
        ? 4 * progreso * progreso * progreso
        : 1 - Math.pow(-2 * progreso + 2, 3) / 2;

    /**
     * Ajusta la ventana creada por el botón de herramientas según el contenido.
     * Los navegadores móviles pueden ignorar resizeTo; el diseño responsive
     * sigue permitiendo usarla en esos dispositivos.
     */
    const adaptarVentana = (evento: Event) => {
      const herramienta = (evento as CustomEvent<string>).detail;
      establecerHerramientaActiva(herramienta);

      // Una ventana fijada nunca cambia de tamaño ni de posición.
      const esVentanaFija = Boolean(
        referenciaVentanaFija.current && !referenciaVentanaFija.current.closed
      );

      // Chrome no garantiza que una ventana Document Picture-in-Picture admita
      // resizeTo. Conservamos su tamaño completo para evitar paneles cortados.
      if (esVentanaFija) {
        cancelAnimationFrame(fotogramaAnimacion);
        return;
      }

      const tamanios: Record<string, { ancho: number; alto: number }> =
        {
          ninguna: { ancho: 420, alto: 300 },
          fse: { ancho: 440, alto: 520 },
          clima: { ancho: 440, alto: 500 },
          cuadrante: { ancho: 620, alto: 520 },
          comentarios: { ancho: 520, alto: 620 },
          ubicacion: { ancho: 520, alto: 570 },
          alfabeto: { ancho: 500, alto: 560 },
          productividad: { ancho: 460, alto: 620 },
          codigos: { ancho: 520, alto: 620 },
        };
      const tamanio = tamanios[herramienta] ?? tamanios.ninguna;
      const anchoFinal = Math.min(tamanio.ancho, window.screen.availWidth);
      const altoFinal = Math.min(tamanio.alto, window.screen.availHeight);
      const ventanaObjetivo = obtenerGestorFlotante()?.window ?? window;
      const anchoInicial = ventanaObjetivo.outerWidth;
      const altoInicial = ventanaObjetivo.outerHeight;
      const posicionInicialX = ventanaObjetivo.screenX;
      const posicionInicialY = ventanaObjetivo.screenY;
      const inicio = performance.now();
      const duracion = 360;

      cancelAnimationFrame(fotogramaAnimacion);

      const animarVentana = (instante: number) => {
        const progreso = Math.min(1, (instante - inicio) / duracion);
        const avance = suavizarMovimiento(progreso);
        const interpolar = (origen: number, destino: number) =>
          Math.round(origen + (destino - origen) * avance);

        try {
          ventanaObjetivo.resizeTo(
            interpolar(anchoInicial, anchoFinal),
            interpolar(altoInicial, altoFinal),
          );
          ventanaObjetivo.moveTo(posicionInicialX, posicionInicialY);
        } catch {
          // Algunos navegadores conservan un tamaño fijo para Picture-in-Picture.
        }

        if (progreso < 1) fotogramaAnimacion = requestAnimationFrame(animarVentana);
      };

      fotogramaAnimacion = requestAnimationFrame(animarVentana);
    };

    window.addEventListener("herramienta-flotante-abierta", adaptarVentana);
    return () => {
      cancelAnimationFrame(fotogramaAnimacion);
      window.removeEventListener("herramienta-flotante-abierta", adaptarVentana);
    };
  }, []);

  const cerrarVentana = () => {
    if (ventanaFijaExterna && !ventanaFijaExterna.closed) {
      ventanaFijaExterna.close();
      alCerrarVentanaFija?.();
      return;
    }
    window.close();
  };

  const contenido = (
    <main className={`ventana-herramientas ${ventanaFijaExterna || contenedorFlotante ? "ventana-fijada" : ""} ${herramientaActiva !== "ninguna" ? "herramienta-desplegada" : ""}`}>
      <section className="herramientas-popup-presentacion">
        <strong>Selecciona una consulta</strong>
        <p>Esta ventana puede permanecer abierta mientras trabajas en otra aplicación.</p>
      </section>
      {/* <nav className="herramientas-popup-accesos" aria-label="Herramientas disponibles">
        <ConsultaFseRapida />
        <ConsultaClimaRapida />
        <ConsultaCuadranteRapida />
        <ConsultaComentariosRapidos />
        <ConsultaUbicacionRapida />
        <ConsultaAlfabetoFonetico />
        <ConsultaProductividadRapida />
        {esAdministrador && <ConsultaCodigosOperativos />}
      </nav> */}
       <nav className="herramientas-popup-accesos" aria-label="Herramientas disponibles">
        <ConsultaFseRapida />
        <ConsultaClimaRapida />
        <ConsultaCuadranteRapida />
        <ConsultaComentariosRapidos />
        <ConsultaUbicacionRapida />
        <ConsultaAlfabetoFonetico />
        <ConsultaProductividadRapida />
        {esAdministrador && <ConsultaCodigosOperativos />}
      </nav>
      <aside className="herramientas-popup-aviso">
        <strong>Consulta orientativa</strong>
        <p>La asignación de FSE debe confirmarse siempre mediante las fuentes y procedimientos corporativos.</p>
      </aside>
      <footer className="pie-herramientas-rapidas">
        <span>© 2026 Reynaldo Muñoz</span>
        <a href="mailto:reynaldo.munozf21@gmail.com">reynaldo.munozf21@gmail.com</a>
      </footer>
    </main>
  );

  // Un portal mantiene activos los eventos de React dentro de la ventana fijada.
  return contenedorFlotante ? createPortal(contenido, contenedorFlotante) : contenido;
};
