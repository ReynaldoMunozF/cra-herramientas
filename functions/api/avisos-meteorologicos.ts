/** Canal nacional oficial de avisos CAP publicado por AEMET. */
const CANAL_AEMET = "https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAE_wah_RSS.xml";

interface AvisoMeteorologico {
  id: string;
  nivel: "rojo" | "naranja" | "amarillo" | "desconocido";
  fenomeno: string;
  zona: string;
  descripcion: string;
  enlace: string;
  esViento: boolean;
  rachas: string | null;
}

const responder = (datos: unknown, estado = 200) => new Response(JSON.stringify(datos), {
  status: estado,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=180, s-maxage=300, stale-while-revalidate=300",
  },
});

/** Convierte entidades XML habituales sin depender del DOM del navegador. */
const limpiarXml = (valor = "") => valor
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
  .replace(/<[^>]+>/g, "").trim();

const extraerEtiqueta = (xml: string, etiqueta: string) => {
  const coincidencia = xml.match(new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${etiqueta}>`, "i"));
  return limpiarXml(coincidencia?.[1]);
};

const interpretarTitulo = (titulo: string) => {
  const partes = titulo.split(".").map((parte) => parte.trim()).filter(Boolean);
  const nivelTexto = partes.find((parte) => /^Nivel /i.test(parte))?.replace(/^Nivel /i, "").toLowerCase();
  const nivel = (["rojo", "naranja", "amarillo"].includes(nivelTexto || "") ? nivelTexto : "desconocido") as AvisoMeteorologico["nivel"];
  return { nivel, fenomeno: partes[2] || "Fenómeno adverso", zona: partes.slice(3).join(". ") || "España" };
};

export const onRequestGet = async () => {
  try {
    const respuesta = await fetch(CANAL_AEMET, { headers: { Accept: "application/rss+xml, application/xml;q=0.9" } });
    if (!respuesta.ok) throw new Error(`AEMET respondió ${respuesta.status}`);
    const xml = await respuesta.text();
    const bloques = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

    const avisosBasicos: AvisoMeteorologico[] = bloques.map((bloque, indice) => {
      const titulo = extraerEtiqueta(bloque, "title");
      const datosTitulo = interpretarTitulo(titulo);
      const descripcion = extraerEtiqueta(bloque, "description");
      const esViento = /viento|racha/i.test(`${datosTitulo.fenomeno} ${descripcion}`);
      return {
        id: extraerEtiqueta(bloque, "guid") || `aviso-${indice}`,
        ...datosTitulo,
        descripcion,
        enlace: extraerEtiqueta(bloque, "link"),
        esViento,
        rachas: null,
      };
    });

    // El detalle CAP de los avisos de viento incluye el umbral concreto.
    const avisos = await Promise.all(avisosBasicos.map(async (aviso) => {
      if (!aviso.esViento || !aviso.enlace) return aviso;
      try {
        const respuestaCap = await fetch(aviso.enlace, { headers: { Accept: "application/xml" } });
        if (!respuestaCap.ok) return aviso;
        const cap = await respuestaCap.text();
        const bloqueEspanol = cap.match(/<info>[\s\S]*?<language>es-ES<\/language>[\s\S]*?<\/info>/i)?.[0] || cap;
        const descripcionViento = extraerEtiqueta(bloqueEspanol, "description");
        const rachas = descripcionViento.match(/Rachas? m[aá]ximas?\s*:\s*([\d.,]+\s*km\/h)/i)?.[1] || null;
        return { ...aviso, descripcion: descripcionViento || aviso.descripcion, rachas };
      } catch { return aviso; }
    }));

    return responder({
      fuente: "AEMET",
      actualizadoEn: extraerEtiqueta(xml, "lastBuildDate") || new Date().toISOString(),
      avisos,
    });
  } catch (error) {
    return responder({ error: "No se pudieron consultar los avisos oficiales de AEMET.", detalle: error instanceof Error ? error.message : "Error desconocido" }, 502);
  }
};
