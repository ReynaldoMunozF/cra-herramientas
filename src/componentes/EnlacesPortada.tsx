import React from "react";

interface EnlacePortada { id: number; nombre: string; url: string; color_fondo: string; color_texto: string; }

/** Barra de accesos configurada por el administrador. */
export const EnlacesPortada: React.FC = () => {
  const [enlaces, establecerEnlaces] = React.useState<EnlacePortada[]>([]);
  React.useEffect(() => {
    fetch("/api/enlaces-portada", { credentials: "same-origin", cache: "no-store" })
      .then((respuesta) => respuesta.ok ? respuesta.json() : null)
      .then((datos: { enlaces?: EnlacePortada[] } | null) => establecerEnlaces(datos?.enlaces ?? []))
      .catch(() => establecerEnlaces([]));
  }, []);
  if (!enlaces.length) return null;
  return <nav className="enlaces-portada" aria-label="Enlaces de interés">
    <header><span>ENLACES DE INTERÉS</span></header>
    <div>{enlaces.map((enlace) => <a key={enlace.id} href={enlace.url} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: enlace.color_fondo, color: enlace.color_texto }}><span aria-hidden="true">↗</span>{enlace.nombre}</a>)}</div>
  </nav>;
};
