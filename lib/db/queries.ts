import { asc,desc } from "drizzle-orm"
import type { AgentView,AiSystemView,DecisionView,DomainCode,DomainView,GovernanceData,NegotiationView,NoticeView,ObjectiveView } from "../types"
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
 const [domainRows,objectiveRows,agentRows,negotiationRows,noticeRows,decisionRows,aiRows]=await Promise.all([
  db.select().from(schema.domains).orderBy(asc(schema.domains.code)),
  db.select().from(schema.objectives).orderBy(asc(schema.objectives.code)),
  db.select().from(schema.agents).orderBy(asc(schema.agents.code)),
  db.select().from(schema.negotiations).orderBy(desc(schema.negotiations.openedAt)),
  db.select().from(schema.notices).orderBy(desc(schema.notices.raisedAt)),
  db.select().from(schema.decisions).orderBy(desc(schema.decisions.decidedAt)),
  db.select().from(schema.aiSystems).orderBy(asc(schema.aiSystems.id)),
 ])

 const order:DomainCode[]=["EDM","APO","BAI","DSS","MEA"]
 const domains:DomainView[]=domainRows.map(d=>({code:d.code as DomainCode,name:d.name,baseScore:d.baseScore,trend:d.trend,targetMaturity:d.targetMaturity}))
  .sort((a,b)=>order.indexOf(a.code)-order.indexOf(b.code))

 const objectives:ObjectiveView[]=objectiveRows.map(o=>({code:o.code,name:o.name,domain:o.domainCode as DomainCode,baseScore:o.baseScore,agent:o.agent,history:o.history}))
 const agents:AgentView[]=agentRows.map(a=>({code:a.code,name:a.name,status:a.status,action:a.action,watched:a.watched,activity:a.activity}))
 const agentName=new Map(agents.map(a=>[a.code,a.name]))
 const objectiveName=new Map(objectives.map(o=>[o.code,o.name]))
 const negotiations:NegotiationView[]=negotiationRows.map(n=>({
  id:n.id,objective:n.objectiveCode,domain:n.domainCode as DomainCode,severity:n.severity,fact:n.fact,
  initiatorAgent:n.initiatorAgent,initiatorName:agentName.get(n.initiatorAgent)??n.initiatorAgent,initiatorPosition:n.initiatorPosition,
  counterpartAgent:n.counterpartAgent,counterpartName:agentName.get(n.counterpartAgent)??n.counterpartAgent,counterpartPosition:n.counterpartPosition,
  principle:n.principleCode,principleName:objectiveName.get(n.principleCode)??"",
  outcome:n.outcome,resolution:n.resolution,escalationReason:n.escalationReason,proposal:n.proposal,
  approve:n.approveLabel&&n.approveImpact&&n.approveDelta!==null?{label:n.approveLabel,impact:n.approveImpact,delta:n.approveDelta}:null,
  reject:n.rejectLabel&&n.rejectImpact&&n.rejectDelta!==null?{label:n.rejectLabel,impact:n.rejectImpact,delta:n.rejectDelta}:null,
  time:relativeTime(n.openedAt),
 }))
 const notices:NoticeView[]=noticeRows.map(n=>({id:n.id,objective:n.objectiveCode,domain:n.domainCode as DomainCode,severity:n.severity,agent:n.agent,fact:n.fact,time:relativeTime(n.raisedAt)}))
 const decisions:DecisionView[]=decisionRows.map(r=>({negotiationId:r.negotiationId,objective:r.objectiveCode,domain:r.domainCode as DomainCode,agent:r.agent,verdict:r.verdict,label:r.label,impact:r.impact,delta:r.delta,decidedBy:r.decidedBy,at:clockTime(r.decidedAt)}))
 const aiSystems:AiSystemView[]=aiRows.map(s=>({id:s.id,name:s.name,area:s.area,description:s.description,risk:s.risk,status:s.status,controls:s.controls,acceptedControls:s.acceptedControls,assessed:s.assessedAt!==null}))

 return {domains,objectives,agents,negotiations,notices,decisions,aiSystems}
}
