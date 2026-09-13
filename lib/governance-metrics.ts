import type * as schema from "./db/schema"

type Incident = typeof schema.incidents.$inferSelect
type Change = typeof schema.changes.$inferSelect
type Risk = typeof schema.risks.$inferSelect
type Project = typeof schema.projects.$inferSelect
type SecurityEvent = typeof schema.securityEvents.$inferSelect
type ControlTest = typeof schema.controlTests.$inferSelect
type Service = typeof schema.services.$inferSelect
type Control = typeof schema.controls.$inferSelect
type SlaMeasurement = typeof schema.slaMeasurements.$inferSelect
type SupplierEvaluation = typeof schema.supplierEvaluations.$inferSelect

export type OperationalData = {
 incidents:Incident[]; changes:Change[]; risks:Risk[]; projects:Project[]
 securityEvents:SecurityEvent[]; controlTests:ControlTest[]
 services:Service[]; controls:Control[]
 slaMeasurements:SlaMeasurement[]; supplierEvaluations:SupplierEvaluation[]
}

// Una medición: de dónde sale el número y sobre cuántos hechos se calculó.
// `sample` es la clave: un objetivo medido sobre 2 hechos no vale lo mismo que
// uno medido sobre 200, y el comité debe poder verlo.
export type Measure = { objective:string; score:number; metric:string; evidence:string; sample:number }

const pct=(part:number,total:number)=>total===0?null:Math.round((part/total)*100)
const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(v)))

