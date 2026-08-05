import React from "react";
import { Link, useParams } from "react-router-dom";

export const PaginaDetalle: React.FC = () => {
  // useParams lee el valor dinámico :id incluido en la URL.
  const { id: identificador } = useParams();

  return (
    <>
      {/* Esta pantalla pertenece al ejercicio original y muestra el ID recibido. */}
      <h2>Hello from Detail page</h2>
      <h3>User Id: {identificador}</h3>

      {/* Link navega sin provocar una recarga completa del navegador. */}
      <Link to="/list">Back to list page</Link>
    </>
  );
};
