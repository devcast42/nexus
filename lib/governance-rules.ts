import { desc,inArray,notInArray } from "drizzle-orm"
import { getDb } from "./db"
import * as schema from "./db/schema"
import { residualOf,type OperationalData } from "./governance-metrics"

// Reglas de gobierno: leen la capa operativa y el mandato, y producen las
// negociaciones y avisos. Nada de esto se siembra. Una negociación existe porque
// hay un hecho operativo que la sostiene, y desaparece cuando el hecho se corrige,
// salvo que el comité ya la haya firmado: entonces queda como registro.

type Op = { type:string; payload:Record<string,unknown> }
type Severity = "critical"|"warning"|"info"
type Domain = "EDM"|"APO"|"BAI"|"DSS"|"MEA"

export type NegotiationCandidate = {
 ruleKey:string; objectiveCode:string; domainCode:Domain; severity:Severity; fact:string
 initiatorAgent:Domain; initiatorPosition:string; counterpartAgent:Domain; counterpartPosition:string
 principleCode:string; outcome:"resolved"|"escalated"
 resolution:string|null; escalationReason:string|null; proposal:string|null
 approveLabel:string|null; approveImpact:string|null; rejectLabel:string|null; rejectImpact:string|null
 approveOps:Op[]; rejectOps:Op[]; openedAt:Date
}
export type NoticeCandidate = { ruleKey:string; objectiveCode:string; domainCode:Domain; severity:Severity; agent:string; fact:string; raisedAt:Date }

const DAY=24*60*60_000
const fmt=(d:Date)=>d.toLocaleDateString("es-PE",{day:"2-digit",month:"short",timeZone:"America/Lima"})
const domainOf=(objective:string)=>objective.slice(0,3) as Domain
const agentName:Record<Domain,string>={EDM:"Centinela Estratégico",APO:"Navegante de Riesgo",BAI:"Arquitecto de Cambio",DSS:"Guardián Operativo",MEA:"Auditor Continuo"}

