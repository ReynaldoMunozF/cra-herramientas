import React from "react";

/** Iconos coherentes y legibles para los accesos de la cabecera. */
export const IconoAccesoCabecera: React.FC<{ tipo: "herramientas" | "flotante" | "pestana" | "flecha" }> = ({ tipo }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {tipo === "herramientas" && <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M4 8h16M8 3.5V8M8 12h3M8 16h7" /><circle cx="6.5" cy="5.8" r=".25" /></>}
    {tipo === "flotante" && <path d="m13.5 2-9 12h6l-1 8 10-13h-6l0-7Z" fill="currentColor" strokeWidth="1.1" />}
    {tipo === "pestana" && <><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5M14 4h6v6M20 4 10 14" /></>}
    {tipo === "flecha" && <path d="M7 17 17 7M7 7h10v10" />}
  </svg>
);
