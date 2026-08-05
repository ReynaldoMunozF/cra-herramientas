import { PasoFlujo } from "./configuracionOperativas";

/** Contenido completo que puede modificarse y versionarse desde administración. */
export interface ContenidoProcesoEditable {
  flujo: Record<string, PasoFlujo>;
  comentarios: string[];
}

export interface VersionManualResumen {
  id: number;
  version: number;
  estado: "borrador" | "publicada" | "archivada";
  creado_en: string;
  publicado_en?: string | null;
}

export interface RespuestaAdministracionManual {
  borrador: ContenidoProcesoEditable | null;
  publicado: ContenidoProcesoEditable | null;
  versiones: VersionManualResumen[];
}

/** Comprueba la estructura mínima antes de usar datos procedentes de la API. */
export const esContenidoProcesoValido = (valor: unknown): valor is ContenidoProcesoEditable => {
  if (!valor || typeof valor !== "object") return false;
  const contenido = valor as ContenidoProcesoEditable;
  return Boolean(
    contenido.flujo && typeof contenido.flujo === "object"
    && contenido.flujo.mode
    && Array.isArray(contenido.comentarios),
  );
};
