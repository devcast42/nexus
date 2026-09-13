import { config } from "dotenv"
config({ path: ".env.local" }); config({ path: ".env" })
import { controls,services,suppliers } from "../lib/operational-master"

// Genera actividad operativa llamando a la MISMA API que usa la mesa de trabajo.
// No escribe en la base: cada hecho entra como una operación validada, con autor
// y fecha. Es la diferencia entre simular la operación y sembrar el resultado.
//
// Dos fases, y la razón importa: los seguimientos (resolver, desplegar, mitigar)
// usan los códigos que DEVUELVE la API, nunca códigos predichos por el cliente.
// Predecirlos rompe en cuanto la base ya tiene filas de una corrida anterior.

const ENDPOINT = process.env.OPERATIONS_URL ?? "http://localhost:3000/api/operations"
const DAYS = Number(process.env.ACTIVITY_DAYS ?? 90)
const SEED = Number(process.env.ACTIVITY_SEED ?? 42)

let seed = SEED
const rand=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff}
const pick=<T,>(xs:readonly T[])=>xs[Math.floor(rand()*xs.length)]
const chance=(p:number)=>rand()<p
const daysAgo=(d:number)=>new Date(Date.now()-d*24*60*60_000)

type Op = { type:string; payload:Record<string,unknown>; at:string }
const op=(type:string,payload:Record<string,unknown>,at:Date):Op=>({type,payload,at:at.toISOString()})

type Creation = { op:Op; plan:(code:string)=>Op[] }
// Fase 0: proyectos. Sus códigos los devuelve el servidor y los necesitan los riesgos
// de la fase 1 para vincularse. Predecirlos es justo el error que evitamos.
const projectCreations:Creation[]=[]
const creations:Creation[]=[]
const standalone:Op[]=[]
const create=(o:Op,plan:(code:string)=>Op[]=()=>[])=>creations.push({op:o,plan})

const people=["Mesa de Servicio","Gerencia de Servicios","Seguridad de la Información","Gerencia de Infraestructura","Auditoría Interna"]
const incidentTitles=["Latencia elevada","Errores 5xx intermitentes","Caída parcial del servicio","Fallo de sincronización","Saturación de conexiones","Error de autenticación"]

// ── Proyectos ────────────────────────────────────────────────────────────────
const projectSeeds=[
 {name:"Atlas — modernización del core comercial",sponsor:"Dirección Comercial",budget:1_800_000,months:10,trouble:true},
 {name:"Fénix — migración a la nube",sponsor:"Gerencia de Infraestructura",budget:950_000,months:8,trouble:false},
 {name:"Brújula — analítica de clientes",sponsor:"Gerencia de Datos",budget:420_000,months:6,trouble:false},
]
const projectCodes:string[]=[]
projectSeeds.forEach((p,i)=>{
 const started=daysAgo(DAYS-5-i*7)
 const plannedEnd=new Date(started.getTime()+p.months*30*24*60*60_000)
 projectCreations.push({op:op("project.start",{name:p.name,sponsor:p.sponsor,budget:p.budget,plannedEnd:plannedEnd.toISOString()},started),
  plan:code=>{
   projectCodes[i]=code
   return [op("project.update",{code,
    spent:Math.round(p.budget*(p.trouble?.78:.5)),
    forecastEnd:new Date(plannedEnd.getTime()+(p.trouble?45:-3)*24*60*60_000).toISOString(),
    status:p.trouble?"En riesgo":"En curso"},daysAgo(3))]
  }})
})

