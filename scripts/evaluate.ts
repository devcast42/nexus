import { config } from "dotenv"
config({ path: ".env.local" }); config({ path: ".env" })
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { desc,eq,sql } from "drizzle-orm"
import { getDb } from "../lib/db"
import * as schema from "../lib/db/schema"
import { loadGovernanceData } from "../lib/db/queries"
import { signDecision } from "../lib/decisions"
import { evaluateRules,loadOperationalData } from "../lib/governance-rules"
import { PROMPT_VERSION,deliberate } from "../lib/nexus-deliberation"
import { activeModel,activeProvider } from "../lib/copilot-provider"
import { controls,services,suppliers } from "../lib/operational-master"

// Arnés de evaluación del artefacto. Ejecuta el protocolo completo sobre una
// organización vacía, registra la operación por la MISMA API que usa la mesa de
// trabajo y mide lo que responde a las tres preguntas de investigación.
// No es parte del producto: no lo usa la aplicación, solo produce evidencia.
//
//   pnpm evaluate            protocolo completo (reinicia la base)
//   pnpm evaluate --no-reset mide lo que ya hay, sin regenerar

const API=process.env.OPERATIONS_URL??"http://localhost:3000/api/operations"
const DAYS=Number(process.env.ACTIVITY_DAYS??90)
const SEED=Number(process.env.ACTIVITY_SEED??42)
const REPEATS=Number(process.env.EVAL_REPEATS??5)
const RESET=!process.argv.includes("--no-reset")
const tsx="node_modules/.bin/tsx"
const run=(file:string,env:Record<string,string>={})=>execFileSync(tsx,[file],{stdio:"inherit",env:{...process.env,...env}})
const ms=()=>Date.now()

type Op={type:string;payload:Record<string,unknown>;at?:string}
async function post(ops:Op[]){
 const res=await fetch(API,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(ops)})
 const body=await res.json() as {applied?:{code?:string}[];count?:number;error?:string;signals?:Record<string,number>}
 if(!res.ok)throw new Error(`La API rechazó la operación: ${body.error}`)
 return body
}

const pct=(a:number,b:number)=>b===0?0:Math.round(a*1000/b)/10
const median=(xs:number[])=>{const s=[...xs].sort((a,b)=>a-b);return s.length===0?0:s.length%2?s[(s.length-1)/2]:Math.round((s[s.length/2-1]+s[s.length/2])/2)}
// Similitud léxica entre dos textos: cuánto comparten, sin contar palabras vacías.
const STOP=new Set(["de","la","el","los","las","un","una","que","en","y","a","por","con","se","del","al","es","su","sus","para","no","sin","lo","como","más","ya","o"])
const words=(t:string)=>new Set(t.toLowerCase().replace(/[^a-záéíóúñ\s]/g," ").split(/\s+/).filter(w=>w.length>3&&!STOP.has(w)))
function jaccard(a:string,b:string){const x=words(a),y=words(b);const inter=[...x].filter(w=>y.has(w)).length;const union=new Set([...x,...y]).size;return union===0?0:Math.round(inter*1000/union)/10}

async function snapshot(){
 const data=await loadGovernanceData()
 const measured=data.objectives.filter(o=>o.measure)
 return {data,measured,
  coverage:data.coverage,
  byDomain:data.domains.map(d=>({code:d.code,measured:measured.filter(o=>o.domain===d.code).length,total:data.objectives.filter(o=>o.domain===d.code).length})),
  samples:measured.map(o=>o.measure!.sample)}
}
const scoreOf=async(code:string)=>{const {data}=await snapshot();const o=data.objectives.find(x=>x.code===code);return {score:o?.score??null,sample:o?.measure?.sample??null,metric:o?.measure?.metric??null}}

