import React from "react";
import { Link } from "react-router-dom";
import { RESOLUCIONES } from "../componentes/BuscadorResoluciones";

interface CodigoOperativo { codigo: string; descripcion: string; }
type Categoria = "resoluciones" | "sms";

export const MENSAJES_SMS: CodigoOperativo[] = [
  { codigo:"0ACUPN", descripcion:"No contactos: envío de acuda y FSE" },
  { codigo:"0ANTM", descripcion:"Antimasking" }, { codigo:"0APE", descripcion:"Supervisión de apertura" },
  { codigo:"0ATEC", descripcion:"Alarma técnica" }, { codigo:"0BBAT", descripcion:"Batería baja" },
  { codigo:"0BAGO", descripcion:"Batería agotada" }, { codigo:"0BAJA", descripcion:"Devolución de llave al acuda" },
  { codigo:"0CIE", descripcion:"Supervisión de cierre" }, { codigo:"0CLAVE", descripcion:"Envío de palabra clave al cliente" },
  { codigo:"0EMAIL", descripcion:"Email con evento" }, { codigo:"0ETH", descripcion:"Ethernet desconectado" },
  { codigo:"0EVEN", descripcion:"Envío de evento con hora y fecha" }, { codigo:"0FADSL", descripcion:"Fallo ADSL" },
  { codigo:"0FAPE", descripcion:"Supervisión de falta de apertura" }, { codigo:"0FCIE", descripcion:"Supervisión de falta de cierre" },
  { codigo:"0FGSM", descripcion:"Fallo de cobertura GSM/GPRS" }, { codigo:"0FLINE", descripcion:"Fallo de línea" },
  { codigo:"0FLSEG", descripcion:"Fallo de línea segura" }, { codigo:"0FLUZ", descripcion:"Fallo de luz" },
  { codigo:"0FTEST", descripcion:"Falta de test" }, { codigo:"0GATOP", descripcion:"Animal detectado por imagen en operativa exterior" },
  { codigo:"0VEGOP", descripcion:"Movimiento de vegetación en operativa exterior" }, { codigo:"0OBJOP", descripcion:"Movimiento de objeto en operativa exterior" },
  { codigo:"0PAMOP", descripcion:"Información de eventos PAM en operativa exterior" }, { codigo:"0PSCOP", descripcion:"Información de eventos PASC en operativa exterior" },
  { codigo:"0GOCAN", descripcion:"Prosegur ContiGO cancelado" }, { codigo:"0GOCON", descripcion:"No contacta en cuenta atrás" },
  { codigo:"0GONC", descripcion:"Prosegur ContiGO: no contacto" }, { codigo:"0GOUSU", descripcion:"No contacta el usuario en cuenta atrás" },
  { codigo:"MICRO", descripcion:"Activar micrófono PAM" }, { codigo:"0INAU", descripcion:"Anulación de zona por conexión bidireccional" },
  { codigo:"0INCO", descripcion:"Introducción de código erróneo" }, { codigo:"0INTRE", descripcion:"Interferencias del receptor VR" },
  { codigo:"0NC", descripcion:"No contactos en alarma" }, { codigo:"0NCACU", descripcion:"No contactos: se envía acuda" },
  { codigo:"0NCBO", descripcion:"No se localizan contactos: bomberos" }, { codigo:"0NCFSE", descripcion:"No se localizan contactos: se envían FSE" },
  { codigo:"0NCGAT", descripcion:"No contactos y en cámara se ve un gato" }, { codigo:"0NCOBJ", descripcion:"No contactos y en cámara se ve un objeto" },
  { codigo:"0NCPER", descripcion:"No contactos y en cámara se ve un perro" }, { codigo:"0NCROP", descripcion:"No contactos y en cámara se ve ropa tendida" },
  { codigo:"0NCTOL", descripcion:"No contactos y en cámara se ve un toldo" }, { codigo:"0NCV", descripcion:"No contactos y cámara sin novedad" },
  { codigo:"0NCVEG", descripcion:"No contactos y vegetación en movimiento" }, { codigo:"0VIDOK", descripcion:"Mensaje de vídeo correcto" },
  { codigo:"999ACU", descripcion:"Mensaje para acudas" }, { codigo:"999CAN", descripcion:"Cancelación para acudas" },
  { codigo:"0REP", descripcion:"Protocolo de señales repetitivas" }, { codigo:"0RFLUZ", descripcion:"Restauración de fallo de luz" },
  { codigo:"0SABC", descripcion:"Sabotaje de central" }, { codigo:"0SABO", descripcion:"Sabotaje con apertura" },
  { codigo:"0SABR", descripcion:"Sabotaje con apertura restaurada" }, { codigo:"HIPER", descripcion:"SMS a JS por cliente hiperactivo" },
  { codigo:"OCASO", descripcion:"SMS a JS por cliente hiperactivo" }, { codigo:"ROBO", descripcion:"SMS a JS por incidencia real" },
  { codigo:"MGFA", descripcion:"Mensaje a gestores por falsas alarmas" }, { codigo:"TECNI", descripcion:"Mensaje a técnicos" },
  { codigo:"0INFC", descripcion:"Contacto informado de alarma" },
];

