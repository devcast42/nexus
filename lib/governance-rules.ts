import { createHash } from "node:crypto"
import { desc,inArray,notInArray } from "drizzle-orm"
import { PROMPT_VERSION,deliberate,modelAvailable,type Lens } from "./nexus-deliberation"
import { activeModel } from "./copilot-provider"
import { getDb } from "./db"
import * as schema from "./db/schema"
import { residualOf,type OperationalData } from "./governance-metrics"

// Reglas de gobierno: leen la capa operativa y el mandato, y producen las
// discrepancias y avisos que Nexus analiza. Nada de esto se siembra. Una negociación
// existe porque hay un hecho operativo que la sostiene, y desaparece cuando el hecho
// se corrige, salvo que el comité ya la haya firmado: entonces queda como registro.

type Op = { type:string; payload:Record<string,unknown> }
type Severity = "critical"|"warning"|"info"
type Domain = "EDM"|"APO"|"BAI"|"DSS"|"MEA"

export type NegotiationCandidate = {
 ruleKey:string; objectiveCode:string; domainCode:Domain; severity:Severity; fact:string
 initiatorLens:Domain; initiatorPosition:string; counterpartLens:Domain; counterpartPosition:string
 principleCode:string; outcome:"resolved"|"escalated"
 resolution:string|null; escalationReason:string|null; proposal:string|null
 approveLabel:string|null; approveImpact:string|null; rejectLabel:string|null; rejectImpact:string|null
 approveOps:Op[]; rejectOps:Op[]; openedAt:Date
 // Hoja de hechos con la que Nexus delibera. Solo datos.
 evidence:string
}
export type NoticeCandidate = { ruleKey:string; objectiveCode:string; domainCode:Domain; severity:Severity; lens:Domain; fact:string; raisedAt:Date }

const DAY=24*60*60_000
const fmt=(d:Date)=>d.toLocaleDateString("es-PE",{day:"2-digit",month:"short",timeZone:"America/Lima"})
const domainOf=(objective:string)=>objective.slice(0,3) as Domain
const lensName:Record<Domain,string>={EDM:"Centinela Estratégico",APO:"Navegante de Riesgo",BAI:"Arquitecto de Cambio",DSS:"Guardián Operativo",MEA:"Auditor Continuo"}