async function main(){
 const report:Record<string,unknown>={
  ejecutado:new Date().toISOString(),
  configuracion:{dias:DAYS,semilla:SEED,proveedor:activeProvider(),modelo:activeModel(),promptVersion:PROMPT_VERSION,repeticiones:REPEATS},
 }
 const db=getDb()

 // ── E0. Estado inicial: una organización sin hechos no puede tener indicadores
 if(RESET){
  console.log("\n[E0] Reiniciando a organización vacía…")
  run("scripts/wipe-company.ts")
  run("lib/db/seed.ts",{SEED_PROFILE:"fresh"})
 }
 const vacio=await snapshot()
 report.e0_estadoInicial={objetivosMedidos:vacio.measured.length,objetivosTotales:vacio.data.objectives.length,
  discrepancias:vacio.data.negotiations.length,decisiones:vacio.data.decisions.length,
  dominiosConSalud:vacio.data.domains.filter(d=>vacio.byDomain.find(b=>b.code===d.code)!.measured>0).length}
 console.log(`[E0] ${vacio.measured.length} objetivos medidos de ${vacio.data.objectives.length}, ${vacio.data.negotiations.length} discrepancias`)

 // ── E1. Demostración: 90 días de operación entrando por la API
 if(RESET){
  // El catálogo maestro también entra por la API: en el protocolo no hay ninguna
  // escritura directa a la base, ni siquiera para dar de alta la organización.
  console.log("\n[E1] Dando de alta el catálogo por la API…")
  const alta:Op[]=[
   ...services.map(x=>({type:"service.register",payload:{...x}})),
   ...suppliers.map(({contractMonths,...x})=>({type:"supplier.register",payload:{...x,contractEnd:new Date(Date.now()+contractMonths*30*24*60*60_000).toISOString()}})),
   ...controls.map(({objective,...x})=>({type:"control.define",payload:{...x,objectiveCode:objective}})),
  ]
  const maestros=await post(alta)
  console.log(`[E1] ${maestros.count??alta.length} registros maestros`)
  console.log(`\n[E1] Generando ${DAYS} días de operación (semilla ${SEED})…`)
  run("scripts/generate-activity.ts",{ACTIVITY_DAYS:String(DAYS),ACTIVITY_SEED:String(SEED),OPERATIONS_URL:API})
 }
 const tablas=await db.execute(sql`select
   (select count(*) from services) servicios,(select count(*) from suppliers) proveedores,(select count(*) from controls) controles,
   (select count(*) from incidents) incidentes,(select count(*) from changes) cambios,(select count(*) from risks) riesgos,
   (select count(*) from projects) proyectos,(select count(*) from security_events) seguridad,
   (select count(*) from control_tests) pruebas,(select count(*) from sla_measurements) sla,(select count(*) from supplier_evaluations) evaluaciones`)
 const filas=Object.fromEntries(Object.entries(tablas.rows[0] as Record<string,string>).map(([k,v])=>[k,Number(v)]))
 report.e1_demostracion={periodoDias:DAYS,semilla:SEED,registros:filas,totalRegistros:Object.values(filas).reduce((a,b)=>a+b,0)}
 console.log(`[E1] ${Object.values(filas).reduce((a,b)=>a+b,0)} registros operativos`)

 // ── E2. PI1: medición derivada de la evidencia
 const s=await snapshot()
 report.e2_medicion={
  cobertura:{medidos:s.coverage.covered,total:s.coverage.total,porcentaje:pct(s.coverage.covered,s.coverage.total)},
  porDominio:s.byDomain,
  muestra:{minima:Math.min(...s.samples),mediana:median(s.samples),maxima:Math.max(...s.samples)},
  // Propiedad que el diseño promete: ningún indicador sin métrica, evidencia y muestra
  indicadoresSinEvidencia:s.measured.filter(o=>!o.measure!.metric||!o.measure!.evidence||o.measure!.sample<1).length,
  objetivos:s.measured.map(o=>({codigo:o.code,salud:o.score,muestra:o.measure!.sample,metrica:o.measure!.metric})),
 }
 console.log(`[E2] cobertura ${s.coverage.covered}/${s.coverage.total}, muestra mediana ${median(s.samples)}`)

 // ── E3. PI2: reglas deterministas y deliberación del modelo
 const negs=await db.select().from(schema.negotiations)
 const porRegla=new Map<string,{escaladas:number;resueltas:number}>()
 for(const n of negs){
  const regla=n.ruleKey.split(":")[0]
  const e=porRegla.get(regla)??{escaladas:0,resueltas:0}
  n.outcome==="escalated"?e.escaladas++:e.resueltas++
  porRegla.set(regla,e)
 }
 const corridas=await db.select().from(schema.governanceEvaluations).orderBy(desc(schema.governanceEvaluations.ranAt))
 const conDeliberacion=corridas.filter(c=>c.authored>0)
 const latencias=conDeliberacion.map(c=>Math.round(c.durationMs/c.authored))
 report.e3_reglas={
  discrepancias:negs.length,escaladas:negs.filter(n=>n.outcome==="escalated").length,resueltas:negs.filter(n=>n.outcome==="resolved").length,
  avisos:(await db.select().from(schema.notices)).length,
  porRegla:[...porRegla.entries()].map(([regla,v])=>({regla,...v})).sort((a,b)=>(b.escaladas+b.resueltas)-(a.escaladas+a.resueltas)),
  autoria:{modelo:negs.filter(n=>n.authoredBy==="model").length,plantilla:negs.filter(n=>n.authoredBy==="rule").length},
  latenciaPorDeliberacion:{mediana:median(latencias),minima:Math.min(...latencias,0),maxima:Math.max(...latencias,0),corridas:conDeliberacion.length},
 }
 console.log(`[E3] ${negs.length} discrepancias (${negs.filter(n=>n.outcome==="escalated").length} escaladas), ${negs.filter(n=>n.authoredBy==="model").length} deliberadas con modelo`)

 // ── E4. PI3: la firma no fabrica cumplimiento; el hecho sí
 console.log("\n[E4] Ciclo cerrado sobre BAI06…")
 const [servicio]=await db.select().from(schema.services).limit(1)
 const req=await post([{type:"change.request",payload:{title:"Cambio de evaluación del ciclo cerrado",serviceCode:servicio.code,kind:"Emergencia",requestedBy:"Equipo de evaluación"}}])
 const codigo=String(req.applied![0].code)
 await post([{type:"change.deploy",payload:{code:codigo,hasApprovalEvidence:false}}])
 const t0=await scoreOf("BAI06")
 const [pendiente]=await db.select().from(schema.negotiations).where(eq(schema.negotiations.ruleKey,`change-without-evidence:${codigo}`))
 const firma=pendiente?await signDecision(pendiente.id,"approved"):null
 const t1=await scoreOf("BAI06")
 await post([{type:"change.attachEvidence",payload:{code:codigo}}])
 const t2=await scoreOf("BAI06")
 report.e4_cicloCerrado={cambio:codigo,
  t0_trasDesplegarSinEvidencia:t0,
  t1_trasLaFirmaDelComite:{...t1,operacionesEjecutadasPorLaFirma:firma?.executedOps??null,rama:firma?.label??null},
  t2_trasAdjuntarEvidencia:t2,
  laFirmaCambioLaMedicion:t0.score!==t1.score,
  elHechoCambioLaMedicion:t1.score!==t2.score}
 console.log(`[E4] BAI06: ${t0.score} → ${t1.score} (firma) → ${t2.score} (evidencia)`)

 // ── E5. PI2: qué varía y qué no cuando se repite la misma deliberación
 console.log(`\n[E5] Repitiendo ${REPEATS} veces la deliberación de una misma discrepancia…`)
 const [mandato]=await db.select().from(schema.designProfiles).orderBy(desc(schema.designProfiles.appliedAt)).limit(1)
 const apetito=mandato?.riskAppetite??3.5
 const opsData=await loadOperationalData()
 const {negotiations:candidatos}=evaluateRules(opsData,apetito)
 const lentes=new Map((await db.select().from(schema.lenses)).map(l=>[l.code,{code:l.code,name:l.name,mandate:l.mandate}]))
 const nombres=new Map((await db.select({code:schema.objectives.code,name:schema.objectives.name}).from(schema.objectives)).map(o=>[o.code,o.name]))
 const c=candidatos.find(x=>x.outcome==="escalated")??candidatos[0]
 const corridasTexto:{authoredBy:string;ms:number;initiator:string;counterpart:string;proposal:string|null;sustituido:boolean}[]=[]
 if(c)for(let i=0;i<REPEATS;i++){
  const t=ms()
  const d=await deliberate({ruleKey:c.ruleKey,outcome:c.outcome,objectiveCode:c.objectiveCode,principleCode:c.principleCode,principleName:nombres.get(c.principleCode)??"",
   evidence:c.evidence,riskAppetite:apetito,mandateName:mandato?.name??"Sin mandato",
   initiator:lentes.get(c.initiatorLens)!,counterpart:lentes.get(c.counterpartLens)!,approveOps:c.approveOps,rejectOps:c.rejectOps,
   template:{initiatorPosition:c.initiatorPosition,counterpartPosition:c.counterpartPosition,resolution:c.resolution,escalationReason:c.escalationReason,proposal:c.proposal,approveLabel:c.approveLabel,approveImpact:c.approveImpact,rejectLabel:c.rejectLabel,rejectImpact:c.rejectImpact}})
  corridasTexto.push({authoredBy:d.authoredBy,ms:ms()-t,initiator:d.initiatorPosition,counterpart:d.counterpartPosition,proposal:d.proposal,
   // El texto vuelve a ser el de la plantilla cuando la post-validación rechazó lo que escribió el modelo
   sustituido:d.escalationReason===c.escalationReason||d.proposal===c.proposal})
  process.stdout.write(`  ${i+1}/${REPEATS} ${corridasTexto[i].authoredBy} ${corridasTexto[i].ms} ms\n`)
 }
 const pares:number[]=[]
 for(let i=0;i<corridasTexto.length;i++)for(let j=i+1;j<corridasTexto.length;j++)pares.push(jaccard(corridasTexto[i].initiator,corridasTexto[j].initiator))
 report.e5_estabilidad=c?{
  discrepancia:c.ruleKey,repeticiones:REPEATS,
  // Lo que fija la regla y el modelo no puede tocar: nunca entra en su salida
  invariantes:{objetivo:c.objectiveCode,principio:c.principleCode,resultado:c.outcome,lentes:[c.initiatorLens,c.counterpartLens],
   operacionesAprobar:c.approveOps.map(o=>o.type),operacionesRechazar:c.rejectOps.map(o=>o.type)},
  deliberadasConModelo:corridasTexto.filter(r=>r.authoredBy==="model").length,
  sustituidasPorPostValidacion:corridasTexto.filter(r=>r.sustituido).length,
  latenciaMs:{mediana:median(corridasTexto.map(r=>r.ms)),minima:Math.min(...corridasTexto.map(r=>r.ms)),maxima:Math.max(...corridasTexto.map(r=>r.ms))},
  similitudLexicaEntrePares:{mediana:median(pares),minima:Math.min(...pares),maxima:Math.max(...pares)},
  textos:corridasTexto.map(r=>({authoredBy:r.authoredBy,ms:r.ms,initiator:r.initiator})),
 }:null

 writeFileSync("docs/evaluacion.json",JSON.stringify(report,null,1))
 console.log("\n✓ docs/evaluacion.json")
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
