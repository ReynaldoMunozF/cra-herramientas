import React from "react";
import { CUADRANTES } from "./constantes";
import { CuadranteMensual } from "./tipos";

export interface CambioCuadrante {
  id_cuadrante: string;
  matricula: string;
  dia: number;
  turno: string;
  actualizado_en: string;
}

const aplicarCambios = (cambios: CambioCuadrante[]): CuadranteMensual[] => {
  const porDia = new Map(
    cambios.map((cambio) => [
      `${cambio.id_cuadrante}|${cambio.matricula}|${cambio.dia}`,
      cambio.turno,
    ])
  );

  return CUADRANTES.map((cuadrante) => ({
    ...cuadrante,
    operadores: cuadrante.operadores.map((operador) => ({
      ...operador,
      dias: operador.dias.map((turno, indice) =>
        porDia.get(`${cuadrante.id}|${operador.matricula}|${indice + 1}`) ?? turno
      ),
    })),
  }));
};

/** Carga las correcciones centrales y las aplica sin modificar los datos extraídos del PDF. */
export const usarCuadrantesActualizados = () => {
  const [cambios, establecerCambios] = React.useState<CambioCuadrante[]>([]);

  const cargar = React.useCallback(() => {
    fetch("/api/cuadrante-cambios", { credentials: "same-origin" })
      .then((respuesta) => respuesta.ok ? respuesta.json() : Promise.reject())
      .then((datos: { cambios?: CambioCuadrante[] }) => establecerCambios(datos.cambios ?? []))
      .catch(() => establecerCambios([]));
  }, []);

  React.useEffect(() => {
    cargar();
    window.addEventListener("cuadrante-manual-actualizado", cargar);
    return () => window.removeEventListener("cuadrante-manual-actualizado", cargar);
  }, [cargar]);

  return React.useMemo(() => aplicarCambios(cambios), [cambios]);
};