const normalizar = (texto: string) => texto.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const Buscador: React.FC<{ datos: CodigoOperativo[]; categoria: Categoria }> = ({ datos, categoria }) => {
  const [consulta, setConsulta] = React.useState("");
  const termino = normalizar(consulta);
  const resultados = termino ? datos.filter((item) => normalizar(`${item.codigo} ${item.descripcion}`).includes(termino)) : [];
  return <>
    <label className="centro-codigos-busqueda"><span>⌕</span><input autoFocus value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder={categoria === "sms" ? "Ejemplo: falta de cierre, no contactos, batería…" : "Ejemplo: descuido, real, técnico, animales…"} />{consulta && <button type="button" onClick={() => setConsulta("")}>×</button>}</label>
    {!termino && <p className="centro-codigos-ayuda">Introduce un código o una palabra para mostrar coincidencias.</p>}
    {termino && <p className="centro-codigos-contador">{resultados.length} resultados</p>}
    {termino && resultados.length > 0 && <div className="centro-codigos-resultados">{resultados.map((item, indice) => <article key={`${item.codigo}-${indice}`}><strong>{item.codigo}</strong><span>{item.descripcion}</span></article>)}</div>}
    {termino && !resultados.length && <p className="centro-codigos-vacio">No se encontraron coincidencias. Prueba con una palabra más corta.</p>}
  </>;
};

export const PaginaCodigosOperativos: React.FC = () => {
  const [categoria, setCategoria] = React.useState<Categoria | null>(null);
  return <main className={`centro-codigos ${categoria ? "categoria-abierta" : ""}`}>
    <header><div><span>CRA · Consulta administrativa</span><h1>Resoluciones y mensajes</h1><p>Encuentra rápidamente el código que necesitas para cerrar o comunicar una gestión.</p></div><Link to="/">×</Link></header>
    {!categoria ? <section className="centro-codigos-categorias">
      <button type="button" onClick={() => setCategoria("resoluciones")}><i>AC</i><span><small>Cierre de gestión</small><strong>Resoluciones</strong><em>Busca por código, situación o resultado.</em></span><b>→</b></button>
      <button type="button" onClick={() => setCategoria("sms")}><i>SMS</i><span><small>Mensajes predefinidos</small><strong>Comandos SMS</strong><em>Localiza plantillas para informar al cliente.</em></span><b>→</b></button>
    </section> : <section className="centro-codigos-contenido">
      <div className="centro-codigos-titulo"><button type="button" onClick={() => setCategoria(null)}>← Cambiar categoría</button><div><small>{categoria === "sms" ? "Mensajes predefinidos" : "Cierre de gestión"}</small><h2>{categoria === "sms" ? "Comandos SMS" : "Resoluciones"}</h2></div></div>
      <Buscador datos={categoria === "sms" ? MENSAJES_SMS : RESOLUCIONES} categoria={categoria} />
    </section>}
  </main>;
};
