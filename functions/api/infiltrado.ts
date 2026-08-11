import { ContextoPagina, responderJson } from "./_utilidades";

type Estado = "espera" | "pistas" | "votacion" | "finalizada" | "abandonada";
interface Sala { id:string; codigo:string; anfitrion:string; estado:Estado; palabra:string|null; tematica:string|null; infiltrado:string|null; ronda:number; creada_en:number; actualizada_en:number; }
interface Jugador { matricula:string; pista:string|null; voto:string|null; unido_en:number; }

const PALABRAS_POR_TEMATICA:Record<string,string[]> = {
  "Lugares y viajes":["CASTILLO","DESIERTO","HOSPITAL","ESCUELA","ESTADIO","MUSEO","TEATRO","BOSQUE"],
  "Aventuras y fantasía":["PIRATA","TESORO","DRAGON","FANTASMA","VOLCAN","PLANETA","COHETE","MAGIA"],
  "Transportes":["AVION","TREN","BARCO","COCHE","METRO","MOTO","CAMION","BICICLETA"],
  "Comida":["HELADO","PAELLA","TORTILLA","PIZZA","QUESO","CHOCOLATE","HAMBURGUESA","ARROZ"],
  "Animales":["TIBURON","PINGUINO","CABALLO","ELEFANTE","TIGRE","DELFIN","JIRAFA","CANGURO"],
  "Tecnología y CRA":["ALARMA","SIRENA","ORDENADOR","TELEFONO","CAMARA","SENSOR","PANEL","RADIO"],
};
const TEMATICAS=Object.keys(PALABRAS_POR_TEMATICA);
const normalizarMatricula = (valor:unknown) => { const m=typeof valor==="string"?valor.trim().toUpperCase():""; return /^[A-Z0-9]{2,8}$/.test(m)?m:null; };
const normalizarCodigo = (valor:unknown) => { const c=typeof valor==="string"?valor.trim().toUpperCase().replace(/^INF-/,""):""; return /^[A-Z2-9]{4}$/.test(c)?c:null; };
const aleatorio = (max:number) => { const n=new Uint32Array(1); crypto.getRandomValues(n); return n[0]%max; };
const crearCodigo = () => Array.from({length:4},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[aleatorio(32)]).join("");
const obtenerSala = (db:ContextoPagina["env"]["CONTENIDO_DB"], codigo:string) => db.prepare("SELECT * FROM salas_infiltrado WHERE codigo=?").bind(codigo).first<Sala>();
const obtenerJugadores = async (db:ContextoPagina["env"]["CONTENIDO_DB"], id:string) => (await db.prepare("SELECT matricula,pista,voto,unido_en FROM jugadores_infiltrado WHERE sala_id=? ORDER BY unido_en").bind(id).all<Jugador>()).results ?? [];

const presentar = async (db:ContextoPagina["env"]["CONTENIDO_DB"], sala:Sala, matricula:string) => {
  const jugadores=await obtenerJugadores(db,sala.id);
  if(!jugadores.some(j=>j.matricula===matricula)) return null;
  const finalizada=sala.estado==="finalizada";
  const votos=finalizada ? jugadores.reduce<Record<string,number>>((a,j)=>{if(j.voto&&j.voto!=="PASAR")a[j.voto]=(a[j.voto]??0)+1;return a;},{}) : {};
  const maximo=finalizada?Math.max(0,...Object.values(votos)):0;
  const masVotados=finalizada&&maximo>0?Object.keys(votos).filter(m=>votos[m]===maximo):[];
  const acusado=masVotados.length===1?masVotados[0]:null;
  return {
    codigo:`INF-${sala.codigo}`, estado:sala.estado, anfitrion:sala.anfitrion, ronda:sala.ronda,
    soyAnfitrion:sala.anfitrion===matricula,
    rol:sala.estado==="espera"?null:sala.infiltrado===matricula?"infiltrado":"equipo",
    palabra:sala.estado!=="espera"&&sala.infiltrado!==matricula?sala.palabra:null, tematica:sala.estado!=="espera"?sala.tematica:null,
    jugadores:jugadores.map(j=>({matricula:j.matricula,pista:sala.estado==="votacion"||finalizada?j.pista:null,haDadoPista:Boolean(j.pista),haVotado:Boolean(j.voto),votos:finalizada?votos[j.matricula]??0:undefined})),
    miPista:jugadores.find(j=>j.matricula===matricula)?.pista??null,
    miVoto:jugadores.find(j=>j.matricula===matricula)?.voto??null,
    infiltrado:finalizada?sala.infiltrado:null, acusado, empate:finalizada&&masVotados.length>1,
    pases:finalizada?jugadores.filter(j=>j.voto==="PASAR").length:0,
  };
};

