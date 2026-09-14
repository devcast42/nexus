export type DomainCode = "EDM" | "APO" | "BAI" | "DSS" | "MEA"
export type Verdict = "approved" | "rejected"
export type Outcome = { label:string; impact:string; delta:number }

export type DomainView = { code:DomainCode; name:string; trend:number|null; targetMaturity:number }
export type MeasureView = { score:number; metric:string; evidence:string; sample:number }
// `score` es la salud efectiva: la medida sobre evidencia operativa cuando existe,
// la línea base sembrada cuando el objetivo aún no se mide. `measure` dice cuál fue.
// `score` nulo = sin medición y sin línea base declarada: no hay dato, y se muestra así.
export type ObjectiveView = { code:string; name:string; domain:DomainCode; baseScore:number|null; score:number|null; measure:MeasureView|null; agent:string; history:number[] }
export type CoverageView = { covered:number; total:number; score:number }
// Todo derivado de las negociaciones que el agente inició: nada sembrado.
export type AgentView = { code:string; name:string; mandate:string; status:"Alerta"|"Analizando"|"Activo"; action:string; watched:number; activity:number[]; escalated:number; resolved:number; signed:number }
export type AgentEventView = { id:number; evaluationId:number|null; at:string; kind:"rule.fired"|"agent.argued"|"nexus.synthesized"|"negotiation.retired"|"authoring.deferred"|"evaluation.completed"; actor:string; ruleKey:string|null; objective:string|null; summary:string }
export type EvaluationView = { ranAt:string; mandate:string; riskAppetite:number; negotiations:number; escalated:number; resolved:number; retired:number; notices:number; authored:number; authoringModel:string|null; durationMs:number }
export type NegotiationView = {
 id:number; objective:string; domain:DomainCode; severity:"critical"|"warning"|"info"
 fact:string
 initiatorAgent:string; initiatorName:string; initiatorPosition:string
 counterpartAgent:string; counterpartName:string; counterpartPosition:string
 principle:string; principleName:string
 outcome:"resolved"|"escalated"
 resolution:string|null
 escalationReason:string|null
 proposal:string|null
 approve:Outcome|null; reject:Outcome|null
 time:string
 authoredBy:"model"|"rule"; authoringModel:string|null
}
export type NoticeView = { id:number; objective:string; domain:DomainCode; severity:"critical"|"warning"|"info"; agent:string; fact:string; time:string }
// `executed`: la rama firmada ejecutó operaciones (detener proyecto, aceptar riesgo) o solo registró una exigencia
export type DecisionView = { negotiationId:number; objective:string; domain:DomainCode; agent:string; verdict:Verdict; label:string; impact:string; delta:number; executed:boolean; decidedBy:string; at:string }
export type DesignValueView = { id:string; key:string; label:string; weights:Record<string,number> }
export type DesignFactorView = { code:string; name:string; description:string; input:"rating"|"toggle"|"choice"; values:DesignValueView[] }
export type DesignProfileView = { id:number; name:string; inputs:Record<string,number>; riskAppetite:number; appliedBy:string; appliedAt:string }
export type AiSystemView = { id:number; name:string; area:string; description:string; risk:string; status:string; controls:string[]; acceptedControls:string[]; assessed:boolean }
export type GovernanceData = { domains:DomainView[]; objectives:ObjectiveView[]; agents:AgentView[]; negotiations:NegotiationView[]; notices:NoticeView[]; decisions:DecisionView[]; aiSystems:AiSystemView[]; designFactors:DesignFactorView[]; activeProfile:DesignProfileView|null; coverage:CoverageView; operations:OperationsView; lastEvaluation:EvaluationView|null; activity:AgentEventView[] }

// ── Capa operativa (modelos de vista) ─────────────────────────────────────────
// Fechas: `*At` en ISO para lógica, `*Label` ya formateado en el servidor para
// evitar diferencias de hidratación entre Node y el navegador.
export type Severity = "Crítica"|"Alta"|"Media"|"Baja"
export type IncidentView = { id:number; code:string; title:string; serviceCode:string; serviceName:string; severity:Severity; openedAt:string; openedLabel:string; resolvedAt:string|null; resolvedLabel:string|null; durationMinutes:number|null; slaMinutes:number; slaMet:boolean|null; causedByChange:string|null; recurring:boolean; reportedBy:string }
export type ChangeView = { id:number; code:string; title:string; serviceCode:string; serviceName:string; kind:"Normal"|"Estándar"|"Emergencia"; requestedLabel:string; windowLabel:string|null; deployedLabel:string|null; deployed:boolean; insideWindow:boolean|null; hasApprovalEvidence:boolean; rolledBack:boolean; requestedBy:string }
export type RiskView = { id:number; code:string; title:string; category:string; projectCode:string|null; projectName:string|null; impact:number; likelihood:number; residual:number; mitigationsPlanned:number; mitigationsDone:number; owner:string; status:"Abierto"|"Mitigado"|"Aceptado"|"Cerrado"; raisedLabel:string; overAppetite:boolean }
export type ProjectView = { id:number; code:string; name:string; sponsor:string; budget:number; spent:number; spentPct:number; startedLabel:string; plannedEnd:string; plannedEndLabel:string; forecastEnd:string; forecastEndLabel:string; delayDays:number; status:"En curso"|"En riesgo"|"Detenido"|"Cerrado" }
export type SecurityEventView = { id:number; code:string; kind:string; severity:Severity; detectedLabel:string; containedLabel:string|null; contained:boolean; hoursToContain:number|null; dataInvolved:boolean; source:string }
export type ControlTestView = { result:"Efectivo"|"Parcial"|"Inefectivo"; testedLabel:string; evidence:string; testedBy:string }
export type ControlView = { code:string; name:string; objectiveCode:string; objectiveName:string; owner:string; frequencyDays:number; lastTest:ControlTestView|null; daysSinceTest:number|null; overdue:boolean; tests:ControlTestView[] }
export type ServiceView = { code:string; name:string; criticality:"Crítico"|"Alto"|"Medio"|"Bajo"; owner:string; targetAvailability:number; slaCriticalMinutes:number; slaHighMinutes:number; latestAvailability:number|null; latestBreaches:number|null; latestPeriodLabel:string|null; openIncidents:number }
export type SupplierView = { code:string; name:string; criticality:"Crítico"|"Alto"|"Medio"|"Bajo"; service:string; contractEndLabel:string; contractDaysLeft:number; latestCompliance:number|null; latestFindings:number|null; latestEvaluatedLabel:string|null }
export type OperationsView = { incidents:IncidentView[]; changes:ChangeView[]; risks:RiskView[]; projects:ProjectView[]; securityEvents:SecurityEventView[]; controls:ControlView[]; services:ServiceView[]; suppliers:SupplierView[]; riskAppetite:number }
