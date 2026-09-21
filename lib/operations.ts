import { desc,eq,sql } from "drizzle-orm"
import { getDb } from "./db"
import * as schema from "./db/schema"

// Única puerta de escritura de la capa operativa. Ni la UI ni el generador de
// actividad tocan SQL: ambos pasan por aquí, así que todo hecho registrado tiene
// autor, hora y validación. Es lo que separa "operar" de "sembrar la base".

export class OperationError extends Error {}

function requireString(value:unknown,field:string,max=200){
 if(typeof value!=="string"||value.trim().length===0)throw new OperationError(`Falta ${field}`)
 return value.trim().slice(0,max)
}
function requireOneOf<T extends string>(value:unknown,options:readonly T[],field:string):T{
 if(typeof value!=="string"||!options.includes(value as T))throw new OperationError(`${field} debe ser uno de: ${options.join(", ")}`)
 return value as T
}
function requireInt(value:unknown,field:string,min:number,max:number){
 const n=Number(value)
 if(!Number.isFinite(n)||n<min||n>max)throw new OperationError(`${field} debe estar entre ${min} y ${max}`)
 return Math.round(n)
}

async function nextCode(prefix:string,table:"incidents"|"changes"|"risks"|"projects"|"security_events"){
 const result=await getDb().execute<{n:number}>(sql`select coalesce(max(id),0)::int as n from ${sql.identifier(table)}`)
 return `${prefix}-${String((result.rows[0]?.n??0)+1).padStart(4,"0")}`
}

const SEVERITIES=["Crítica","Alta","Media","Baja"] as const
const CHANGE_KINDS=["Normal","Estándar","Emergencia"] as const
const TEST_RESULTS=["Efectivo","Parcial","Inefectivo"] as const
const RISK_STATUS=["Abierto","Mitigado","Aceptado","Cerrado"] as const
const CRITICALITY=["Crítico","Alto","Medio","Bajo"] as const
const codeFrom=(prefix:string,value:unknown,max=12)=>{const raw=requireString(value,"código",max).toUpperCase().replace(/[^A-Z0-9-]/g,"");if(raw.length<2)throw new OperationError("El código necesita al menos 2 caracteres además del prefijo");return raw.startsWith(prefix)?raw:`${prefix}${raw}`}
const PROJECT_STATUS=["En curso","En riesgo","Detenido","Cerrado"] as const

type Payload = Record<string,unknown>

export const operationTypes = [
 "incident.open","incident.resolve",
 "change.request","change.deploy","change.attachEvidence","change.rollback",
 "risk.raise","risk.mitigate","risk.close",
 "project.start","project.update",
 "security.detect","security.contain",
 "control.test","sla.measure","supplier.evaluate",
 // Maestros: una organización nueva da de alta su catálogo desde la mesa de trabajo
 "service.register","supplier.register","control.define",
] as const
export type OperationType = typeof operationTypes[number]

