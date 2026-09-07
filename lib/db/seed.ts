import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { isNull,sql } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { agents as seedAgents,aiSystems as seedAiSystems,domains as seedDomains,negotiations as seedNegotiations,notices as seedNotices,objectives as seedObjectives } from "../mock-data"
import * as schema from "./schema"

const url=process.env.DATABASE_URL
if(!url){console.error("Falta DATABASE_URL. Créala en .env.local antes de sembrar.");process.exit(1)}
const db=drizzle(neon(url),{schema})

// Referencia a la fila entrante dentro de un ON CONFLICT DO UPDATE
const sqlExcluded=(column:string)=>sql.raw(`excluded.${column}`)

// "hace 4 min" / "hace 1 h" -> instante absoluto, para que la UI calcule el tiempo relativo real
function raisedAt(label:string){
 const match=label.match(/(\d+)\s*(min|h)/)
 const minutes=match?Number(match[1])*(match[2]==="h"?60:1):0
 return new Date(Date.now()-minutes*60_000)
}

async function main(){
 await db.insert(schema.domains).values(seedDomains.map(d=>({code:d.code,name:d.name,baseScore:d.score,trend:d.trend,targetMaturity:d.target})))
  .onConflictDoUpdate({target:schema.domains.code,set:{name:sqlExcluded("name"),baseScore:sqlExcluded("base_score"),trend:sqlExcluded("trend"),targetMaturity:sqlExcluded("target_maturity")}})
 console.log(`✓ ${seedDomains.length} dominios`)

 await db.insert(schema.objectives).values(seedObjectives.map(o=>({code:o.code,name:o.name,domainCode:o.domain,baseScore:o.score,agent:o.agent,history:o.history})))
  .onConflictDoUpdate({target:schema.objectives.code,set:{name:sqlExcluded("name"),baseScore:sqlExcluded("base_score"),agent:sqlExcluded("agent"),history:sqlExcluded("history")}})
 console.log(`✓ ${seedObjectives.length} objetivos COBIT`)

 await db.insert(schema.agents).values(seedAgents.map(a=>({code:a.domain,name:a.name,status:a.status,action:a.action,watched:a.count,activity:a.data})))
  .onConflictDoUpdate({target:schema.agents.code,set:{name:sqlExcluded("name"),status:sqlExcluded("status"),action:sqlExcluded("action"),watched:sqlExcluded("watched"),activity:sqlExcluded("activity")}})
 console.log(`✓ ${seedAgents.length} agentes`)

 await db.insert(schema.negotiations).values(seedNegotiations.map(n=>({id:n.id,objectiveCode:n.objective,domainCode:n.domain,severity:n.severity,fact:n.fact,initiatorAgent:n.initiator,initiatorPosition:n.initiatorPosition,counterpartAgent:n.counterpart,counterpartPosition:n.counterpartPosition,principleCode:n.principle,outcome:n.outcome,resolution:n.resolution??null,escalationReason:n.escalationReason??null,proposal:n.proposal??null,approveLabel:n.approve?.label??null,approveImpact:n.approve?.impact??null,approveDelta:n.approve?.delta??null,rejectLabel:n.reject?.label??null,rejectImpact:n.reject?.impact??null,rejectDelta:n.reject?.delta??null,openedAt:raisedAt(n.time)})))
  .onConflictDoUpdate({target:schema.negotiations.id,set:{fact:sqlExcluded("fact"),initiatorPosition:sqlExcluded("initiator_position"),counterpartPosition:sqlExcluded("counterpart_position"),principleCode:sqlExcluded("principle_code"),outcome:sqlExcluded("outcome"),resolution:sqlExcluded("resolution"),escalationReason:sqlExcluded("escalation_reason"),proposal:sqlExcluded("proposal"),approveLabel:sqlExcluded("approve_label"),approveImpact:sqlExcluded("approve_impact"),approveDelta:sqlExcluded("approve_delta"),rejectLabel:sqlExcluded("reject_label"),rejectImpact:sqlExcluded("reject_impact"),rejectDelta:sqlExcluded("reject_delta")}})
 console.log(`✓ ${seedNegotiations.length} negociaciones (${seedNegotiations.filter(n=>n.outcome==="escalated").length} escaladas al comité, ${seedNegotiations.filter(n=>n.outcome==="resolved").length} resueltas entre agentes)`)

 await db.insert(schema.notices).values(seedNotices.map(n=>({id:n.id,objectiveCode:n.objective,domainCode:n.domain,severity:n.severity,agent:n.agent,fact:n.fact,raisedAt:raisedAt(n.time)})))
  .onConflictDoUpdate({target:schema.notices.id,set:{fact:sqlExcluded("fact"),agent:sqlExcluded("agent")}})
 console.log(`✓ ${seedNotices.length} avisos informativos`)

 // Un sistema "Aprobado" solo es coherente si el comité aceptó sus controles en algún momento
 const assessedAt=new Date(Date.now()-7*24*60*60_000)
 await db.insert(schema.aiSystems).values(seedAiSystems.map(s=>({name:s.name,area:s.area,description:s.desc,risk:s.risk,status:s.status,controls:s.controls,acceptedControls:s.status==="Aprobado"?s.controls:[],assessedAt:s.status==="Aprobado"?assessedAt:null})))
  .onConflictDoUpdate({target:schema.aiSystems.name,set:{area:sqlExcluded("area"),description:sqlExcluded("description"),risk:sqlExcluded("risk"),status:sqlExcluded("status"),controls:sqlExcluded("controls"),acceptedControls:sqlExcluded("accepted_controls"),assessedAt:sqlExcluded("assessed_at")},setWhere:isNull(schema.aiSystems.assessedAt)})
 console.log(`✓ ${seedAiSystems.length} sistemas de IA`)
}

main().then(()=>{console.log("\nSemilla completa.");process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})
