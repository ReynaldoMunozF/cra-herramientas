import React from "react";

/** Reloj global actualizado cada segundo y configurado para la hora de España. */
export const RelojGlobal: React.FC = () => {
  const [instante, establecerInstante] = React.useState(() => new Date());

  React.useEffect(() => {
    const intervalo = window.setInterval(() => establecerInstante(new Date()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  const fecha = new Intl.DateTimeFormat("es-ES", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Madrid",
  }).format(instante);

  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Europe/Madrid",
  }).format(instante);

  return (
    <aside className="reloj-global" aria-label="Fecha y hora actual en España">
      <span className="reloj-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>
      </span>
      <span className="reloj-texto">
        <time className="reloj-hora" dateTime={instante.toISOString()}>{hora}</time>
        <span className="reloj-fecha">{fecha}</span>
      </span>
    </aside>
  );
};
