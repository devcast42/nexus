import { clampScore } from "./score"
import type { DecisionView,DomainCode,ObjectiveView } from "./types"

// Una sola regla de salud para servidor (copiloto) y cliente (Command Center).
// La salud de un objetivo = su score efectivo (medido o línea base) + el efecto
// de las decisiones firmadas sobre él. La de un dominio = promedio de sus objetivos.

export function decisionDelta(decisions:DecisionView[],objective:string){
 return decisions.filter(d=>d.objective===objective).reduce((sum,d)=>sum+d.delta,0)
}

// Nulo cuando el objetivo no tiene medición ni línea base: no hay dato que ajustar.
export function objectiveHealth(objective:ObjectiveView,decisions:DecisionView[]):number|null{
 if(objective.score===null)return null
 return clampScore(objective.score+decisionDelta(decisions,objective.code))
}

// Promedio solo de los objetivos con dato. Nulo si ninguno lo tiene.
export function domainHealth(domain:DomainCode,objectives:ObjectiveView[],decisions:DecisionView[]):number|null{
 const scores=objectives.filter(o=>o.domain===domain).map(o=>objectiveHealth(o,decisions)).filter((s):s is number=>s!==null)
 if(scores.length===0)return null
 return clampScore(scores.reduce((sum,s)=>sum+s,0)/scores.length)
}

export function priorityOf(score:number|null):"Alta"|"Media"|"Baja"|"Sin dato"{return score===null?"Sin dato":score<65?"Alta":score<80?"Media":"Baja"}