export function deriveMeasures(ops:OperationalData,riskAppetite:number):Measure[]{
 const measures:Measure[]=[]
 const add=(objective:string,score:number|null,metric:string,evidence:string,sample:number)=>{
  if(score===null||sample===0)return
  measures.push({objective,score:clamp(score),metric,evidence,sample})
 }
 const serviceOf=new Map(ops.services.map(s=>[s.code,s]))

 // DSS02 — incidentes resueltos dentro del SLA comprometido del servicio
 const closed=ops.incidents.filter(i=>i.resolvedAt)
 const inSla=closed.filter(i=>{
  const service=serviceOf.get(i.serviceCode)
  if(!service)return false
  const budget=i.severity==="Crítica"?service.slaCriticalMinutes:service.slaHighMinutes
  return (i.resolvedAt!.getTime()-i.openedAt.getTime())/60_000<=budget
 })
 add("DSS02",pct(inSla.length,closed.length),"Incidentes resueltos dentro de SLA",
  `${inSla.length} de ${closed.length} incidentes cerrados dentro del tiempo comprometido`,closed.length)

 // DSS03 — la recurrencia es el síntoma de que no se atacó la causa raíz
 const recurring=ops.incidents.filter(i=>i.recurring)
 add("DSS03",ops.incidents.length===0?null:100-(recurring.length/ops.incidents.length)*100,"Incidentes no recurrentes",
  `${recurring.length} de ${ops.incidents.length} incidentes son recurrentes`,ops.incidents.length)

 // BAI06 — evidencia de aprobación sobre lo que llegó a producción
 const deployed=ops.changes.filter(c=>c.deployedAt)
 const withEvidence=deployed.filter(c=>c.hasApprovalEvidence)
 add("BAI06",pct(withEvidence.length,deployed.length),"Cambios desplegados con evidencia de aprobación",
  `${withEvidence.length} de ${deployed.length} cambios en producción tienen su aprobación registrada`,deployed.length)

 // BAI07 — transiciones que no hubo que revertir
 const rolledBack=deployed.filter(c=>c.rolledBack)
 add("BAI07",deployed.length===0?null:100-(rolledBack.length/deployed.length)*100,"Cambios sin reversión",
  `${rolledBack.length} de ${deployed.length} cambios tuvieron que revertirse`,deployed.length)

 // APO12 — avance de las mitigaciones comprometidas sobre riesgos abiertos
 const openRisks=ops.risks.filter(r=>r.status==="Abierto")
 const planned=openRisks.reduce((n,r)=>n+r.mitigationsPlanned,0)
 const done=openRisks.reduce((n,r)=>n+r.mitigationsDone,0)
 add("APO12",pct(done,planned),"Mitigaciones ejecutadas sobre riesgos abiertos",
  `${done} de ${planned} mitigaciones comprometidas están ejecutadas`,openRisks.length)

 // EDM03 — riesgos cuyo residual supera el apetito que fijó el comité.
 // El umbral no es una constante: sale del mandato vigente del simulador.
 const overAppetite=openRisks.filter(r=>residualOf(r)>riskAppetite)
 add("EDM03",openRisks.length===0?null:100-(overAppetite.length/openRisks.length)*100,"Riesgos dentro del apetito vigente",
  `${overAppetite.length} de ${openRisks.length} riesgos abiertos superan el apetito ${riskAppetite.toFixed(1)}`,openRisks.length)

 // DSS05 — eventos de seguridad contenidos
 const contained=ops.securityEvents.filter(e=>e.containedAt)
 add("DSS05",pct(contained.length,ops.securityEvents.length),"Eventos de seguridad contenidos",
  `${contained.length} de ${ops.securityEvents.length} eventos fueron contenidos`,ops.securityEvents.length)

 // APO13 — eventos que llegaron a tocar información
 const withData=ops.securityEvents.filter(e=>e.dataInvolved)
 add("APO13",ops.securityEvents.length===0?null:100-(withData.length/ops.securityEvents.length)*100,"Eventos sin información comprometida",
  `${withData.length} de ${ops.securityEvents.length} eventos involucraron información`,ops.securityEvents.length)

 // BAI04 / APO09 — disponibilidad medida contra la comprometida
 const metTarget=ops.slaMeasurements.filter(m=>{
  const service=serviceOf.get(m.serviceCode)
  return service?m.measuredAvailability>=service.targetAvailability:false
 })
 add("BAI04",pct(metTarget.length,ops.slaMeasurements.length),"Mediciones que alcanzan la disponibilidad objetivo",
  `${metTarget.length} de ${ops.slaMeasurements.length} mediciones cumplen el objetivo del servicio`,ops.slaMeasurements.length)
 // Tasa, no conteo: 30 incumplimientos en 200 periodos no es lo mismo que en 20.
 const cleanPeriods=ops.slaMeasurements.filter(m=>m.breaches===0)
 const totalBreaches=ops.slaMeasurements.reduce((n,m)=>n+m.breaches,0)
 add("APO09",pct(cleanPeriods.length,ops.slaMeasurements.length),"Periodos sin incumplimiento de acuerdos de servicio",
  `${cleanPeriods.length} de ${ops.slaMeasurements.length} periodos sin incumplimientos (${totalBreaches} en total)`,ops.slaMeasurements.length)

 // APO10 — desempeño de proveedores según su última evaluación
 const latest=new Map<string,SupplierEvaluation>()
 for(const e of ops.supplierEvaluations){
  const previous=latest.get(e.supplierCode)
  if(!previous||e.evaluatedAt>previous.evaluatedAt)latest.set(e.supplierCode,e)
 }
 const evaluations=[...latest.values()]
 const avgCompliance=evaluations.length===0?null:evaluations.reduce((n,e)=>n+e.slaCompliance,0)/evaluations.length
 add("APO10",avgCompliance,"Cumplimiento promedio de proveedores evaluados",
  `${evaluations.length} proveedores con evaluación vigente`,evaluations.length)

 // APO06 — ejecución presupuestal de los proyectos en curso
 const running=ops.projects.filter(p=>p.status!=="Cerrado")
 const budget=running.reduce((n,p)=>n+p.budget,0)
 const spent=running.reduce((n,p)=>n+p.spent,0)
 add("APO06",budget===0?null:100-Math.max(0,((spent-budget)/budget)*100),"Gasto contra presupuesto aprobado",
  `${running.length} proyectos en curso, ${Math.round((spent/Math.max(1,budget))*100)}% del presupuesto ejecutado`,running.length)

 // BAI11 — desvío de cronograma
 const onSchedule=running.filter(p=>p.forecastEnd.getTime()<=p.plannedEnd.getTime())
 add("BAI11",pct(onSchedule.length,running.length),"Proyectos dentro del cronograma",
  `${onSchedule.length} de ${running.length} proyectos proyectan cerrar en fecha`,running.length)
 const atRisk=running.filter(p=>p.status==="En riesgo"||p.status==="Detenido")
 add("BAI01",running.length===0?null:100-(atRisk.length/running.length)*100,"Programas sin alerta de estado",
  `${atRisk.length} de ${running.length} programas están en riesgo o detenidos`,running.length)

 // Pruebas de control: cada control declara a qué objetivo alimenta.
 // Es el puente genérico entre la operación y MEA02.
 const byObjective=new Map<string,ControlTest[]>()
 const controlObjective=new Map(ops.controls.map(c=>[c.code,c.objectiveCode]))
 for(const test of ops.controlTests){
  const objective=controlObjective.get(test.controlCode)
  if(!objective)continue
  byObjective.set(objective,[...(byObjective.get(objective)??[]),test])
 }
 const weightOf=(r:ControlTest["result"])=>r==="Efectivo"?100:r==="Parcial"?55:0
 for(const [objective,tests] of byObjective){
  if(measures.some(m=>m.objective===objective))continue // una medida específica manda sobre la genérica
  const score=tests.reduce((n,t)=>n+weightOf(t.result),0)/tests.length
  add(objective,score,"Efectividad de los controles asociados",
   `${tests.length} pruebas de control; ${tests.filter(t=>t.result==="Efectivo").length} efectivas`,tests.length)
 }
 const allTests=ops.controlTests
 if(allTests.length>0){
  const score=allTests.reduce((n,t)=>n+weightOf(t.result),0)/allTests.length
  const existing=measures.findIndex(m=>m.objective==="MEA02")
  const measure:Measure={objective:"MEA02",score:clamp(score),metric:"Efectividad del sistema de control interno",
   evidence:`${allTests.length} pruebas ejecutadas; ${allTests.filter(t=>t.result==="Inefectivo").length} inefectivas`,sample:allTests.length}
  if(existing>=0)measures[existing]=measure; else measures.push(measure)
 }

 return measures
}

export function residualOf(risk:{impact:number;likelihood:number;mitigationsPlanned:number;mitigationsDone:number}){
 const inherent=(risk.impact*risk.likelihood)/5 // 0-5
 const coverage=risk.mitigationsPlanned===0?0:risk.mitigationsDone/risk.mitigationsPlanned
 return Math.round(inherent*(1-coverage*0.6)*10)/10
}

// MEA01 no se mide con datos externos: se mide con cuánto del sistema está medido.
export function measurementCoverage(measures:Measure[],totalObjectives:number){
 const covered=new Set(measures.map(m=>m.objective)).size
 return {covered,total:totalObjectives,score:clamp((covered/totalObjectives)*100)}
}