export const onRequest = async (contexto:ContextoPagina) => {
  const db=contexto.env.CONTENIDO_DB;
  await db.prepare("UPDATE salas_infiltrado SET estado='abandonada',actualizada_en=unixepoch() WHERE estado<>'finalizada' AND estado<>'abandonada' AND actualizada_en<unixepoch()-7200").run();
  const metodo=contexto.request.method.toUpperCase();
  if(metodo==="GET"){
    const url=new URL(contexto.request.url); const codigo=normalizarCodigo(url.searchParams.get("codigo")); const matricula=normalizarMatricula(url.searchParams.get("matricula"));
    if(codigo&&matricula){const sala=await obtenerSala(db,codigo); const datos=sala&&await presentar(db,sala,matricula); return datos?responderJson({sala:datos}):responderJson({error:"La sala no existe o no perteneces a ella."},404);}
    const pendientes=await db.prepare("SELECT codigo,anfitrion,creada_en FROM salas_infiltrado WHERE estado='espera' ORDER BY creada_en DESC LIMIT 20").all();
    return responderJson({pendientes:pendientes.results??[]});
  }
  if(metodo!=="POST") return responderJson({error:"Método no permitido."},405);
  let datos:Record<string,unknown>; try{datos=await contexto.request.json();}catch{return responderJson({error:"Datos no válidos."},400);}
  const accion=typeof datos.accion==="string"?datos.accion:""; const matricula=normalizarMatricula(datos.matricula);
  if(!matricula)return responderJson({error:"Matrícula no válida."},400);

  if(accion==="crear"){
    for(let i=0;i<8;i+=1){const codigo=crearCodigo(); const id=crypto.randomUUID(); try{await db.batch([
      db.prepare("INSERT INTO salas_infiltrado(id,codigo,anfitrion,estado,creada_en,actualizada_en) VALUES(?,?,?,'espera',unixepoch(),unixepoch())").bind(id,codigo,matricula),
      db.prepare("INSERT INTO jugadores_infiltrado(sala_id,matricula,unido_en) VALUES(?,?,unixepoch())").bind(id,matricula),
    ]); return responderJson({codigo:`INF-${codigo}`});}catch{/* intenta otro código */}}
    return responderJson({error:"No se pudo crear la sala."},503);
  }
  const codigo=normalizarCodigo(datos.codigo); if(!codigo)return responderJson({error:"Código no válido."},400);
  let sala=await obtenerSala(db,codigo); if(!sala)return responderJson({error:"La sala no existe."},404);
  let jugadores=await obtenerJugadores(db,sala.id);
  if(accion==="unirse"){
    if(jugadores.some(j=>j.matricula===matricula))return responderJson({sala:await presentar(db,sala,matricula)});
    if(sala.estado!=="espera"||jugadores.length>=10)return responderJson({error:"La sala ya comenzó o está completa."},409);
    await db.prepare("INSERT INTO jugadores_infiltrado(sala_id,matricula,unido_en) VALUES(?,?,unixepoch())").bind(sala.id,matricula).run();
    await db.prepare("UPDATE salas_infiltrado SET actualizada_en=unixepoch() WHERE id=?").bind(sala.id).run();
    return responderJson({sala:await presentar(db,sala,matricula)});
  }
  if(!jugadores.some(j=>j.matricula===matricula))return responderJson({error:"No perteneces a esta sala."},403);
  if(accion==="iniciar"){
    if(sala.anfitrion!==matricula||sala.estado!=="espera"||jugadores.length<3)return responderJson({error:"Se necesitan al menos 3 jugadores y solo inicia el anfitrión."},409);
    const infiltrado=jugadores[aleatorio(jugadores.length)].matricula; const tematica=TEMATICAS[aleatorio(TEMATICAS.length)]; const palabras=PALABRAS_POR_TEMATICA[tematica]; const palabra=palabras[aleatorio(palabras.length)];
    await db.prepare("UPDATE salas_infiltrado SET estado='pistas',palabra=?,tematica=?,infiltrado=?,actualizada_en=unixepoch() WHERE id=? AND estado='espera'").bind(palabra,tematica,infiltrado,sala.id).run();
  } else if(accion==="pista"){
    const pista=typeof datos.pista==="string"?datos.pista.trim().slice(0,20):""; if(sala.estado!=="pistas"||!/^\p{L}{2,20}$/u.test(pista))return responderJson({error:"La pista debe ser una sola palabra de 2 a 20 letras."},400);
    await db.prepare("UPDATE jugadores_infiltrado SET pista=? WHERE sala_id=? AND matricula=? AND pista IS NULL").bind(pista,sala.id,matricula).run();
    const faltan=await db.prepare("SELECT COUNT(*) total FROM jugadores_infiltrado WHERE sala_id=? AND pista IS NULL").bind(sala.id).first<{total:number}>();
    if((faltan?.total??1)===0)await db.prepare("UPDATE salas_infiltrado SET estado='votacion',actualizada_en=unixepoch() WHERE id=? AND estado='pistas'").bind(sala.id).run();
  } else if(accion==="votar"){
    const solicitado=typeof datos.voto==="string"?datos.voto.trim().toUpperCase():""; const voto=solicitado==="PASAR"?"PASAR":normalizarMatricula(solicitado); if(sala.estado!=="votacion"||!voto||(voto!=="PASAR"&&(voto===matricula||!jugadores.some(j=>j.matricula===voto))))return responderJson({error:"El voto no es válido."},400);
    await db.prepare("UPDATE jugadores_infiltrado SET voto=? WHERE sala_id=? AND matricula=? AND voto IS NULL").bind(voto,sala.id,matricula).run();
    const faltan=await db.prepare("SELECT COUNT(*) total FROM jugadores_infiltrado WHERE sala_id=? AND voto IS NULL").bind(sala.id).first<{total:number}>();
    if((faltan?.total??1)===0){
      const votosInfiltrado=await db.prepare("SELECT COUNT(*) total FROM jugadores_infiltrado WHERE sala_id=? AND voto=?").bind(sala.id,sala.infiltrado).first<{total:number}>();
      const descubierto=(votosInfiltrado?.total??0)>jugadores.length/2;
      if(descubierto){
        await db.prepare("UPDATE salas_infiltrado SET estado='finalizada',finalizada_en=unixepoch(),actualizada_en=unixepoch() WHERE id=? AND estado='votacion'").bind(sala.id).run();
      }else{
        const tematica=TEMATICAS[aleatorio(TEMATICAS.length)]; const palabras=PALABRAS_POR_TEMATICA[tematica]; const palabra=palabras[aleatorio(palabras.length)];
        await db.batch([
          db.prepare("UPDATE jugadores_infiltrado SET pista=NULL,voto=NULL WHERE sala_id=?").bind(sala.id),
          db.prepare("UPDATE salas_infiltrado SET estado='pistas',palabra=?,tematica=?,ronda=ronda+1,actualizada_en=unixepoch() WHERE id=? AND estado='votacion'").bind(palabra,tematica,sala.id),
        ]);
      }
    }
  } else if(accion==="repetir"){
    if(sala.estado!=="finalizada"||sala.anfitrion!==matricula)return responderJson({error:"Solo el anfitrión puede iniciar otra ronda."},403);
    const tematica=TEMATICAS[aleatorio(TEMATICAS.length)]; const palabras=PALABRAS_POR_TEMATICA[tematica]; const palabra=palabras[aleatorio(palabras.length)]; const infiltrado=jugadores[aleatorio(jugadores.length)].matricula;
    await db.batch([
      db.prepare("UPDATE jugadores_infiltrado SET pista=NULL,voto=NULL WHERE sala_id=?").bind(sala.id),
      db.prepare("UPDATE salas_infiltrado SET estado='pistas',palabra=?,tematica=?,infiltrado=?,ronda=1,finalizada_en=NULL,actualizada_en=unixepoch() WHERE id=? AND estado='finalizada'").bind(palabra,tematica,infiltrado,sala.id),
    ]);
  } else if(accion==="abandonar"){
    await db.prepare("UPDATE salas_infiltrado SET estado='abandonada',actualizada_en=unixepoch() WHERE id=? AND estado<>'finalizada'").bind(sala.id).run(); return responderJson({abandonada:true});
  } else return responderJson({error:"Acción no permitida."},400);
  sala=(await obtenerSala(db,codigo))!; return responderJson({sala:await presentar(db,sala,matricula)});
};
