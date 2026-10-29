import { ContextoPagina } from "../api/_utilidades";
import { onRequestGet as listarTelefonos } from "../api/telefonos-interes";
import { onRequestGet as listarEnlaces } from "../api/enlaces-portada";
import { buscarInteresTeo, enlaceInteresSeguro, TelefonoInteresTeo, EnlaceInteresTeo, InteresTeo } from "../../src/servicios/interesTeo";

export const consultarInteresTeo = async (contexto: ContextoPagina, texto: string): Promise<InteresTeo> => {
  const resultados = await Promise.allSettled([
    listarTelefonos(contexto).then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<{ telefonos: TelefonoInteresTeo[] }>; }),
    listarEnlaces(contexto).then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<{ enlaces: EnlaceInteresTeo[] }>; }),
  ]);
  const telefonos = resultados[0].status === "fulfilled" ? buscarInteresTeo(resultados[0].value.telefonos, texto) : [];
  const enlaces = resultados[1].status === "fulfilled" ? buscarInteresTeo(resultados[1].value.enlaces, texto).filter(e => enlaceInteresSeguro(e.url)) : [];
  return {
    telefonos: telefonos.slice(0,5), totalTelefonos: telefonos.length,
    enlaces: enlaces.slice(0,5), totalEnlaces: enlaces.length,
    avisosInteres: resultados.flatMap((r, i) => r.status === "rejected" ? [i === 0 ? "No he podido consultar los teléfonos de interés." : "No he podido consultar los enlaces de interés."] : []),
  };
};