// ── Incidentes ───────────────────────────────────────────────────────────────
for(let day=DAYS;day>0;day--){
 const count=chance(.25)?2:chance(.5)?1:0
 for(let n=0;n<count;n++){
  const service=pick(services)
  const severity=service.criticality==="Crítico"&&chance(.25)?"Crítica":chance(.4)?"Alta":chance(.7)?"Media":"Baja"
  const openedAt=new Date(daysAgo(day).getTime()+Math.floor(rand()*8)*60*60_000)
  const resolves=chance(.92)
  const budgetMinutes=severity==="Crítica"?service.slaCriticalMinutes:service.slaHighMinutes
  const factor=chance(.72)?.4+rand()*.5:1.2+rand()*1.5 // ~72% dentro del tiempo comprometido
  create(op("incident.open",{serviceCode:service.code,title:`${pick(incidentTitles)} en ${service.name}`,severity,
   reportedBy:pick(people),recurring:chance(.18)},openedAt),
   code=>resolves?[op("incident.resolve",{code},new Date(openedAt.getTime()+budgetMinutes*factor*60_000))]:[])
 }
}

// ── Cambios ──────────────────────────────────────────────────────────────────
for(let day=DAYS;day>0;day-=2){
 if(!chance(.7))continue
 const service=pick(services)
 const kind=chance(.12)?"Emergencia":chance(.35)?"Estándar":"Normal"
 const requestedAt=daysAgo(day)
 const windowStart=new Date(requestedAt.getTime()+2*24*60*60_000)
 const deploys=chance(.88)
 const insideWindow=chance(.8)
 // Las emergencias son las que suelen entrar sin evidencia completa: eso alimenta BAI06
 const hasEvidence=kind==="Emergencia"?chance(.45):chance(.9)
 const rollback=chance(.07)
 create(op("change.request",{serviceCode:service.code,title:`Despliegue en ${service.name}`,kind,
  requestedBy:pick(["Kodea Software","Nortia Systems","Gerencia de Infraestructura"]),
  windowStart:windowStart.toISOString(),windowEnd:new Date(windowStart.getTime()+4*60*60_000).toISOString()},requestedAt),
  code=>{
   if(!deploys)return []
   const deployedAt=new Date(windowStart.getTime()+(insideWindow?1:9)*60*60_000)
   const ops=[op("change.deploy",{code,hasApprovalEvidence:hasEvidence},deployedAt)]
   if(rollback)ops.push(op("change.rollback",{code},new Date(deployedAt.getTime()+6*60*60_000)))
   return ops
  })
}

// ── Riesgos ──────────────────────────────────────────────────────────────────
const riskSeeds=[
 {title:"Riesgo residual del proyecto Atlas por encima del umbral",category:"Programas y proyectos",impact:5,likelihood:4,planned:4,executed:1,project:0},
 {title:"Dependencia crítica de un único proveedor de nube",category:"Terceros",impact:4,likelihood:3,planned:3,executed:2},
 {title:"Obsolescencia de la plataforma de correo",category:"Infraestructura",impact:3,likelihood:3,planned:2,executed:2},
 {title:"Brecha de habilidades en seguridad de aplicaciones",category:"Personal",impact:3,likelihood:4,planned:3,executed:1},
 {title:"Exposición a incumplimiento normativo por datos personales",category:"Cumplimiento",impact:5,likelihood:2,planned:4,executed:3},
 {title:"Capacidad insuficiente en la ventana de cierre contable",category:"Operación",impact:4,likelihood:3,planned:2,executed:1},
]
const buildRisks=()=>riskSeeds.forEach((r,i)=>{
 const raisedAt=daysAgo(DAYS-10-i*6)
 create(op("risk.raise",{title:r.title,category:r.category,impact:r.impact,likelihood:r.likelihood,
  mitigationsPlanned:r.planned,owner:"Gerencia de Riesgos",
  projectCode:r.project!==undefined?projectCodes[r.project]:undefined},raisedAt),
  code=>Array.from({length:r.executed},(_,m)=>op("risk.mitigate",{code},new Date(raisedAt.getTime()+(m+1)*7*24*60*60_000))))
})

