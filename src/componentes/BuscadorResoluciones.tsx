import React from "react";

interface Resolucion {
  codigo: string;
  descripcion: string;
}

/** Resoluciones recogidas de la tabla "Resoluciones y comandos" del manual. */
export const RESOLUCIONES: Resolucion[] = [
  { codigo: "1AA", descripcion: "Robo o intrusión real confirmada" },
  { codigo: "1AAN", descripcion: "Robo o intrusión no confirmada" },
  { codigo: "1AB", descripcion: "Atraco real" },
  { codigo: "1AC", descripcion: "Coacción real" },
  { codigo: "1AD", descripcion: "Emergencia médica real" },
  { codigo: "1AE", descripcion: "Fuego real" },
  { codigo: "1AF", descripcion: "Ocupación real" },
  { codigo: "1AL", descripcion: "Alerta especial real" },
  { codigo: "1II", descripcion: "Tentativa de robo o daños confirmada" },
  { codigo: "1IIN", descripcion: "Tentativa de robo o daños no confirmada" },
  { codigo: "1IPC", descripcion: "Intrusión pendiente de confirmación" },
  { codigo: "1RAP", descripcion: "Incidencia real por altercado público" },
  { codigo: "1SI", descripcion: "Incidencia real sin señales" },
  { codigo: "2_A", descripcion: "Desconexión por usuario" },
  { codigo: "2FA", descripcion: "Descuido personal no autorizado" },
  { codigo: "2FB", descripcion: "Animales domésticos" },
  { codigo: "2FC", descripcion: "Animales no domésticos" },
  { codigo: "2FD", descripcion: "Movimiento de objetos o plantas" },
  { codigo: "2FE", descripcion: "Ventanas o puertas abiertas" },
  { codigo: "2FF", descripcion: "Mal uso del sistema" },
  { codigo: "2FL", descripcion: "Posible fallo del sistema" },
  { codigo: "2FQ", descripcion: "Señal reiterativa ya operada" },
  { codigo: "2FS", descripcion: "Alertas especiales" },
  { codigo: "2PB", descripcion: "No localizamos contactos" },
  { codigo: "2PD", descripcion: "Confirmada con motivo desconocido" },
  { codigo: "2PG", descripcion: "No confirmada; contacto informado" },
  { codigo: "2PH", descripcion: "Inspección perimetral SII correcta" },
  { codigo: "2PI", descripcion: "Inspección interior SII correcta" },
  { codigo: "2PJ", descripcion: "Prueba del técnico" },
  { codigo: "2PK", descripcion: "Prueba del cliente" },
  { codigo: "2PLA", descripcion: "Inspección SII de alarma exterior" },
  { codigo: "2PM", descripcion: "Operativa especial" },
  { codigo: "2SP", descripcion: "Inspección de Seguridad Privada" },
  { codigo: "C", descripcion: "Desconexión de usuario por SMS" },
  { codigo: "CAM", descripcion: "Vídeo no confirmado y sin novedad" },
  { codigo: "OC1", descripcion: "Movimiento de objetos o plantas por SMS" },
  { codigo: "OC2", descripcion: "Animales domésticos por SMS" },
  { codigo: "ODH", descripcion: "Evento Ojo de Halcón" },
  { codigo: "CAN", descripcion: "SMS en cancelada" },
  { codigo: "OC1", descripcion: "Alarma por vegetación" },
  { codigo: "OC2", descripcion: "Alarma por animales" },
  { codigo: "OC3", descripcion: "Alarma por objeto" },
];

const normalizar = (texto: string) => texto.toLocaleLowerCase("es")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Consulta rápida de resoluciones visible únicamente en la portada administrativa. */
export const BuscadorResoluciones: React.FC = () => {
  const [consulta, establecerConsulta] = React.useState("");
  const texto = normalizar(consulta);
  const resultados = texto
    ? RESOLUCIONES.filter((resolucion) => normalizar(`${resolucion.codigo} ${resolucion.descripcion}`).includes(texto))
    : [];

  return <section className="buscador-resoluciones" aria-labelledby="titulo-buscador-resoluciones">
    <header><span>Herramienta administrativa</span><h2 id="titulo-buscador-resoluciones">Buscador de resoluciones</h2><p>Busca por código o escribe una palabra de la situación que necesitas resolver.</p></header>
    <label className="buscador-resoluciones-campo">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input value={consulta} onChange={(evento) => establecerConsulta(evento.target.value)} placeholder="Ejemplo: descuido, real, técnico, animales…" autoComplete="off" />
      {consulta && <button type="button" onClick={() => establecerConsulta("")} aria-label="Limpiar búsqueda">×</button>}
    </label>
    {!texto && <p className="buscador-resoluciones-ayuda">Escribe al menos una letra para comenzar la búsqueda.</p>}
    {texto && <p className="buscador-resoluciones-contador">{resultados.length} {resultados.length === 1 ? "resolución encontrada" : "resoluciones encontradas"}</p>}
    {texto && resultados.length > 0 && <div className="buscador-resoluciones-resultados">{resultados.map((resolucion, indice) => <article key={`${resolucion.codigo}-${indice}`}><strong>{resolucion.codigo}</strong><span>{resolucion.descripcion}</span></article>)}</div>}
    {texto && !resultados.length && <p className="buscador-resoluciones-vacio">No hay resoluciones que contengan “{consulta}”. Prueba con una palabra más corta.</p>}
  </section>;
};
