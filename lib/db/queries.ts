import { asc,desc } from "drizzle-orm"
import { deriveMeasures,measurementCoverage } from "../governance-metrics"
import { buildOperationsView } from "./operations-view"
import type { AgentView,AiSystemView,CoverageView,DecisionView,DesignFactorView,DesignProfileView,DomainCode,DomainView,GovernanceData,MeasureView,NegotiationView,NoticeView,ObjectiveView } from "../types"
import { getDb } from "./index"
import * as schema from "./schema"

const TZ = "America/Lima"

function relativeTime(date:Date){
 const minutes=Math.max(0,Math.round((Date.now()-date.getTime())/60_000))
 if(minutes<1)return "hace instantes"
 if(minutes<60)return `hace ${minutes} min`
 const hours=Math.round(minutes/60)
 if(hours<24)return `hace ${hours} h`
 return `hace ${Math.round(hours/24)} d`
}
function clockTime(date:Date){return date.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit",timeZone:TZ})}

export async function loadGovernanceData():Promise<GovernanceData>{
 const db=getDb()
 const [domainRows,objectiveRows,agentRows,negotiationRows,noticeRows,decisionRows,aiRows,factorRows,valueRows,weightRows,profileRows,incidents,changes,risks,projects,securityEvents,controlTests,services,controls,suppliers,slaMeasurements,supplierEvaluations]=await Promise.all([
  db.select().from(schema.domains).orderBy(asc(schema.domains.code)),
  db.select().from(schema.objectives).orderBy(asc(schema.objectives.code)),
  db.select().from(schema.agents).orderBy(asc(schema.agents.code)),
  db.select().from(schema.negotiations).orderBy(desc(schema.negotiations.openedAt)),
  db.select().from(schema.notices).orderBy(desc(schema.notices.raisedAt)),
  db.select().from(schema.decisions).orderBy(desc(schema.decisions.decidedAt)),
  db.select().from(schema.aiSystems).orderBy(asc(schema.aiSystems.id)),
  db.select().from(schema.designFactors).orderBy(asc(schema.designFactors.displayOrder)),
  db.select().from(schema.designFactorValues).orderBy(asc(schema.designFactorValues.displayOrder)),
  db.select().from(schema.designFactorWeights),
  db.select().from(schema.designProfiles).orderBy(desc(schema.designProfiles.appliedAt)).limit(1),
  // Capa operativa: la evidencia de la que se derivan los objetivos medidos
  db.select().from(schema.incidents),
  db.select().from(schema.changes),
  db.select().from(schema.risks),
  db.select().from(schema.projects),
  db.select().from(schema.securityEvents),
  db.select().from(schema.controlTests),
  db.select().from(schema.services),
  db.select().from(schema.controls),
  db.select().from(schema.suppliers),
  db.select().from(schema.slaMeasurements),
  db.select().from(schema.supplierEvaluations),
 ])

 const order:DomainCode[]=["EDM","APO","BAI","DSS","MEA"]
 const domains:DomainView[]=domainRows.map(d=>({code:d.code as DomainCode,name:d.name,baseScore:d.baseScore,trend:d.trend,targetMaturity:d.targetMaturity}))
  .sort((a,b)=>order.indexOf(a.code)-order.indexOf(b.code))

 const profile=profileRows[0]
 const riskAppetite=profile?.riskAppetite??3.5
 const operational={incidents,changes,risks,projects,securityEvents,controlTests,services,controls,suppliers,slaMeasurements,supplierEvaluations}
 const measured=deriveMeasures(operational,riskAppetite)
 const measureOf=new Map<string,MeasureView>(measured.map(m=>[m.objective,{score:m.score,metric:m.metric,evidence:m.evidence,sample:m.sample}]))
 // MEA01 se mide con la propia cobertura: cuánto del sistema de gobierno está medido
 const coverageRaw=measurementCoverage(measured,objectiveRows.length)
 measureOf.set("MEA01",{score:coverageRaw.score,metric:"Cobertura de medición del sistema de gobierno",evidence:`${coverageRaw.covered} de ${coverageRaw.total} objetivos se derivan de evidencia operativa`,sample:coverageRaw.covered})
 const coverage:CoverageView={covered:measureOf.size,total:objectiveRows.length,score:Math.round((measureOf.size/objectiveRows.length)*100)}
 const objectives:ObjectiveView[]=objectiveRows.map(o=>{const measure=measureOf.get(o.code)??null;return {code:o.code,name:o.name,domain:o.domainCode as DomainCode,baseScore:o.baseScore,score:measure?measure.score:o.baseScore,measure,agent:o.agent,history:o.history}})
 const agents:AgentView[]=agentRows.map(a=>({code:a.code,name:a.name,status:a.status,action:a.action,watched:a.watched,activity:a.activity}))
 const agentName=new Map(agents.map(a=>[a.code,a.name]))
 const objectiveName=new Map(objectives.map(o=>[o.code,o.name]))
 const negotiations:NegotiationView[]=negotiationRows.map(n=>({
  id:n.id,objective:n.objectiveCode,domain:n.domainCode as DomainCode,severity:n.severity,fact:n.fact,
  initiatorAgent:n.initiatorAgent,initiatorName:agentName.get(n.initiatorAgent)??n.initiatorAgent,initiatorPosition:n.initiatorPosition,
  counterpartAgent:n.counterpartAgent,counterpartName:agentName.get(n.counterpartAgent)??n.counterpartAgent,counterpartPosition:n.counterpartPosition,
  principle:n.principleCode,principleName:objectiveName.get(n.principleCode)??"",
  outcome:n.outcome,resolution:n.resolution,escalationReason:n.escalationReason,proposal:n.proposal,
  // El delta es opcional: en las negociaciones generadas por reglas el efecto lo
  // produce la operación de la rama, no un número.
  approve:n.approveLabel&&n.approveImpact?{label:n.approveLabel,impact:n.approveImpact,delta:n.approveDelta??0}:null,
  reject:n.rejectLabel&&n.rejectImpact?{label:n.rejectLabel,impact:n.rejectImpact,delta:n.rejectDelta??0}:null,
  time:relativeTime(n.openedAt),
 }))
 const notices:NoticeView[]=noticeRows.map(n=>({id:n.id,objective:n.objectiveCode,domain:n.domainCode as DomainCode,severity:n.severity,agent:n.agent,fact:n.fact,time:relativeTime(n.raisedAt)}))
 const decisions:DecisionView[]=decisionRows.map(r=>({negotiationId:r.negotiationId,objective:r.objectiveCode,domain:r.domainCode as DomainCode,agent:r.agent,verdict:r.verdict,label:r.label,impact:r.impact,delta:r.delta,decidedBy:r.decidedBy,at:clockTime(r.decidedAt)}))
 const aiSystems:AiSystemView[]=aiRows.map(s=>({id:s.id,name:s.name,area:s.area,description:s.description,risk:s.risk,status:s.status,controls:s.controls,acceptedControls:s.acceptedControls,assessed:s.assessedAt!==null}))

 const weightsByValue=new Map<string,Record<string,number>>()
 for(const w of weightRows){const bucket=weightsByValue.get(w.valueId)??{};bucket[w.objectiveCode]=w.weight;weightsByValue.set(w.valueId,bucket)}
 const designFactors:DesignFactorView[]=factorRows.map(f=>({code:f.code,name:f.name,description:f.description,input:f.input,
  values:valueRows.filter(v=>v.factorCode===f.code).map(v=>({id:v.id,key:v.valueKey,label:v.label,weights:weightsByValue.get(v.id)??{}}))}))
 const activeProfile:DesignProfileView|null=profile?{id:profile.id,name:profile.name,inputs:profile.inputs,riskAppetite:profile.riskAppetite,appliedBy:profile.appliedBy,appliedAt:`${profile.appliedAt.toLocaleDateString("es-PE",{day:"2-digit",month:"short",timeZone:TZ})} · ${clockTime(profile.appliedAt)}`}:null

 const operations=buildOperationsView(operational,new Map(objectiveRows.map(o=>[o.code,o.name])),riskAppetite)

 return {domains,objectives,agents,negotiations,notices,decisions,aiSystems,designFactors,activeProfile,coverage,operations}
}
