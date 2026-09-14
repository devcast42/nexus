import { clampScore } from "./score"
import type { DecisionView,DomainCode,ObjectiveView } from "./types"

// Una sola regla de salud para servidor (copiloto) y cliente (Command Center).
// La salud de un objetivo = su score efectivo (medido o línea base) + el efecto
// de las decisiones firmadas sobre él. La de un dominio = promedio de sus objetivos.

export function decisionDelta(decisions:DecisionView[],objective:string){
 return decisions.filter(d=>d.objective===objective).reduce((sum,d)=>sum+d.delta,0)
}

export function objectiveHealth(objective:ObjectiveView,decisions:DecisionView[]){
 return clampScore(objective.score+decisionDelta(decisions,objective.code))
}

export function domainHealth(domain:DomainCode,objectives:ObjectiveView[],decisions:DecisionView[]){
 const own=objectives.filter(o=>o.domain===domain)
 if(own.length===0)return 0
 return clampScore(own.reduce((sum,o)=>sum+objectiveHealth(o,decisions),0)/own.length)
}

export function priorityOf(score:number):"Alta"|"Media"|"Baja"{return score<65?"Alta":score<80?"Media":"Baja"}