// ── Eventos de seguridad ─────────────────────────────────────────────────────
const secKinds=["Intento de acceso no autorizado","Phishing dirigido","Malware detectado en endpoint","Escaneo de puertos","Fuga de credenciales"]
for(let day=DAYS;day>0;day-=4){
 if(!chance(.6))continue
 const detectedAt=daysAgo(day)
 const severity=chance(.15)?"Crítica":chance(.4)?"Alta":"Media"
 const contains=chance(.85)
 const hours=2+rand()*20
 create(op("security.detect",{kind:pick(secKinds),severity,source:pick(["Centinela SOC","EDR corporativo","Reporte de usuario"]),
  dataInvolved:chance(.12)},detectedAt),
  code=>contains?[op("security.contain",{code},new Date(detectedAt.getTime()+hours*60*60_000))]:[])
}

// ── Sin código: pruebas de control, disponibilidad y proveedores ─────────────
for(const control of controls){
 for(let day=DAYS;day>0;day-=control.frequencyDays){
  const result=chance(.62)?"Efectivo":chance(.75)?"Parcial":"Inefectivo"
  standalone.push(op("control.test",{controlCode:control.code,result,
   evidence:result==="Efectivo"?"Muestra revisada sin excepciones":result==="Parcial"?"Excepciones menores documentadas":"Excepciones significativas sin remediar",
   testedBy:"Auditoría Interna"},daysAgo(day)))
 }
}
for(const service of services){
 for(let month=Math.floor(DAYS/30);month>0;month--){
  // ~75% de los meses se cumple el objetivo; el resto se incumple de verdad
  const measured=chance(.75)?service.targetAvailability+rand()*.06:service.targetAvailability-(.1+rand()*.8)
  standalone.push(op("sla.measure",{serviceCode:service.code,periodStart:daysAgo(month*30).toISOString(),
   measuredAvailability:Math.round(measured*100)/100,breaches:measured<service.targetAvailability?1+Math.floor(rand()*3):0},daysAgo(month*30-1)))
 }
}
for(const supplier of suppliers){
 standalone.push(op("supplier.evaluate",{supplierCode:supplier.code,slaCompliance:Math.round((82+rand()*17)*10)/10,
  findings:Math.floor(rand()*4),evaluatedBy:"Gerencia de Abastecimiento"},daysAgo(20)))
}

// ── Envío ────────────────────────────────────────────────────────────────────
async function send(ops:Op[]):Promise<{type:string;code?:string}[]>{
 const applied:{type:string;code?:string}[]=[]
 for(let i=0;i<ops.length;i+=100){
  const batch=ops.slice(i,i+100)
  const response=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(batch)})
  const result=await response.json() as {applied?:{type:string;code?:string}[];error?:string}
  if(!response.ok){
   console.error(`\nLote rechazado: ${result.error}`)
   process.exit(1)
  }
  applied.push(...(result.applied??[]))
  process.stdout.write(`\r  ${applied.length}/${ops.length}`)
 }
 return applied
}

async function main(){
 console.log(`Fase 0 · ${projectCreations.length} proyectos → ${ENDPOINT}`)
 const projectsCreated=await send(projectCreations.map(c=>c.op))
 const projectFollows=projectCreations.flatMap((c,i)=>c.plan(projectsCreated[i].code!))
 buildRisks() // ahora projectCodes ya tiene los códigos reales

 creations.sort((a,b)=>a.op.at.localeCompare(b.op.at))
 console.log(`\nFase 1 · ${creations.length} hechos que crean entidad`)
 const created=await send(creations.map(c=>c.op))
 if(created.length!==creations.length)throw new Error("La API no devolvió un código por cada creación")

 // Los seguimientos se arman con los códigos reales devueltos por el servidor
 const follows=projectFollows.concat(creations.flatMap((c,i)=>c.plan(created[i].code!)),standalone)
 follows.sort((a,b)=>a.at.localeCompare(b.at))
 console.log(`\nFase 2 · ${follows.length} seguimientos y mediciones`)
 await send(follows)
 console.log(`\n✓ ${projectsCreated.length+created.length+follows.length} operaciones registradas por la API (${DAYS} días, semilla ${SEED})`)
}
main().catch(e=>{console.error("\n",e.message);process.exit(1)})