export async function applyOperation(type:string,payload:Payload,at:Date=new Date()){
 const db=getDb()
 switch(type){
  case "incident.open":{
   const code=await nextCode("INC","incidents")
   await db.insert(schema.incidents).values({code,
    title:requireString(payload.title,"título"),
    serviceCode:requireString(payload.serviceCode,"servicio",12),
    severity:requireOneOf(payload.severity,SEVERITIES,"severidad"),
    openedAt:at,
    causedByChange:typeof payload.causedByChange==="string"?payload.causedByChange.slice(0,16):null,
    recurring:payload.recurring===true,
    reportedBy:requireString(payload.reportedBy,"reportado por")})
   return {code}
  }
  case "incident.resolve":{
   const code=requireString(payload.code,"código",16)
   const result=await db.update(schema.incidents).set({resolvedAt:at}).where(eq(schema.incidents.code,code)).returning({code:schema.incidents.code})
   if(result.length===0)throw new OperationError(`El incidente ${code} no existe`)
   return {code}
  }
  case "change.request":{
   const code=await nextCode("CHG","changes")
   const windowStart=payload.windowStart?new Date(String(payload.windowStart)):null
   const windowEnd=payload.windowEnd?new Date(String(payload.windowEnd)):null
   await db.insert(schema.changes).values({code,
    title:requireString(payload.title,"título"),
    serviceCode:requireString(payload.serviceCode,"servicio",12),
    kind:requireOneOf(payload.kind,CHANGE_KINDS,"tipo"),
    requestedAt:at,windowStart,windowEnd,
    requestedBy:requireString(payload.requestedBy,"solicitado por")})
   return {code}
  }
  case "change.deploy":{
   const code=requireString(payload.code,"código",16)
   const result=await db.update(schema.changes)
    .set({deployedAt:at,hasApprovalEvidence:payload.hasApprovalEvidence===true})
    .where(eq(schema.changes.code,code)).returning({code:schema.changes.code})
   if(result.length===0)throw new OperationError(`El cambio ${code} no existe`)
   return {code}
  }
  case "change.attachEvidence":{
   const code=requireString(payload.code,"código",16)
   const result=await db.update(schema.changes).set({hasApprovalEvidence:true}).where(eq(schema.changes.code,code)).returning({code:schema.changes.code})
   if(result.length===0)throw new OperationError(`El cambio ${code} no existe`)
   return {code}
  }
  case "change.rollback":{
   const code=requireString(payload.code,"código",16)
   await db.update(schema.changes).set({rolledBack:true}).where(eq(schema.changes.code,code))
   return {code}
  }
  case "risk.raise":{
   const code=await nextCode("RSK","risks")
   await db.insert(schema.risks).values({code,
    title:requireString(payload.title,"título"),
    category:requireString(payload.category,"categoría"),
    projectCode:typeof payload.projectCode==="string"?payload.projectCode.slice(0,16):null,
    impact:requireInt(payload.impact,"impacto",1,5),
    likelihood:requireInt(payload.likelihood,"probabilidad",1,5),
    mitigationsPlanned:requireInt(payload.mitigationsPlanned??0,"mitigaciones planificadas",0,20),
    owner:requireString(payload.owner,"responsable"),
    status:"Abierto",raisedAt:at})
   return {code}
  }
  case "risk.mitigate":{
   const code=requireString(payload.code,"código",16)
   const [risk]=await db.select().from(schema.risks).where(eq(schema.risks.code,code))
   if(!risk)throw new OperationError(`El riesgo ${code} no existe`)
   const done=Math.min(risk.mitigationsPlanned,risk.mitigationsDone+1)
   await db.update(schema.risks).set({mitigationsDone:done,status:done>=risk.mitigationsPlanned&&risk.mitigationsPlanned>0?"Mitigado":risk.status}).where(eq(schema.risks.code,code))
   return {code,mitigationsDone:done}
  }
  case "risk.close":{
   const code=requireString(payload.code,"código",16)
   await db.update(schema.risks).set({status:requireOneOf(payload.status,RISK_STATUS,"estado")}).where(eq(schema.risks.code,code))
   return {code}
  }
  case "project.start":{
   const code=await nextCode("PRJ","projects")
   const plannedEnd=new Date(String(payload.plannedEnd))
   if(Number.isNaN(plannedEnd.getTime()))throw new OperationError("Fecha de fin planificada inválida")
   await db.insert(schema.projects).values({code,
    name:requireString(payload.name,"nombre"),
    sponsor:requireString(payload.sponsor,"patrocinador"),
    budget:requireInt(payload.budget,"presupuesto",0,100_000_000),
    startedAt:at,plannedEnd,forecastEnd:plannedEnd,status:"En curso"})
   return {code}
  }
  case "project.update":{
   const code=requireString(payload.code,"código",16)
   const forecastEnd=payload.forecastEnd?new Date(String(payload.forecastEnd)):undefined
   const [project]=await db.select().from(schema.projects).where(eq(schema.projects.code,code))
   if(!project)throw new OperationError(`El proyecto ${code} no existe`)
   await db.update(schema.projects).set({
    spent:payload.spent!==undefined?requireInt(payload.spent,"gasto",0,100_000_000):project.spent,
    forecastEnd:forecastEnd&&!Number.isNaN(forecastEnd.getTime())?forecastEnd:project.forecastEnd,
    status:payload.status!==undefined?requireOneOf(payload.status,PROJECT_STATUS,"estado"):project.status,
   }).where(eq(schema.projects.code,code))
   return {code}
  }
  case "security.detect":{
   const code=await nextCode("SEC","security_events")
   await db.insert(schema.securityEvents).values({code,
    kind:requireString(payload.kind,"tipo"),
    severity:requireOneOf(payload.severity,SEVERITIES,"severidad"),
    detectedAt:at,
    dataInvolved:payload.dataInvolved===true,
    source:requireString(payload.source,"origen")})
   return {code}
  }
  case "security.contain":{
   const code=requireString(payload.code,"código",16)
   await db.update(schema.securityEvents).set({containedAt:at}).where(eq(schema.securityEvents.code,code))
   return {code}
  }
  case "control.test":{
   const controlCode=requireString(payload.controlCode,"control",12)
   const [control]=await db.select().from(schema.controls).where(eq(schema.controls.code,controlCode))
   if(!control)throw new OperationError(`El control ${controlCode} no existe`)
   await db.insert(schema.controlTests).values({controlCode,testedAt:at,
    result:requireOneOf(payload.result,TEST_RESULTS,"resultado"),
    evidence:requireString(payload.evidence,"evidencia",500),
    testedBy:requireString(payload.testedBy,"probado por")})
   return {controlCode}
  }
  case "sla.measure":{
   const serviceCode=requireString(payload.serviceCode,"servicio",12)
   await db.insert(schema.slaMeasurements).values({serviceCode,
    periodStart:payload.periodStart?new Date(String(payload.periodStart)):at,
    measuredAvailability:Number(payload.measuredAvailability),
    breaches:requireInt(payload.breaches??0,"incumplimientos",0,1000)})
   return {serviceCode}
  }
  case "supplier.evaluate":{
   const supplierCode=requireString(payload.supplierCode,"proveedor",12)
   await db.insert(schema.supplierEvaluations).values({supplierCode,evaluatedAt:at,
    slaCompliance:Number(payload.slaCompliance),
    findings:requireInt(payload.findings??0,"hallazgos",0,100),
    evaluatedBy:requireString(payload.evaluatedBy,"evaluado por")})
   return {supplierCode}
  }
  case "service.register":{
   const code=codeFrom("SVC-",payload.code)
   await db.insert(schema.services).values({code,name:requireString(payload.name,"nombre"),criticality:requireOneOf(payload.criticality,CRITICALITY,"criticidad"),
    owner:requireString(payload.owner,"propietario"),targetAvailability:Number(payload.targetAvailability)||99,
    slaCriticalMinutes:requireInt(payload.slaCriticalMinutes??60,"SLA crítico (min)",5,10080),slaHighMinutes:requireInt(payload.slaHighMinutes??240,"SLA alto (min)",5,43200)})
    .onConflictDoUpdate({target:schema.services.code,set:{name:requireString(payload.name,"nombre"),criticality:requireOneOf(payload.criticality,CRITICALITY,"criticidad"),owner:requireString(payload.owner,"propietario"),targetAvailability:Number(payload.targetAvailability)||99,slaCriticalMinutes:requireInt(payload.slaCriticalMinutes??60,"SLA crítico (min)",5,10080),slaHighMinutes:requireInt(payload.slaHighMinutes??240,"SLA alto (min)",5,43200)}})
   return {code}
  }
  case "supplier.register":{
   const code=codeFrom("SUP-",payload.code)
   const contractEnd=payload.contractEnd?new Date(String(payload.contractEnd)):new Date(at.getTime()+365*24*60*60_000)
   if(Number.isNaN(contractEnd.getTime()))throw new OperationError("Fecha de fin de contrato inválida")
   await db.insert(schema.suppliers).values({code,name:requireString(payload.name,"nombre"),criticality:requireOneOf(payload.criticality,CRITICALITY,"criticidad"),service:requireString(payload.service,"servicio que presta"),contractEnd})
    .onConflictDoUpdate({target:schema.suppliers.code,set:{name:requireString(payload.name,"nombre"),criticality:requireOneOf(payload.criticality,CRITICALITY,"criticidad"),service:requireString(payload.service,"servicio que presta"),contractEnd}})
   return {code}
  }
  case "control.define":{
   const code=codeFrom("CTL-",payload.code)
   const objectiveCode=requireString(payload.objectiveCode,"objetivo COBIT",8).toUpperCase()
   const [objective]=await db.select({code:schema.objectives.code}).from(schema.objectives).where(eq(schema.objectives.code,objectiveCode))
   if(!objective)throw new OperationError(`El objetivo ${objectiveCode} no existe en COBIT 2019`)
   await db.insert(schema.controls).values({code,name:requireString(payload.name,"nombre"),objectiveCode,owner:requireString(payload.owner,"responsable"),frequencyDays:requireInt(payload.frequencyDays??30,"frecuencia (días)",1,365)})
    .onConflictDoUpdate({target:schema.controls.code,set:{name:requireString(payload.name,"nombre"),objectiveCode,owner:requireString(payload.owner,"responsable"),frequencyDays:requireInt(payload.frequencyDays??30,"frecuencia (días)",1,365)}})
   return {code}
  }
  default:
   throw new OperationError(`Operación desconocida: ${type}`)
 }
}

export async function operationalSummary(){
 const db=getDb()
 const [inc,chg,rsk,prj,sec,tst]=await Promise.all([
  db.select().from(schema.incidents).orderBy(desc(schema.incidents.openedAt)).limit(200),
  db.select().from(schema.changes).orderBy(desc(schema.changes.requestedAt)).limit(200),
  db.select().from(schema.risks).orderBy(desc(schema.risks.raisedAt)).limit(200),
  db.select().from(schema.projects).orderBy(desc(schema.projects.startedAt)).limit(50),
  db.select().from(schema.securityEvents).orderBy(desc(schema.securityEvents.detectedAt)).limit(200),
  db.select().from(schema.controlTests).orderBy(desc(schema.controlTests.testedAt)).limit(200),
 ])
 return {incidents:inc,changes:chg,risks:rsk,projects:prj,securityEvents:sec,controlTests:tst}
}