export function evaluateRules(ops:OperationalData,riskAppetite:number,now:Date=new Date()){
 const negotiations:NegotiationCandidate[]=[]
 const notices:NoticeCandidate[]=[]
 const serviceOf=new Map(ops.services.map(s=>[s.code,s]))
 const projectOf=new Map(ops.projects.map(p=>[p.code,p]))

 // R1 · Riesgo abierto cuyo residual supera el apetito del mandato → escala (EDM03)
 for(const risk of ops.risks.filter(r=>r.status==="Abierto")){
  const residual=residualOf(risk)
  if(residual<=riskAppetite){
   if(residual>=riskAppetite-0.5)notices.push({ruleKey:`risk-near-appetite:${risk.code}`,objectiveCode:"EDM03",domainCode:"EDM",severity:"info",lens:"EDM",
    fact:`El riesgo ${risk.code} «${risk.title}» está en ${residual.toFixed(1)}, a menos de 0,5 del apetito ${riskAppetite.toFixed(1)}. Nexus lo vigila sin proponer acción.`,raisedAt:risk.raisedAt})
   continue
  }
  const project=risk.projectCode?projectOf.get(risk.projectCode):undefined
  const projectName=project?.name.split(" — ")[0]
  negotiations.push({
   ruleKey:`risk-over-appetite:${risk.code}`,objectiveCode:"APO12",domainCode:"APO",
   severity:residual>=riskAppetite+1?"critical":"warning",
   fact:`El riesgo residual de «${risk.title}» está en ${residual.toFixed(1)}, sobre el apetito ${riskAppetite.toFixed(1)} fijado en el mandato. ${risk.mitigationsDone} de ${risk.mitigationsPlanned} mitigaciones ejecutadas.`,
   initiatorLens:"APO",initiatorPosition:project?`Detener ${projectName} hasta ejecutar las mitigaciones pendientes.`:"Suspender la actividad expuesta hasta cerrar las mitigaciones pendientes.",
   counterpartLens:project?"EDM":"BAI",counterpartPosition:project?`Sostener ${projectName}: es una iniciativa aprobada por el comité con ${Math.round((project!.spent/Math.max(1,project!.budget))*100)}% del presupuesto ejecutado.`:"Mantener la operación: las mitigaciones están planificadas y en curso.",
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
   evidence:[`Riesgo ${risk.code}: «${risk.title}» (categoría ${risk.category}), levantado el ${fmt(risk.raisedAt)} por ${risk.owner}.`,
    `Impacto ${risk.impact}/5 × probabilidad ${risk.likelihood}/5. Residual actual ${residual.toFixed(1)} contra apetito ${riskAppetite.toFixed(1)}.`,
    `Mitigaciones: ${risk.mitigationsDone} ejecutadas de ${risk.mitigationsPlanned} planificadas.`,
    project?`Proyecto vinculado ${project.code} «${project.name}»: estado ${project.status}, ${Math.round((project.spent/Math.max(1,project.budget))*100)}% del presupuesto ejecutado, fin planificado ${fmt(project.plannedEnd)}, proyectado ${fmt(project.forecastEnd)}.`:"Sin proyecto vinculado."].join("\n"),
  })
 }

 // R2 · Cambio en producción sin evidencia de aprobación → escala (BAI06)
 for(const change of ops.changes.filter(c=>c.deployedAt&&!c.hasApprovalEvidence&&!c.rolledBack)){
  negotiations.push({
   ruleKey:`change-without-evidence:${change.code}`,objectiveCode:"BAI06",domainCode:"BAI",severity:change.kind==="Emergencia"?"warning":"critical",
   fact:`El cambio ${change.code} «${change.title}» (${change.kind.toLowerCase()}) está en producción desde el ${fmt(change.deployedAt!)} sin evidencia de aprobación registrada.`,
   initiatorLens:"MEA",initiatorPosition:`Revertir ${change.code}: sin evidencia completa el control de cambios queda sin efecto.`,
   counterpartLens:"BAI",counterpartPosition:"El cambio es estable en producción; revertirlo introduce un riesgo operativo mayor que el de la evidencia faltante.",
   principleCode:"BAI06",outcome:"escalated",resolution:null,
   escalationReason:"BAI06 exige evidencia previa al despliegue, pero aplicarlo ahora significa revertir un cambio estable. Autorizar la excepción le corresponde al comité.",
   proposal:`Exigir evidencia retroactiva a ${change.requestedBy} en 48 horas, manteniendo ${change.code} en producción.`,
   approveLabel:"Exigir evidencia",approveImpact:`Se registra la exigencia a ${change.requestedBy} con plazo de 48 h, a nombre del comité. BAI06 seguirá contando ${change.code} como no conforme hasta que la evidencia se adjunte desde Operación → Cambios.`,
   rejectLabel:"Aceptar como excepción",rejectImpact:`${change.code} queda ratificado sin evidencia. BAI06 lo seguirá contando como no conforme y la excepción queda a tu nombre.`,
   // La firma no adjunta nada: exigir evidencia no es tenerla. Quien la tiene la adjunta.
   approveOps:[],rejectOps:[],
   openedAt:change.deployedAt!,
   evidence:[`Cambio ${change.code}: «${change.title}», tipo ${change.kind}, sobre ${serviceOf.get(change.serviceCode)?.name??change.serviceCode} (criticidad ${serviceOf.get(change.serviceCode)?.criticality??"?"}).`,
    `Solicitado el ${fmt(change.requestedAt)} por ${change.requestedBy}; desplegado el ${fmt(change.deployedAt!)}${change.windowStart&&change.windowEnd?(change.deployedAt!>=change.windowStart&&change.deployedAt!<=change.windowEnd?" dentro de ventana":" FUERA de ventana"):""}.`,
    `Evidencia de aprobación: NO registrada. Reversión: no.`,
    `Incidentes atribuidos a este cambio: ${ops.incidents.filter(i=>i.causedByChange===change.code).length}.`].join("\n"),
  })
 }

 // R3 · Última prueba de un control inefectiva → escala (MEA02)
 const latestTest=new Map<string,typeof ops.controlTests[number]>()
 for(const t of ops.controlTests){const prev=latestTest.get(t.controlCode);if(!prev||t.testedAt>prev.testedAt)latestTest.set(t.controlCode,t)}
 for(const control of ops.controls){
  const test=latestTest.get(control.code)
  if(!test){continue}
  const overdueDays=Math.floor((now.getTime()-test.testedAt.getTime())/DAY)
  if(overdueDays>control.frequencyDays*1.5)notices.push({ruleKey:`control-overdue:${control.code}`,objectiveCode:control.objectiveCode,domainCode:domainOf(control.objectiveCode),severity:"warning",lens:"MEA",
   fact:`El control ${control.code} «${control.name}» lleva ${overdueDays} días sin prueba; su frecuencia es de ${control.frequencyDays}. Nexus lo reporta antes de proponer acción.`,raisedAt:test.testedAt})
  if(test.result!=="Inefectivo")continue
  const owner=domainOf(control.objectiveCode)
  negotiations.push({
   ruleKey:`control-ineffective:${control.code}`,objectiveCode:control.objectiveCode,domainCode:owner,severity:"warning",
   fact:`La última prueba del control ${control.code} «${control.name}» (${fmt(test.testedAt)}) resultó inefectiva: ${test.evidence.toLowerCase()}.`,
   initiatorLens:"MEA",initiatorPosition:`Suspender la dependencia del control ${control.code} hasta remediarlo: hoy no protege a ${control.objectiveCode}.`,
   counterpartLens:owner==="MEA"?"DSS":owner,counterpartPosition:`El proceso sigue operando; ${control.owner} tiene la remediación en curso y suspenderlo interrumpe el servicio.`,
   principleCode:"MEA02",outcome:"escalated",resolution:null,
   escalationReason:"Un control inefectivo sobre un objetivo activo no se resuelve entre agentes: exige un compromiso del propietario que solo el comité puede reclamar.",
   proposal:`Exigir a ${control.owner} un plan de remediación con nueva prueba en 30 días.`,
   approveLabel:"Exigir remediación",approveImpact:`Se registra el compromiso de ${control.owner}. ${control.objectiveCode} se volverá a medir con la próxima prueba.`,
   rejectLabel:"Aceptar el control como está",rejectImpact:`El control queda inefectivo sin plan. ${control.objectiveCode} lo seguirá midiendo así.`,
   approveOps:[],rejectOps:[],openedAt:test.testedAt,
   evidence:[`Control ${control.code}: «${control.name}», responsable ${control.owner}, frecuencia ${control.frequencyDays} días. Protege ${control.objectiveCode}.`,
    `Última prueba el ${fmt(test.testedAt)} por ${test.testedBy}: resultado INEFECTIVO. Evidencia: ${test.evidence}.`,
    `Pruebas históricas del control: ${ops.controlTests.filter(t=>t.controlCode===control.code).length}; inefectivas: ${ops.controlTests.filter(t=>t.controlCode===control.code&&t.result==="Inefectivo").length}.`].join("\n"),
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
   initiatorLens:"DSS",initiatorPosition:`Abrir un problema y bloquear cambios en ${service.name} hasta el análisis de causa raíz.`,
   counterpartLens:"BAI",counterpartPosition:"No bloquear: hay despliegues comprometidos en la ventana de este mes.",
   principleCode:"DSS03",outcome:"resolved",
   resolution:"Problema abierto con análisis de causa raíz en 10 días; los cambios continúan con validación adicional. Cabe dentro del mandato, así que no escala.",
   escalationReason:null,proposal:null,approveLabel:null,approveImpact:null,rejectLabel:null,rejectImpact:null,approveOps:[],rejectOps:[],
   openedAt:recurring[0].openedAt,
   evidence:[`Servicio ${service.code} «${service.name}», criticidad ${service.criticality}, propietario ${service.owner}.`,
    `Incidentes recurrentes en 30 días: ${recurring.length} — ${recurring.slice(0,4).map(i=>`${i.code} (${i.severity}, ${fmt(i.openedAt)})`).join(", ")}.`,
    `Cambios desplegados en el servicio en 30 días: ${ops.changes.filter(c=>c.serviceCode===service.code&&c.deployedAt&&now.getTime()-c.deployedAt.getTime()<=30*DAY).length}.`].join("\n"),
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
   initiatorLens:"DSS",initiatorPosition:`Renegociar el acuerdo de ${service.name} a un objetivo alcanzable.`,
   counterpartLens:"APO",counterpartPosition:"Mantener el acuerdo: el compromiso con el negocio no se rebaja por un mes malo.",
   principleCode:"APO09",outcome:"resolved",
   resolution:`Acuerdo intacto; plan de mejora con el propietario (${service.owner}) revisado en el próximo periodo. Cabe dentro del mandato.`,
   escalationReason:null,proposal:null,approveLabel:null,approveImpact:null,rejectLabel:null,rejectImpact:null,approveOps:[],rejectOps:[],
   openedAt:m.periodStart,
   evidence:[`Servicio ${service.code} «${service.name}», criticidad ${service.criticality}, propietario ${service.owner}. Disponibilidad comprometida ${service.targetAvailability}%.`,
    `Último periodo (desde ${fmt(m.periodStart)}): ${m.measuredAvailability.toFixed(2)}% medido, ${m.breaches} incumplimientos.`,
    `Periodos medidos del servicio: ${ops.slaMeasurements.filter(x=>x.serviceCode===code).length}; bajo objetivo: ${ops.slaMeasurements.filter(x=>x.serviceCode===code&&x.measuredAvailability<service.targetAvailability).length}.`].join("\n"),
  })
 }

 // R6 · Evento con información corporativa involucrada, sin contener → escala de inmediato (APO13).
 // Activar un protocolo de brecha —con sus obligaciones de notificación— no lo decide un agente.
 for(const e of ops.securityEvents.filter(e=>e.dataInvolved&&!e.containedAt)){
  const hours=Math.floor((now.getTime()-e.detectedAt.getTime())/36e5)
  const related=ops.securityEvents.filter(x=>x.kind===e.kind&&x.id!==e.id&&now.getTime()-x.detectedAt.getTime()<=30*DAY).length
  negotiations.push({
   ruleKey:`security-data-exposure:${e.code}`,objectiveCode:"APO13",domainCode:"APO",severity:e.severity==="Crítica"||e.severity==="Alta"?"critical":"warning",
   fact:`El evento ${e.code} «${e.kind}» (${e.severity.toLowerCase()}) involucra información corporativa y lleva ${hours} h sin contención registrada.`,
   initiatorLens:"APO",initiatorPosition:`Activar el protocolo de brecha: contención inmediata, evaluación de la información expuesta y revisión de obligaciones de notificación.`,
   counterpartLens:"DSS",counterpartPosition:`Contener y evaluar primero: activar el protocolo antes de conocer el alcance dispara notificaciones externas sobre un evento de severidad ${e.severity.toLowerCase()} que puede no ameritarlas.`,
   principleCode:"APO13",outcome:"escalated",resolution:null,
   escalationReason:"Activar un protocolo de brecha compromete a la organización frente a terceros y reguladores; no activarlo con información expuesta deja el riesgo sin dueño. Ninguna de las dos posturas la puede tomar un agente.",
   proposal:`Ordenar la contención inmediata de ${e.code} y abrir la evaluación de alcance bajo el protocolo de brecha.`,
   approveLabel:"Activar protocolo",approveImpact:`El protocolo de brecha queda activado a nombre del comité: contención prioritaria, evaluación de alcance y revisión de notificaciones. La contención la ejecuta ${e.source} desde Operación → Seguridad; DSS05 la medirá cuando ocurra.`,
   rejectLabel:"Tratar como incidente",rejectImpact:`${e.code} se gestiona como incidente operativo sin protocolo de brecha. La decisión de no notificar queda a nombre del comité.`,
   // La firma activa el protocolo; contener es trabajo operativo y se registra desde la mesa
   approveOps:[],rejectOps:[],
   openedAt:e.detectedAt,
   evidence:[`Evento ${e.code}: «${e.kind}», severidad ${e.severity}, detectado el ${fmt(e.detectedAt)} por ${e.source}. Lleva ${hours} h sin contención.`,
    `Información corporativa involucrada: SÍ.`,
    `Eventos del mismo tipo en los últimos 30 días: ${related}. Eventos abiertos en total: ${ops.securityEvents.filter(x=>!x.containedAt).length}.`].join("\n"),
  })
 }

 // R7 · Evento crítico o alto sin contener más de 24 h → escala (DSS05)
 for(const e of ops.securityEvents.filter(e=>!e.containedAt&&!e.dataInvolved&&(e.severity==="Crítica"||e.severity==="Alta")&&now.getTime()-e.detectedAt.getTime()>DAY)){
  const hours=Math.floor((now.getTime()-e.detectedAt.getTime())/36e5)
  negotiations.push({
   ruleKey:`security-uncontained-critical:${e.code}`,objectiveCode:"DSS05",domainCode:"DSS",severity:"critical",
   fact:`El evento ${e.code} «${e.kind}» (${e.severity.toLowerCase()}) lleva ${hours} h sin contención registrada.`,
   initiatorLens:"DSS",initiatorPosition:`Aislar el activo afectado ahora aunque interrumpa el servicio: ${hours} h sin contener un evento ${e.severity.toLowerCase()} es inaceptable.`,
   counterpartLens:"BAI",counterpartPosition:"Aislar sin ventana rompe cambios en curso y compromisos con el negocio; la contención debe entrar por una ventana de emergencia coordinada.",
   principleCode:"DSS05",outcome:"escalated",resolution:null,
   escalationReason:"Interrumpir un servicio para contener, o aceptar horas adicionales de exposición, son costos que el mandato no asigna a ningún agente.",
   proposal:`Autorizar la contención inmediata de ${e.code} fuera de ventana.`,
   approveLabel:"Autorizar contención",approveImpact:`Queda autorizada la contención de ${e.code} fuera de ventana, asumiendo el impacto sobre cambios en curso. Operación la ejecuta desde Seguridad; DSS05 la medirá cuando ocurra.`,
   rejectLabel:"Esperar ventana",rejectImpact:`${e.code} sigue expuesto hasta la próxima ventana de emergencia; la exposición adicional queda a nombre del comité.`,
   approveOps:[],rejectOps:[],
   openedAt:e.detectedAt,
   evidence:[`Evento ${e.code}: «${e.kind}», severidad ${e.severity}, detectado el ${fmt(e.detectedAt)} por ${e.source}. ${hours} h sin contención.`,
    `Sin información corporativa involucrada.`,
    `Eventos abiertos en total: ${ops.securityEvents.filter(x=>!x.containedAt).length}; contenidos en los últimos 30 días: ${ops.securityEvents.filter(x=>x.containedAt&&now.getTime()-x.detectedAt.getTime()<=30*DAY).length}.`].join("\n"),
  })
 }

 // N · Eventos medios o bajos sin contener por más de 48 h: aviso, no decisión
 for(const e of ops.securityEvents.filter(e=>!e.containedAt&&!e.dataInvolved&&e.severity!=="Crítica"&&e.severity!=="Alta"&&now.getTime()-e.detectedAt.getTime()>2*DAY)){
  notices.push({ruleKey:`security-uncontained:${e.code}`,objectiveCode:"DSS05",domainCode:"DSS",severity:"warning",lens:"DSS",
   fact:`El evento ${e.code} «${e.kind}» (${e.severity.toLowerCase()}) lleva ${Math.floor((now.getTime()-e.detectedAt.getTime())/DAY)} días sin contención registrada.`,raisedAt:e.detectedAt})
 }

 return {negotiations,notices}
}