export function evaluateRules(ops:OperationalData,riskAppetite:number,now:Date=new Date()){
 const negotiations:NegotiationCandidate[]=[]
 const notices:NoticeCandidate[]=[]
 const serviceOf=new Map(ops.services.map(s=>[s.code,s]))
 const projectOf=new Map(ops.projects.map(p=>[p.code,p]))

 // R1 · Riesgo abierto cuyo residual supera el apetito del mandato → escala (EDM03)
 for(const risk of ops.risks.filter(r=>r.status==="Abierto")){
  const residual=residualOf(risk)
  if(residual<=riskAppetite){
   if(residual>=riskAppetite-0.5)notices.push({ruleKey:`risk-near-appetite:${risk.code}`,objectiveCode:"EDM03",domainCode:"EDM",severity:"info",agent:"Centinela EDM",
    fact:`El riesgo ${risk.code} «${risk.title}» está en ${residual.toFixed(1)}, a menos de 0,5 del apetito ${riskAppetite.toFixed(1)}. El agente lo vigila sin proponer acción.`,raisedAt:risk.raisedAt})
   continue
  }
  const project=risk.projectCode?projectOf.get(risk.projectCode):undefined
  const projectName=project?.name.split(" — ")[0]
  negotiations.push({
   ruleKey:`risk-over-appetite:${risk.code}`,objectiveCode:"APO12",domainCode:"APO",
   severity:residual>=riskAppetite+1?"critical":"warning",
   fact:`El riesgo residual de «${risk.title}» está en ${residual.toFixed(1)}, sobre el apetito ${riskAppetite.toFixed(1)} fijado en el mandato. ${risk.mitigationsDone} de ${risk.mitigationsPlanned} mitigaciones ejecutadas.`,
   initiatorAgent:"APO",initiatorPosition:project?`Detener ${projectName} hasta ejecutar las mitigaciones pendientes.`:"Suspender la actividad expuesta hasta cerrar las mitigaciones pendientes.",
   counterpartAgent:project?"EDM":"BAI",counterpartPosition:project?`Sostener ${projectName}: es una iniciativa aprobada por el comité con ${Math.round((project!.spent/Math.max(1,project!.budget))*100)}% del presupuesto ejecutado.`:"Mantener la operación: las mitigaciones están planificadas y en curso.",
   principleCode:"EDM03",outcome:"escalated",resolution:null,
   escalationReason:`Ninguna posición cabe en el mandato: continuar opera por encima del apetito ${riskAppetite.toFixed(1)} que fijó el comité, y detener revierte una prioridad que el comité aprobó.`,
   proposal:project?`Detener ${projectName} hasta que el propietario del riesgo ejecute las ${risk.mitigationsPlanned-risk.mitigationsDone} mitigaciones pendientes.`:"Suspender la actividad expuesta hasta cerrar las mitigaciones pendientes.",
   approveLabel:project?`Detener ${projectName}`:"Suspender actividad",
   approveImpact:project?`${projectName} pasa a estado Detenido. BAI01 y BAI11 lo medirán así; el riesgo deja de crecer.`:"La actividad queda suspendida hasta que las mitigaciones se ejecuten.",
   rejectLabel:"Aceptar el riesgo",
   rejectImpact:`El riesgo ${risk.code} se cierra como Aceptado por encima del apetito, a tu nombre. EDM03 dejará de contarlo como abierto.`,
   approveOps:project?[{type:"project.update",payload:{code:project!.code,status:"Detenido"}}]:[],
   rejectOps:[{type:"risk.close",payload:{code:risk.code,status:"Aceptado"}}],
   openedAt:risk.raisedAt,
  })
 }

 // R2 · Cambio en producción sin evidencia de aprobación → escala (BAI06)
 for(const change of ops.changes.filter(c=>c.deployedAt&&!c.hasApprovalEvidence&&!c.rolledBack)){
  negotiations.push({
   ruleKey:`change-without-evidence:${change.code}`,objectiveCode:"BAI06",domainCode:"BAI",severity:change.kind==="Emergencia"?"warning":"critical",
   fact:`El cambio ${change.code} «${change.title}» (${change.kind.toLowerCase()}) está en producción desde el ${fmt(change.deployedAt!)} sin evidencia de aprobación registrada.`,
   initiatorAgent:"MEA",initiatorPosition:`Revertir ${change.code}: sin evidencia completa el control de cambios queda sin efecto.`,
   counterpartAgent:"BAI",counterpartPosition:"El cambio es estable en producción; revertirlo introduce un riesgo operativo mayor que el de la evidencia faltante.",
   principleCode:"BAI06",outcome:"escalated",resolution:null,
   escalationReason:"BAI06 exige evidencia previa al despliegue, pero aplicarlo ahora significa revertir un cambio estable. Autorizar la excepción le corresponde al comité.",
   proposal:`Exigir evidencia retroactiva a ${change.requestedBy} en 48 horas, manteniendo ${change.code} en producción.`,
   approveLabel:"Exigir evidencia",approveImpact:`La evidencia se adjunta a ${change.code}; BAI06 vuelve a contarlo como conforme en la próxima medición.`,
   rejectLabel:"Aceptar como excepción",rejectImpact:`${change.code} queda ratificado sin evidencia. BAI06 lo seguirá contando como no conforme y la excepción queda a tu nombre.`,
   approveOps:[{type:"change.attachEvidence",payload:{code:change.code}}],rejectOps:[],
   openedAt:change.deployedAt!,
  })
 }

 // R3 · Última prueba de un control inefectiva → escala (MEA02)
 const latestTest=new Map<string,typeof ops.controlTests[number]>()
 for(const t of ops.controlTests){const prev=latestTest.get(t.controlCode);if(!prev||t.testedAt>prev.testedAt)latestTest.set(t.controlCode,t)}
 for(const control of ops.controls){
  const test=latestTest.get(control.code)
  if(!test){continue}
  const overdueDays=Math.floor((now.getTime()-test.testedAt.getTime())/DAY)
  if(overdueDays>control.frequencyDays*1.5)notices.push({ruleKey:`control-overdue:${control.code}`,objectiveCode:control.objectiveCode,domainCode:domainOf(control.objectiveCode),severity:"warning",agent:"Auditor MEA",
   fact:`El control ${control.code} «${control.name}» lleva ${overdueDays} días sin prueba; su frecuencia es de ${control.frequencyDays}. El agente lo reporta antes de proponer acción.`,raisedAt:test.testedAt})
  if(test.result!=="Inefectivo")continue
  const owner=domainOf(control.objectiveCode)
  negotiations.push({
   ruleKey:`control-ineffective:${control.code}`,objectiveCode:control.objectiveCode,domainCode:owner,severity:"warning",
   fact:`La última prueba del control ${control.code} «${control.name}» (${fmt(test.testedAt)}) resultó inefectiva: ${test.evidence.toLowerCase()}.`,
   initiatorAgent:"MEA",initiatorPosition:`Suspender la dependencia del control ${control.code} hasta remediarlo: hoy no protege a ${control.objectiveCode}.`,
   counterpartAgent:owner==="MEA"?"DSS":owner,counterpartPosition:`El proceso sigue operando; ${control.owner} tiene la remediación en curso y suspenderlo interrumpe el servicio.`,
   principleCode:"MEA02",outcome:"escalated",resolution:null,
   escalationReason:"Un control inefectivo sobre un objetivo activo no se resuelve entre agentes: exige un compromiso del propietario que solo el comité puede reclamar.",
   proposal:`Exigir a ${control.owner} un plan de remediación con nueva prueba en 30 días.`,
   approveLabel:"Exigir remediación",approveImpact:`Se registra el compromiso de ${control.owner}. ${control.objectiveCode} se volverá a medir con la próxima prueba.`,
   rejectLabel:"Aceptar el control como está",rejectImpact:`El control queda inefectivo sin plan. ${control.objectiveCode} lo seguirá midiendo así.`,
   approveOps:[],rejectOps:[],openedAt:test.testedAt,
  })
 }

 // R4 · Incidentes recurrentes en un servicio crítico → resuelto entre agentes (DSS03)
 const recent=ops.incidents.filter(i=>now.getTime()-i.openedAt.getTime()<=30*DAY)
 for(const service of ops.services.filter(s=>s.criticality==="Crítico")){
  const recurring=recent.filter(i=>i.serviceCode===service.code&&i.recurring)
  if(recurring.length<2)continue
  negotiations.push({
   ruleKey:`recurring-incidents:${service.code}`,objectiveCode:"DSS03",domainCode:"DSS",severity:"info",
   fact:`${recurring.length} incidentes recurrentes en ${service.name} en los últimos 30 días.`,
   initiatorAgent:"DSS",initiatorPosition:`Abrir un problema y bloquear cambios en ${service.name} hasta el análisis de causa raíz.`,
   counterpartAgent:"BAI",counterpartPosition:"No bloquear: hay despliegues comprometidos en la ventana de este mes.",
   principleCode:"DSS03",outcome:"resolved",
   resolution:"Problema abierto con análisis de causa raíz en 10 días; los cambios continúan con validación adicional. Cabe dentro del mandato, así que no escala.",
   escalationReason:null,proposal:null,approveLabel:null,approveImpact:null,rejectLabel:null,rejectImpact:null,approveOps:[],rejectOps:[],
   openedAt:recurring[0].openedAt,
  })
 }

 // R5 · Servicio crítico bajo su disponibilidad objetivo en el último periodo → resuelto (APO09)
 const latestSla=new Map<string,typeof ops.slaMeasurements[number]>()
 for(const m of ops.slaMeasurements){const prev=latestSla.get(m.serviceCode);if(!prev||m.periodStart>prev.periodStart)latestSla.set(m.serviceCode,m)}
 for(const [code,m] of latestSla){
  const service=serviceOf.get(code)
  if(!service||service.criticality!=="Crítico"||m.measuredAvailability>=service.targetAvailability)continue
  negotiations.push({
   ruleKey:`sla-breach:${code}`,objectiveCode:"APO09",domainCode:"APO",severity:"info",
   fact:`${service.name} midió ${m.measuredAvailability.toFixed(2)}% de disponibilidad en el último periodo, bajo el ${service.targetAvailability}% comprometido (${m.breaches} incumplimientos).`,
   initiatorAgent:"DSS",initiatorPosition:`Renegociar el acuerdo de ${service.name} a un objetivo alcanzable.`,
   counterpartAgent:"APO",counterpartPosition:"Mantener el acuerdo: el compromiso con el negocio no se rebaja por un mes malo.",
   principleCode:"APO09",outcome:"resolved",
   resolution:`Acuerdo intacto; plan de mejora con el propietario (${service.owner}) revisado en el próximo periodo. Cabe dentro del mandato.`,
   escalationReason:null,proposal:null,approveLabel:null,approveImpact:null,rejectLabel:null,rejectImpact:null,approveOps:[],rejectOps:[],
   openedAt:m.periodStart,
  })
 }

 // N · Eventos de seguridad sin contener por más de 48 h
 for(const e of ops.securityEvents.filter(e=>!e.containedAt&&now.getTime()-e.detectedAt.getTime()>2*DAY)){
  notices.push({ruleKey:`security-uncontained:${e.code}`,objectiveCode:"DSS05",domainCode:"DSS",severity:e.severity==="Crítica"?"critical":"warning",agent:"Guardián DSS",
   fact:`El evento ${e.code} «${e.kind}» (${e.severity.toLowerCase()}) lleva ${Math.floor((now.getTime()-e.detectedAt.getTime())/DAY)} días sin contención registrada.`,raisedAt:e.detectedAt})
 }

 return {negotiations,notices}
}

