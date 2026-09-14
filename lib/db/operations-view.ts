import { residualOf,type OperationalData } from "../governance-metrics"
import type { ChangeView,ControlView,IncidentView,OperationsView,ProjectView,RiskView,SecurityEventView,ServiceView,SupplierView } from "../types"

const TZ="America/Lima"
const DAY=24*60*60_000
const label=(d:Date)=>d.toLocaleString("es-PE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",timeZone:TZ})
const dayLabel=(d:Date)=>d.toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric",timeZone:TZ})

// Convierte las filas operativas en modelos listos para la mesa de trabajo, con
// todo lo derivado (SLA cumplido, residual, atraso, vencimiento) calculado aquí.
export function buildOperationsView(ops:OperationalData,objectiveNames:Map<string,string>,riskAppetite:number,now:Date=new Date()):OperationsView{
 const serviceOf=new Map(ops.services.map(s=>[s.code,s]))
 const projectOf=new Map(ops.projects.map(p=>[p.code,p]))

 const incidents:IncidentView[]=ops.incidents.map(i=>{
  const service=serviceOf.get(i.serviceCode)
  const slaMinutes=service?(i.severity==="Crítica"?service.slaCriticalMinutes:service.slaHighMinutes):0
  const durationMinutes=i.resolvedAt?Math.round((i.resolvedAt.getTime()-i.openedAt.getTime())/60_000):null
  return {id:i.id,code:i.code,title:i.title,serviceCode:i.serviceCode,serviceName:service?.name??i.serviceCode,severity:i.severity,
   openedAt:i.openedAt.toISOString(),openedLabel:label(i.openedAt),resolvedAt:i.resolvedAt?.toISOString()??null,resolvedLabel:i.resolvedAt?label(i.resolvedAt):null,
   durationMinutes,slaMinutes,slaMet:durationMinutes===null?null:durationMinutes<=slaMinutes,causedByChange:i.causedByChange,recurring:i.recurring,reportedBy:i.reportedBy}
 }).sort((a,b)=>b.openedAt.localeCompare(a.openedAt))

 const changes:ChangeView[]=ops.changes.map(c=>{
  const service=serviceOf.get(c.serviceCode)
  const insideWindow=c.deployedAt&&c.windowStart&&c.windowEnd?c.deployedAt>=c.windowStart&&c.deployedAt<=c.windowEnd:null
  return {id:c.id,code:c.code,title:c.title,serviceCode:c.serviceCode,serviceName:service?.name??c.serviceCode,kind:c.kind,requestedLabel:label(c.requestedAt),
   windowLabel:c.windowStart&&c.windowEnd?`${label(c.windowStart)} → ${c.windowEnd.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit",timeZone:TZ})}`:null,
   deployedLabel:c.deployedAt?label(c.deployedAt):null,deployed:!!c.deployedAt,insideWindow,hasApprovalEvidence:c.hasApprovalEvidence,rolledBack:c.rolledBack,requestedBy:c.requestedBy}
 }).sort((a,b)=>b.id-a.id)

 const risks:RiskView[]=ops.risks.map(r=>{
  const residual=residualOf(r)
  return {id:r.id,code:r.code,title:r.title,category:r.category,projectCode:r.projectCode,projectName:r.projectCode?projectOf.get(r.projectCode)?.name??null:null,
   impact:r.impact,likelihood:r.likelihood,residual,mitigationsPlanned:r.mitigationsPlanned,mitigationsDone:r.mitigationsDone,owner:r.owner,status:r.status,
   raisedLabel:dayLabel(r.raisedAt),overAppetite:r.status==="Abierto"&&residual>riskAppetite}
 }).sort((a,b)=>b.residual-a.residual)

 const projects:ProjectView[]=ops.projects.map(p=>({id:p.id,code:p.code,name:p.name,sponsor:p.sponsor,budget:p.budget,spent:p.spent,spentPct:Math.round((p.spent/Math.max(1,p.budget))*100),
  startedLabel:dayLabel(p.startedAt),plannedEnd:p.plannedEnd.toISOString(),plannedEndLabel:dayLabel(p.plannedEnd),forecastEnd:p.forecastEnd.toISOString(),forecastEndLabel:dayLabel(p.forecastEnd),
  delayDays:Math.round((p.forecastEnd.getTime()-p.plannedEnd.getTime())/DAY),status:p.status}))

 const securityEvents:SecurityEventView[]=ops.securityEvents.map(e=>({id:e.id,code:e.code,kind:e.kind,severity:e.severity,detectedLabel:label(e.detectedAt),
  containedLabel:e.containedAt?label(e.containedAt):null,contained:!!e.containedAt,hoursToContain:e.containedAt?Math.round((e.containedAt.getTime()-e.detectedAt.getTime())/36e5):null,
  dataInvolved:e.dataInvolved,source:e.source})).sort((a,b)=>b.id-a.id)

 const controls:ControlView[]=ops.controls.map(c=>{
  const tests=ops.controlTests.filter(t=>t.controlCode===c.code).sort((a,b)=>b.testedAt.getTime()-a.testedAt.getTime())
  const last=tests[0]
  const daysSinceTest=last?Math.floor((now.getTime()-last.testedAt.getTime())/DAY):null
  return {code:c.code,name:c.name,objectiveCode:c.objectiveCode,objectiveName:objectiveNames.get(c.objectiveCode)??"",owner:c.owner,frequencyDays:c.frequencyDays,
   lastTest:last?{result:last.result,testedLabel:dayLabel(last.testedAt),evidence:last.evidence,testedBy:last.testedBy}:null,
   daysSinceTest,overdue:daysSinceTest===null||daysSinceTest>c.frequencyDays,
   tests:tests.slice(0,8).map(t=>({result:t.result,testedLabel:dayLabel(t.testedAt),evidence:t.evidence,testedBy:t.testedBy}))}
 })

 const services:ServiceView[]=ops.services.map(s=>{
  const latest=ops.slaMeasurements.filter(m=>m.serviceCode===s.code).sort((a,b)=>b.periodStart.getTime()-a.periodStart.getTime())[0]
  return {code:s.code,name:s.name,criticality:s.criticality,owner:s.owner,targetAvailability:s.targetAvailability,slaCriticalMinutes:s.slaCriticalMinutes,slaHighMinutes:s.slaHighMinutes,
   latestAvailability:latest?.measuredAvailability??null,latestBreaches:latest?.breaches??null,latestPeriodLabel:latest?dayLabel(latest.periodStart):null,
   openIncidents:ops.incidents.filter(i=>i.serviceCode===s.code&&!i.resolvedAt).length}
 })

 const suppliers:SupplierView[]=ops.suppliers.map(s=>{
  const latest=ops.supplierEvaluations.filter(e=>e.supplierCode===s.code).sort((a,b)=>b.evaluatedAt.getTime()-a.evaluatedAt.getTime())[0]
  return {code:s.code,name:s.name,criticality:s.criticality,service:s.service,contractEndLabel:dayLabel(s.contractEnd),contractDaysLeft:Math.round((s.contractEnd.getTime()-now.getTime())/DAY),
   latestCompliance:latest?.slaCompliance??null,latestFindings:latest?.findings??null,latestEvaluatedLabel:latest?dayLabel(latest.evaluatedAt):null}
 })

 return {incidents,changes,risks,projects,securityEvents,controls,services,suppliers,riskAppetite}
}