export async function loadOperationalData():Promise<OperationalData>{
 const db=getDb()
 const [incidents,changes,risks,projects,securityEvents,controlTests,services,controls,suppliers,slaMeasurements,supplierEvaluations]=await Promise.all([
  db.select().from(schema.incidents),db.select().from(schema.changes),db.select().from(schema.risks),db.select().from(schema.projects),
  db.select().from(schema.securityEvents),db.select().from(schema.controlTests),db.select().from(schema.services),db.select().from(schema.controls),db.select().from(schema.suppliers),
  db.select().from(schema.slaMeasurements),db.select().from(schema.supplierEvaluations),
 ])
 return {incidents,changes,risks,projects,securityEvents,controlTests,services,controls,suppliers,slaMeasurements,supplierEvaluations}
}

// Reevalúa las reglas, hace que Nexus delibere lo nuevo, y sincroniza
// la tabla: crea, actualiza el hecho de las vigentes y retira las que ya no tienen
// sustento y nadie firmó. Deja traza de cada corrida.
export type SyncEvent = { kind:typeof schema.nexusEvents.$inferInsert["kind"]; actor:string; ruleKey?:string; objectiveCode?:string; summary:string; at?:Date }

export async function syncGovernanceSignals(){
 const started=Date.now()
 const db=getDb()
 const events:SyncEvent[]=[]
 const short=(t:string,n=220)=>t.length>n?t.slice(0,n-1)+"…":t
 const [mandate]=await db.select().from(schema.designProfiles).orderBy(desc(schema.designProfiles.appliedAt)).limit(1)
 const appetite=mandate?.riskAppetite??3.5
 const mandateName=mandate?.name??"Sin mandato aplicado"
 const [ops,lensRows,objectiveRows]=await Promise.all([loadOperationalData(),db.select().from(schema.lenses),db.select({code:schema.objectives.code,name:schema.objectives.name}).from(schema.objectives)])
 const lensOf=new Map<string,Lens>(lensRows.map(l=>[l.code,{code:l.code,name:l.name,mandate:l.mandate}]))
 const objectiveName=new Map(objectiveRows.map(o=>[o.code,o.name]))
 const {negotiations,notices}=evaluateRules(ops,appetite)

 const signed=new Set((await db.select({id:schema.decisions.negotiationId}).from(schema.decisions)).map(d=>d.id))
 const existing=await db.select({id:schema.negotiations.id,ruleKey:schema.negotiations.ruleKey,factsHash:schema.negotiations.factsHash,authoredBy:schema.negotiations.authoredBy}).from(schema.negotiations)
 const existingByKey=new Map(existing.map(n=>[n.ruleKey,n]))
 const canAuthor=modelAvailable()
 let authored=0

 // Solo se delibera lo nuevo o lo que cambió de hechos; el resto conserva su texto.
 const work=negotiations.map(n=>{
  const prev=existingByKey.get(n.ruleKey)
  const factsHash=createHash("md5").update(`${PROMPT_VERSION}|${n.evidence}|${n.outcome}|${appetite}`).digest("hex").slice(0,32)
  const needsAuthoring=!prev||prev.factsHash!==factsHash||(prev.authoredBy==="rule"&&canAuthor)
  return {n,prev,factsHash,needsAuthoring:needsAuthoring&&!(prev&&signed.has(prev.id))}
 })
 // Secuencial y con tope por corrida: el plan gratuito de Groq permite ~8k tokens
 // por minuto y cada deliberación consume ~2k. Lo que no entra se redacta en la
 // siguiente evaluación; mientras tanto conserva la plantilla de la regla.
 const AUTHORING_BATCH=Number(process.env.AUTHORING_BATCH??3)
 for(const w of work.filter(w=>!w.prev))events.push({at:new Date(),kind:"rule.fired",actor:"REGLA",ruleKey:w.n.ruleKey,objectiveCode:w.n.objectiveCode,summary:`${w.n.ruleKey.split(":")[0]} detectó en ${w.n.objectiveCode}: ${short(w.n.fact)}`})
 const queue=work.filter(w=>w.needsAuthoring).sort((a,b)=>(a.prev?1:0)-(b.prev?1:0)).slice(0,canAuthor?AUTHORING_BATCH:0)
 for(const w of work.filter(w=>w.needsAuthoring&&!queue.includes(w)))events.push({at:new Date(),kind:"authoring.deferred",actor:"NEXUS",ruleKey:w.n.ruleKey,objectiveCode:w.n.objectiveCode,summary:`${w.n.ruleKey} queda con la plantilla de la regla; Nexus la deliberará en la siguiente evaluación (tope de ${AUTHORING_BATCH} por corrida).`})
 const results=new Map<string,Awaited<ReturnType<typeof deliberate>>>()
 for(const w of queue){
  await (async()=>{
   const {n}=w
   const authoredText=await deliberate({
    ruleKey:n.ruleKey,outcome:n.outcome,objectiveCode:n.objectiveCode,principleCode:n.principleCode,principleName:objectiveName.get(n.principleCode)??"",
    evidence:n.evidence,riskAppetite:appetite,mandateName,
    initiator:lensOf.get(n.initiatorLens)??{code:n.initiatorLens,name:lensName[n.initiatorLens],mandate:""},
    counterpart:lensOf.get(n.counterpartLens)??{code:n.counterpartLens,name:lensName[n.counterpartLens],mandate:""},
    approveOps:n.approveOps,rejectOps:n.rejectOps,
    template:{initiatorPosition:n.initiatorPosition,counterpartPosition:n.counterpartPosition,resolution:n.resolution,escalationReason:n.escalationReason,proposal:n.proposal,approveLabel:n.approveLabel,approveImpact:n.approveImpact,rejectLabel:n.rejectLabel,rejectImpact:n.rejectImpact},
   })
   if(authoredText.authoredBy==="model"){
    authored++
    events.push({at:new Date(),kind:"nexus.argued",actor:n.initiatorLens,ruleKey:n.ruleKey,objectiveCode:n.objectiveCode,summary:short(authoredText.initiatorPosition)})
    events.push({at:new Date(),kind:"nexus.argued",actor:n.counterpartLens,ruleKey:n.ruleKey,objectiveCode:n.objectiveCode,summary:short(authoredText.counterpartPosition)})
    events.push({at:new Date(),kind:"nexus.concluded",actor:"NEXUS",ruleKey:n.ruleKey,objectiveCode:n.objectiveCode,summary:n.outcome==="resolved"?`Consenso dentro del mandato: ${short(authoredText.resolution??"")}`:`Sin consenso posible: ${short(authoredText.escalationReason??"")} → escala al comité.`})
   }else events.push({at:new Date(),kind:"authoring.deferred",actor:"NEXUS",ruleKey:n.ruleKey,objectiveCode:n.objectiveCode,summary:`No se pudo deliberar con el modelo; ${n.ruleKey} usa la plantilla de la regla.`})
   results.set(n.ruleKey,authoredText)
  })()
 }

 for(const {n,prev,factsHash,needsAuthoring} of work){
  if(prev&&signed.has(prev.id))continue // lo firmado no se reescribe
  const {evidence:_evidence,...row}=n
  const a=results.get(n.ruleKey)
  if(needsAuthoring&&!a&&!prev){
   // Nueva pero fuera del tope de esta corrida: entra con plantilla y se redactará después
   await db.insert(schema.negotiations).values({...row,factsHash,authoredBy:"rule",authoringModel:null}).onConflictDoNothing()
   continue
  }
  if(needsAuthoring&&a){
   const values={...row,initiatorPosition:a.initiatorPosition,counterpartPosition:a.counterpartPosition,resolution:a.resolution,escalationReason:a.escalationReason,proposal:a.proposal,approveLabel:a.approveLabel,approveImpact:a.approveImpact,rejectLabel:a.rejectLabel,rejectImpact:a.rejectImpact,authoredBy:a.authoredBy,authoringModel:a.authoringModel,factsHash}
   await db.insert(schema.negotiations).values(values).onConflictDoUpdate({target:schema.negotiations.ruleKey,set:values})
  }else{
   // Hechos sin cambio: se refresca lo estructural y se conserva la redacción
   await db.insert(schema.negotiations).values({...row,factsHash}).onConflictDoUpdate({target:schema.negotiations.ruleKey,set:{severity:row.severity,fact:row.fact,approveOps:row.approveOps,rejectOps:row.rejectOps,openedAt:row.openedAt}})
  }
 }
 const liveKeys=new Set(negotiations.map(n=>n.ruleKey))
 const staleRows=existing.filter(n=>!liveKeys.has(n.ruleKey)&&!signed.has(n.id))
 const stale=staleRows.map(n=>n.id)
 for(const n of staleRows)events.push({at:new Date(),kind:"negotiation.retired",actor:"NEXUS",ruleKey:n.ruleKey,summary:`El hecho que sostenía ${n.ruleKey} se corrigió: la discrepancia se retira sin llegar al comité.`})
 if(stale.length>0)await db.delete(schema.negotiations).where(inArray(schema.negotiations.id,stale))

 for(const n of notices)await db.insert(schema.notices).values(n).onConflictDoUpdate({target:schema.notices.ruleKey,set:{...n}})
 const liveNoticeKeys=notices.map(n=>n.ruleKey)
 if(liveNoticeKeys.length>0)await db.delete(schema.notices).where(notInArray(schema.notices.ruleKey,liveNoticeKeys))
 else await db.delete(schema.notices)

 const summary={negotiations:negotiations.length,escalated:negotiations.filter(n=>n.outcome==="escalated").length,resolved:negotiations.filter(n=>n.outcome==="resolved").length,notices:notices.length,retired:stale.length,authored}
 const [evaluation]=await db.insert(schema.governanceEvaluations).values({...summary,mandate:mandateName,riskAppetite:appetite,authoringModel:canAuthor?activeModel():null,durationMs:Date.now()-started}).returning({id:schema.governanceEvaluations.id})
 events.push({at:new Date(),kind:"evaluation.completed",actor:"NEXUS",summary:`Evaluación bajo «${mandateName}» (apetito ${appetite.toFixed(1)}): ${summary.negotiations} discrepancias, ${summary.escalated} escaladas, ${summary.resolved} resueltas, ${summary.retired} retiradas, ${summary.authored} deliberadas con modelo · ${Date.now()-started} ms.`})
 if(events.length>0)await db.insert(schema.nexusEvents).values(events.map(e=>({...e,at:e.at??new Date(),evaluationId:evaluation.id})))
 return {...summary,events}
}
