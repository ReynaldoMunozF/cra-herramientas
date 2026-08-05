import React from "react";
import { createRoot } from "react-dom/client";
import { Aplicacion } from "./aplicacion";

// Recuperamos el elemento <div id="root"> definido en plantilla.html.
// React utilizará este nodo como punto de entrada para toda la aplicación.
const contenedorRaiz = document.getElementById("root");

// createRoot activa el sistema de renderizado de React 18.
const raizReact = createRoot(contenedorRaiz);

// Renderizamos el componente principal, que contiene las rutas de la aplicación.
raizReact.render(<Aplicacion />);
