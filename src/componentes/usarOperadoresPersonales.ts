import React from "react";

interface OperadorBase { matricula: string; }

/** Oculta a invitados las matrículas que ya disponen de acceso personal. */
export const usarOperadoresPersonales = <T extends OperadorBase>(todos: T[]) => {
  const [rol, establecerRol] = React.useState("invitado");
  const [matriculaPropia, establecerMatriculaPropia] = React.useState<string | null>(null);
  const [ocultas, establecerOcultas] = React.useState<string[]>([]);
  const [cargandoSesion, establecerCargandoSesion] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/operadores-disponibles", { credentials: "same-origin", cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((datos: { ocultas?: string[]; matriculaPropia?: string | null }) => {
        establecerOcultas(datos.ocultas ?? []);
        if (datos.matriculaPropia) establecerMatriculaPropia(datos.matriculaPropia);
      })
      .catch(() => establecerOcultas([]));
    fetch("/api/sesion", { credentials: "same-origin", cache: "no-store" })
      .then((respuesta) => respuesta.json())
      .then((datos: { rol?: string; matricula?: string }) => {
        establecerRol(datos.rol ?? "invitado");
        if (datos.rol === "operador" && datos.matricula) establecerMatriculaPropia(datos.matricula);
      })
      .catch(() => undefined)
      .finally(() => establecerCargandoSesion(false));
  }, []);

  const operadores = React.useMemo(() => {
    if (rol === "operador" && matriculaPropia) return todos.filter((operador) => operador.matricula === matriculaPropia);
    if (rol === "invitado") return todos.filter((operador) => !ocultas.includes(operador.matricula));
    return todos;
  }, [todos, rol, matriculaPropia, ocultas]);
  return { operadores, rol, matriculaPropia, cargandoSesion };
};
