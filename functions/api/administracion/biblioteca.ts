import { ContextoPagina, responderJson } from "../_utilidades";
const imagenes = new Set(["image/png", "image/jpeg", "image/webp"]);
const seguro = (nombre: string) => nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "archivo";
export const onRequest = async (contexto: ContextoPagina) => {
  if (contexto.request.method === "GET") { const r = await contexto.env.CONTENIDO_DB.prepare("SELECT id,titulo,autor,descripcion,portada_clave,pdf_clave,visible FROM biblioteca_libros ORDER BY creado_en DESC").all(); return responderJson({ libros:r.results??[] }); }
  if (contexto.request.method === "DELETE") { const d = await contexto.request.json() as { id?:number; pdf_clave?:string; portada_clave?:string }; if (!Number.isInteger(d.id)) return responderJson({error:"Libro no válido."},400); await contexto.env.CONTENIDO_DB.prepare("DELETE FROM biblioteca_libros WHERE id=?").bind(d.id).run(); await Promise.all([d.pdf_clave,d.portada_clave].filter(Boolean).map((c)=>contexto.env.MEDIA_PRIVADA.delete(c!))); return responderJson({eliminado:true}); }
  if (contexto.request.method !== "POST") return responderJson({error:"Método no permitido."},405);
  const datos = await contexto.request.formData(); const titulo=String(datos.get("titulo")||"").trim().slice(0,120), autor=String(datos.get("autor")||"").trim().slice(0,100), descripcion=String(datos.get("descripcion")||"").trim().slice(0,600); const pdf=datos.get("pdf"), portada=datos.get("portada");
  if (!titulo || !(pdf instanceof File) || pdf.type !== "application/pdf" || pdf.size > 15*1024*1024) return responderJson({error:"Indica un título y un PDF de hasta 15 MB."},400);
  if (portada instanceof File && (!imagenes.has(portada.type) || portada.size > 3*1024*1024)) return responderJson({error:"La portada debe ser PNG, JPG o WebP de hasta 3 MB."},400);
  const base=crypto.randomUUID(); const pdfClave=`libros/${base}.pdf`; const portadaClave=portada instanceof File?`libros/${base}-${seguro(portada.name)}.${portada.type.split("/")[1].replace("jpeg","jpg")}`:"";
  await contexto.env.MEDIA_PRIVADA.put(pdfClave,await pdf.arrayBuffer(),{httpMetadata:{contentType:"application/pdf"}}); if(portada instanceof File) await contexto.env.MEDIA_PRIVADA.put(portadaClave,await portada.arrayBuffer(),{httpMetadata:{contentType:portada.type}});
  await contexto.env.CONTENIDO_DB.prepare("INSERT INTO biblioteca_libros(titulo,autor,descripcion,portada_clave,pdf_clave,visible,actualizado_en) VALUES(?,?,?,?,?,?,unixepoch())").bind(titulo,autor,descripcion,portadaClave,pdfClave,1).run(); return responderJson({guardado:true},201);
};
