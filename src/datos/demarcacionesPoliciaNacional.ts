/**
 * Municipios incluidos en la relación documental aportada de demarcaciones de
 * Policía Nacional. Se guardan por provincia para evitar falsos positivos con
 * poblaciones homónimas y se añaden variantes oficiales habituales.
 */
const municipiosPorProvincia: Record<string, string[]> = {
  "Almería": ["Almería", "El Ejido"],
  "Cádiz": ["Cádiz", "Algeciras", "Jerez de la Frontera", "La Línea de la Concepción", "El Puerto de Santa María", "Puerto de Santa María", "San Fernando", "Sanlúcar de Barrameda", "Puerto Real", "Rota"],
  "Córdoba": ["Córdoba", "Lucena", "Cabra"],
  "Granada": ["Granada", "Motril", "Baza"],
  "Huelva": ["Huelva"],
  "Jaén": ["Jaén", "Andújar", "Linares", "Úbeda"],
  "Málaga": ["Málaga", "Antequera", "Fuengirola", "Marbella", "Estepona", "Ronda", "Torremolinos", "Benalmádena", "Vélez-Málaga"],
  "Sevilla": ["Sevilla", "Alcalá de Guadaíra", "Dos Hermanas", "Écija", "San Juan de Aznalfarache", "Camas", "Coria del Río"],
  "Madrid": ["Madrid", "Alcalá de Henares", "Alcobendas", "San Sebastián de los Reyes", "Alcorcón", "Coslada", "San Fernando de Henares", "Fuenlabrada", "Getafe", "Leganés", "Móstoles", "Parla", "Pozuelo de Alarcón", "Torrejón de Ardoz", "Aranjuez"],
  "Alicante": ["Alicante", "Alacant", "Alcoy", "Alcoi", "Benidorm", "Dénia", "Denia", "Elche", "Elx", "Elda", "Petrer", "Orihuela", "Torrevieja"],
  "Castellón": ["Castellón de la Plana", "Castelló de la Plana", "Castellón", "Castelló", "Villarreal", "Vila-real"],
  "Valencia": ["Valencia", "València", "Alzira", "Algemesí", "Gandía", "Gandia", "Mislata", "Ontinyent", "Paterna", "Quart de Poblet", "Sagunto", "Sagunt", "Torrent", "Xàtiva", "Xirivella", "Burjassot"],
  "Las Palmas": ["Las Palmas de Gran Canaria", "Arrecife", "Puerto del Rosario", "San Bartolomé de Tirajana", "Maspalomas", "Telde"],
  "Santa Cruz de Tenerife": ["Santa Cruz de Tenerife", "San Cristóbal de La Laguna", "La Laguna", "Puerto de la Cruz", "Los Realejos", "Adeje", "Arona"],
  "Zaragoza": ["Zaragoza", "Calatayud"],
  "Huesca": ["Huesca", "Jaca", "Canfranc"],
  "Teruel": ["Teruel"],
  "Asturias": ["Oviedo", "Gijón", "Avilés", "Langreo", "Mieres", "Siero", "Pola de Siero", "Lugones"],
  "Valladolid": ["Valladolid", "Medina del Campo"],
  "Burgos": ["Burgos", "Aranda de Duero", "Miranda de Ebro"],
  "Salamanca": ["Salamanca", "Béjar"],
  "León": ["León", "Ponferrada"],
  "Zamora": ["Zamora"],
  "Palencia": ["Palencia"],
  "Ávila": ["Ávila"],
  "Segovia": ["Segovia"],
  "Soria": ["Soria"],
  "Albacete": ["Albacete", "Hellín"],
  "Ciudad Real": ["Ciudad Real", "Puertollano", "Valdepeñas", "Alcázar de San Juan"],
  "Cuenca": ["Cuenca"],
  "Guadalajara": ["Guadalajara"],
  "Toledo": ["Toledo", "Talavera de la Reina"],
  "A Coruña": ["A Coruña", "Coruña", "Santiago de Compostela", "Ferrol", "Narón", "Ribeira"],
  "Lugo": ["Lugo", "Monforte de Lemos", "Viveiro"],
  "Ourense": ["Ourense", "Verín"],
  "Pontevedra": ["Pontevedra", "Vigo", "Marín", "Salvaterra de Miño", "Salvatierra de Miño", "Tui", "Vilagarcía de Arousa"],
  "Murcia": ["Murcia", "Cartagena", "Lorca", "Molina de Segura", "Yecla", "Alcantarilla"],
  "Cáceres": ["Cáceres", "Plasencia"],
  "Badajoz": ["Badajoz", "Mérida", "Don Benito", "Villanueva de la Serena", "Almendralejo"],
  "Illes Balears": ["Palma", "Palma de Mallorca", "Ibiza", "Eivissa", "Mahón", "Maó", "Ciutadella de Menorca", "Ciudadela", "Manacor"],
};

const normalizarDemarcacion = (texto = "") => texto
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toLowerCase();

/**
 * El catálogo postal puede devolver nombres bilingües (Elx/Elche) o artículos
 * pospuestos (Puerto de Santa María, El). Se generan todas esas variantes para
 * que la coincidencia siga siendo exacta y no dependa del formato del proveedor.
 */
const variantesNombre = (texto: string) => {
  const partesBilingues = texto.split("/").map((parte) => parte.trim()).filter(Boolean);
  const variantes = new Set([normalizarDemarcacion(texto)]);
  partesBilingues.forEach((parte) => {
    variantes.add(normalizarDemarcacion(parte));
    const [nombre, articulo] = parte.split(",").map((fragmento) => fragmento.trim());
    if (nombre && articulo) variantes.add(normalizarDemarcacion(`${articulo} ${nombre}`));
  });
  return [...variantes];
};

const clavesPoliciaNacional = new Set(
  Object.entries(municipiosPorProvincia).flatMap(([provincia, municipios]) =>
    municipios.flatMap((municipio) => variantesNombre(municipio).map(
      (variante) => `${variante}|${normalizarDemarcacion(provincia)}`,
    )),
  ),
);

/** Indica si el municipio aparece en la relación documental incorporada. */
export const esMunicipioPoliciaNacionalDocumentado = (municipio: string, provincia: string) =>
  variantesNombre(municipio).some((variante) =>
    clavesPoliciaNacional.has(`${variante}|${normalizarDemarcacion(provincia)}`),
  );
