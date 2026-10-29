const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function cargar(relativo,globals={}) {
 const archivo=path.resolve(__dirname,'..',relativo),module={exports:{}};
 const requireLocal=nombre=>cargar(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(archivo),nombre+'.ts')),globals);
 const code=ts.transpileModule(fs.readFileSync(archivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:requireLocal,URL,Request,Response,Headers,TextEncoder,AbortController,atob,btoa,crypto:crypto.webcrypto,...globals});return module.exports;
}
const handler=cargar('functions/administracion/teo-manual/[[archivo]].ts');
const servicio=cargar('src/servicios/manualTeo.ts');
const middleware=cargar('functions/_middleware.ts');
const env={USUARIO_DEMO:'fixture-admin',CONTRASENA_DEMO:'fixture-only',SECRETO_SESION:'fixture-secret',CONTENIDO_DB:{prepare:()=>({bind:()=>({first:async()=>({matricula:'OP01'})})})}};
function cookie(rol){const carga=Buffer.from(JSON.stringify({usuario:rol==='administrador'?'fixture-admin':rol==='invitado'?'invitado-cra':'OP01',rol,matricula:'OP01',caduca:Math.floor(Date.now()/1000)+60})).toString('base64url');return `sesion_cra=${carga}.${crypto.createHmac('sha256',env.SECRETO_SESION).update(carga).digest('base64url')}`}
for(const archivo of ['catalogo.json','imagenes/pagina-045.jpg','manual.pdf']) {
 test('Puerta firmada protege '+archivo+' para GET y HEAD',async()=>{
  for(const rol of ['administrador','invitado','operador',null])for(const method of ['GET','HEAD']) {
   let reached=false;
   const r=await middleware.onRequest({request:new Request('https://cra.test/administracion/teo-manual/'+archivo,{method,headers:rol?{Cookie:cookie(rol)}:{}}),env,next:async()=>{reached=true;return new Response('fixture')}});
   assert.equal(reached,rol==='administrador');if(rol&&rol!=='administrador')assert.equal(r.status,403);
  }
 });
}
test('Defensa del handler impide datos y escrituras a otros roles',async()=>{
 for(const rol of ['invitado','operador',undefined]){let used=false;const r=await handler.onRequest({data:{rol},params:{archivo:'catalogo.json'},request:new Request('https://cra.test/'),env:{MEDIA_PRIVADA:{get:async()=>{used=true}}},next:()=>{used=true}});assert.equal(r.status,403);assert.equal(used,false)}
});
test('Solo permite rutas cerradas, páginas válidas y métodos de lectura',async()=>{
 const ctx={data:{rol:'administrador'},request:new Request('https://cra.test/'),env:{},next:()=>{throw Error('No debe leer assets')}};
 for(const archivo of ['../catalogo.json','imagenes/pagina-000.jpg','imagenes/pagina-143.jpg','manual.pdf/extra','otra.json'])assert.equal((await handler.onRequest({...ctx,params:{archivo}})).status,404);
 assert.equal((await handler.onRequest({...ctx,request:new Request('https://cra.test/',{method:'POST'}),params:{archivo:'catalogo.json'}})).status,405);
});
test('Guarda la copia privada y recupera datos en un build posterior sin assets',async()=>{
 let contenido=null;const bucket={get:async()=>contenido?{body:new Blob([contenido]).stream()}:null,put:async(k,v)=>{assert.equal(k,'teo/manual-2025-revision-v1/catalogo.json');contenido=v}};
 const base={data:{rol:'administrador'},params:{archivo:'catalogo.json'},request:new Request('https://cra.test/'),env:{MEDIA_PRIVADA:bucket}};
 const r=await handler.onRequest({...base,next:async()=>new Response('{"version":"fixture"}',{headers:{'Content-Type':'application/json'}})});
 assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(await r.text(),'{"version":"fixture"}');assert.ok(contenido);
 const r2=await handler.onRequest({...base,next:()=>{throw Error('No debe depender de un asset ya retirado')}});assert.equal(await r2.text(),'{"version":"fixture"}');
});
test('No guarda HTML de fallback como catálogo ni fragmentos PDF como documento completo',async()=>{
 let put=0;const base={data:{rol:'administrador'},request:new Request('https://cra.test/'),env:{MEDIA_PRIVADA:{get:async()=>null,put:async()=>put++}}};
 assert.equal((await handler.onRequest({...base,params:{archivo:'catalogo.json'},next:async()=>new Response('<html>SPA</html>',{headers:{'Content-Type':'text/html'}})})).status,503);
 const r=await handler.onRequest({...base,params:{archivo:'manual.pdf'},next:async()=>new Response('fragmento',{status:206,headers:{'Content-Type':'application/pdf','Content-Range':'bytes 0-8/100'}})});assert.equal(r.status,206);assert.equal(r.headers.get('Content-Range'),'bytes 0-8/100');assert.equal(put,0);
});
test('El cliente reconoce login HTML y 403; no los interpreta como respuestas',async()=>{
 for(const response of [new Response('<html>Acceso</html>',{headers:{'Content-Type':'text/html'}}),new Response('{}',{status:403})]){const s=cargar('src/servicios/manualTeo.ts',{fetch:async()=>response});await assert.rejects(s.cargarManualTeo(new AbortController().signal),/sesión de administrador/)}
});
test('Busca O.E. con puntuación y preguntas sin seleccionar automáticamente una ruta',()=>{
 const datos=[{id:'interferencia',titulo:'Interferencia',grupo:'Técnicas',alias:['inhibición'],respuesta:'Revisar O.E.',nodos:{}},{id:'fuego',titulo:'Fuego',grupo:'Alarmas',alias:['incendio'],respuesta:'Otro proceso',nodos:{}}];
 assert.equal(servicio.normalizarConsultaManual('O: E'),servicio.normalizarConsultaManual('O.E.'));
 assert.equal(servicio.buscarProcedimientosManual(datos,'qué es una interferencia y cómo debo proceder')[0].id,'interferencia');
 assert.equal(servicio.buscarProcedimientosManual(datos,'inhibicion')[0].id,'interferencia');
 assert.equal(servicio.buscarProcedimientosManual(datos,'O: E')[0].id,'interferencia');
 assert.equal(servicio.buscarProcedimientosManual(datos,'zzzz').length,0);
 assert.equal(servicio.buscarProcedimientosManual(datos,'interferencia','Alarmas').length,0);
});
test('HEAD antes del primer GET no guarda una copia vacía',async()=>{
 let puts=0;const r=await handler.onRequest({data:{rol:'administrador'},params:{archivo:'catalogo.json'},request:new Request('https://cra.test/',{method:'HEAD'}),env:{MEDIA_PRIVADA:{get:async()=>null,put:async()=>puts++}},next:async()=>new Response(null,{headers:{'Content-Type':'application/json'}})});assert.equal(r.status,200);assert.equal(await r.text(),'');assert.equal(puts,0);
});
test('El middleware bloquea rutas administrativas escapadas y separadores duplicados',async()=>{
 for(const p of ['/%61dministracion/teo-manual/catalogo.json','/administracion%2fteo-manual/catalogo.json','//administracion//teo-manual/catalogo.json','/administracion/%74eo-manual/catalogo.json','/%2561dministracion/teo-manual/catalogo.json']){
 let passed=false;const r=await middleware.onRequest({request:new Request('https://cra.test'+p,{headers:{Cookie:cookie('invitado')}}),env,next:async()=>{passed=true;return new Response('fixture')}});assert.equal(r.status,403,p);assert.equal(passed,false,p);
 }
});