export async function loadOperationalData():Promise<OperationalData>{
 const db=getDb()
 const [incidents,changes,risks,projects,securityEvents,controlTests,services,controls,slaMeasurements,supplierEvaluations]=await Promise.all([
  db.select().from(schema.incidents),db.select().from(schema.changes),db.select().from(schema.risks),db.select().from(schema.projects),
  db.select().from(schema.securityEvents),db.select().from(schema.controlTests),db.select().from(schema.services),db.select().from(schema.controls),
  db.select().from(schema.slaMeasurements),db.select().from(schema.supplierEvaluations),
 ])
 return {incidents,changes,risks,projects,securityEvents,controlTests,services,controls,slaMeasurements,supplierEvaluations}
}

// Reevalúa las reglas y sincroniza la tabla: crea las nuevas, actualiza el hecho de
// las vigentes y retira las que ya no tienen sustento y nadie firmó.
export async function syncGovernanceSignals(){
 const db=getDb()
 const [mandate]=await db.select().from(schema.designProfiles).orderBy(desc(schema.designProfiles.appliedAt)).limit(1)
 const appetite=mandate?.riskAppetite??3.5
 const {negotiations,notices}=evaluateRules(await loadOperationalData(),appetite)

 const signed=new Set((await db.select({id:schema.decisions.negotiationId}).from(schema.decisions)).map(d=>d.id))
 const existing=await db.select({id:schema.negotiations.id,ruleKey:schema.negotiations.ruleKey}).from(schema.negotiations)
 const existingByKey=new Map(existing.map(n=>[n.ruleKey,n.id]))

 for(const n of negotiations){
  const id=existingByKey.get(n.ruleKey)
  if(id!==undefined&&signed.has(id))continue // lo firmado no se reescribe
  await db.insert(schema.negotiations).values(n).onConflictDoUpdate({target:schema.negotiations.ruleKey,set:{...n}})
 }
 const liveKeys=new Set(negotiations.map(n=>n.ruleKey))
 const stale=existing.filter(n=>!liveKeys.has(n.ruleKey)&&!signed.has(n.id)).map(n=>n.id)
 if(stale.length>0)await db.delete(schema.negotiations).where(inArray(schema.negotiations.id,stale))

 for(const n of notices)await db.insert(schema.notices).values(n).onConflictDoUpdate({target:schema.notices.ruleKey,set:{...n}})
 const liveNoticeKeys=notices.map(n=>n.ruleKey)
 if(liveNoticeKeys.length>0)await db.delete(schema.notices).where(notInArray(schema.notices.ruleKey,liveNoticeKeys))
 else await db.delete(schema.notices)

 return {negotiations:negotiations.length,escalated:negotiations.filter(n=>n.outcome==="escalated").length,notices:notices.length,retired:stale.length}
}
