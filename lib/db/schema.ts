import { boolean,integer,jsonb,pgTable,primaryKey,real,serial,text,timestamp,varchar } from "drizzle-orm/pg-core"

export const domains = pgTable("domains",{
 code:varchar("code",{length:3}).primaryKey(),
 name:text("name").notNull(),
 baseScore:integer("base_score").notNull(),
 trend:real("trend").notNull(),
 targetMaturity:real("target_maturity").notNull().default(4),
})

export const objectives = pgTable("objectives",{
 code:varchar("code",{length:8}).primaryKey(),
 name:text("name").notNull(),
 domainCode:varchar("domain_code",{length:3}).notNull().references(()=>domains.code),
 baseScore:integer("base_score").notNull(),
 agent:text("agent").notNull(),
 history:jsonb("history").$type<number[]>().notNull(),
})

// Solo identidad. Estado, última acción y actividad se derivan de las negociaciones
// que cada agente inició: nada de eso se siembra.
export const agents = pgTable("agents",{
 code:varchar("code",{length:3}).primaryKey(),
 name:text("name").notNull(),
 mandate:text("mandate").notNull(),
})

export const negotiations = pgTable("negotiations",{
 id:serial("id").primaryKey(),
 // Clave estable de la regla que la produjo ("risk-over-appetite:RSK-0001").
 // Las negociaciones ya no se siembran: las generan reglas sobre la capa operativa.
 ruleKey:varchar("rule_key",{length:64}).notNull().unique(),
 objectiveCode:varchar("objective_code",{length:8}).notNull().references(()=>objectives.code),
 domainCode:varchar("domain_code",{length:3}).notNull().references(()=>domains.code),
 severity:text("severity").$type<"critical"|"warning"|"info">().notNull(),
 fact:text("fact").notNull(),
 initiatorAgent:varchar("initiator_agent",{length:3}).notNull().references(()=>agents.code),
 initiatorPosition:text("initiator_position").notNull(),
 counterpartAgent:varchar("counterpart_agent",{length:3}).notNull().references(()=>agents.code),
 counterpartPosition:text("counterpart_position").notNull(),
 // Objetivo COBIT invocado para dirimir la discrepancia
 principleCode:varchar("principle_code",{length:8}).notNull().references(()=>objectives.code),
 outcome:text("outcome").$type<"resolved"|"escalated">().notNull(),
 // Consenso alcanzado, cuando cabe dentro del mandato vigente
 resolution:text("resolution"),
 // Por qué el consenso exigiría cambiar el mandato, y por tanto escala al comité
 escalationReason:text("escalation_reason"),
 proposal:text("proposal"),
 approveLabel:text("approve_label"),
 approveImpact:text("approve_impact"),
 approveDelta:integer("approve_delta"),
 rejectLabel:text("reject_label"),
 rejectImpact:text("reject_impact"),
 rejectDelta:integer("reject_delta"),
 // Operaciones que ejecuta cada rama al firmarse. El efecto de una decisión ya no
 // es un delta: es lo que la operación cambia en la capa operativa y, por tanto,
 // en la medición.
 approveOps:jsonb("approve_ops").$type<{type:string;payload:Record<string,unknown>}[]>().notNull().default([]),
 rejectOps:jsonb("reject_ops").$type<{type:string;payload:Record<string,unknown>}[]>().notNull().default([]),
 // Quién escribió las posiciones y la síntesis: "model" (los agentes y Nexus por LLM)
 // o "rule" (plantilla de la regla, cuando no hay modelo disponible). factsHash
 // detecta cuándo cambiaron los hechos y hay que redactar de nuevo.
 authoredBy:text("authored_by").$type<"model"|"rule">().notNull().default("rule"),
 authoringModel:text("authoring_model"),
 factsHash:varchar("facts_hash",{length:32}).notNull().default(""),
 openedAt:timestamp("opened_at",{withTimezone:true}).notNull().defaultNow(),
})

// Traza del motor: cada evaluación de reglas deja constancia de lo que hizo.
export const governanceEvaluations = pgTable("governance_evaluations",{
 id:serial("id").primaryKey(),
 ranAt:timestamp("ran_at",{withTimezone:true}).notNull().defaultNow(),
 mandate:text("mandate").notNull(),
 riskAppetite:real("risk_appetite").notNull(),
 negotiations:integer("negotiations").notNull(),
 escalated:integer("escalated").notNull(),
 resolved:integer("resolved").notNull(),
 retired:integer("retired").notNull(),
 notices:integer("notices").notNull(),
 authored:integer("authored").notNull(),
 authoringModel:text("authoring_model"),
 durationMs:integer("duration_ms").notNull(),
})

export const notices = pgTable("notices",{
 id:serial("id").primaryKey(),
 ruleKey:varchar("rule_key",{length:64}).notNull().unique(),
 objectiveCode:varchar("objective_code",{length:8}).notNull().references(()=>objectives.code),
 domainCode:varchar("domain_code",{length:3}).notNull().references(()=>domains.code),
 severity:text("severity").$type<"critical"|"warning"|"info">().notNull(),
 agent:text("agent").notNull(),
 fact:text("fact").notNull(),
 raisedAt:timestamp("raised_at",{withTimezone:true}).notNull().defaultNow(),
})

export const decisions = pgTable("decisions",{
 id:serial("id").primaryKey(),
 negotiationId:integer("negotiation_id").notNull().unique().references(()=>negotiations.id),
 objectiveCode:varchar("objective_code",{length:8}).notNull().references(()=>objectives.code),
 domainCode:varchar("domain_code",{length:3}).notNull().references(()=>domains.code),
 agent:text("agent").notNull(),
 verdict:text("verdict").$type<"approved"|"rejected">().notNull(),
 label:text("label").notNull(),
 impact:text("impact").notNull(),
 delta:integer("delta").notNull(),
 decidedBy:text("decided_by").notNull().default("Lina Castillo"),
 decidedAt:timestamp("decided_at",{withTimezone:true}).notNull().defaultNow(),
})

export const aiSystems = pgTable("ai_systems",{
 id:serial("id").primaryKey(),
 name:text("name").notNull().unique(),
 area:text("area").notNull(),
 description:text("description").notNull(),
 risk:text("risk").notNull(),
 status:text("status").notNull(),
 controls:jsonb("controls").$type<string[]>().notNull(),
 acceptedControls:jsonb("accepted_controls").$type<string[]>().notNull().default([]),
 discoveredAt:timestamp("discovered_at",{withTimezone:true}).notNull().defaultNow(),
 assessedAt:timestamp("assessed_at",{withTimezone:true}),
})

// Factores de diseño de COBIT 2019 y su influencia sobre los objetivos.
// Los pesos viven en la base para poder sustituirlos por los del Design Toolkit
// de ISACA sin tocar el motor de cálculo.
export const designFactors = pgTable("design_factors",{
 code:varchar("code",{length:6}).primaryKey(),
 name:text("name").notNull(),
 description:text("description").notNull(),
 input:text("input").$type<"rating"|"toggle"|"choice">().notNull(),
 displayOrder:integer("display_order").notNull(),
})

export const designFactorValues = pgTable("design_factor_values",{
 id:varchar("id",{length:24}).primaryKey(),
 factorCode:varchar("factor_code",{length:6}).notNull().references(()=>designFactors.code),
 valueKey:varchar("value_key",{length:24}).notNull(),
 label:text("label").notNull(),
 displayOrder:integer("display_order").notNull(),
})

export const designFactorWeights = pgTable("design_factor_weights",{
 valueId:varchar("value_id",{length:24}).notNull().references(()=>designFactorValues.id),
 objectiveCode:varchar("objective_code",{length:8}).notNull().references(()=>objectives.code),
 weight:integer("weight").notNull(),
},t=>[primaryKey({columns:[t.valueId,t.objectiveCode]})])

// El diseño de gobierno que el comité aplicó: el mandato bajo el que operan los agentes.
export const designProfiles = pgTable("design_profiles",{
 id:serial("id").primaryKey(),
 name:text("name").notNull(),
 inputs:jsonb("inputs").$type<Record<string,number>>().notNull(),
 // Umbral de riesgo residual (0-5) que el comité tolera. Es lo que EDM03 mide y
 // lo que los agentes citan cuando escalan: no es una constante del código.
 riskAppetite:real("risk_appetite").notNull().default(3.5),
 appliedBy:text("applied_by").notNull().default("Lina Castillo"),
 appliedAt:timestamp("applied_at",{withTimezone:true}).notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// CAPA OPERATIVA
//
// Separación deliberada:
//   MAESTROS (services, suppliers, controls) se siembran, como en cualquier
//   organización: son el catálogo con el que se opera.
//   TRANSACCIONALES (el resto) NO se siembran nunca. Solo entran por la API
//   operativa, con su autor y su hora. Es lo que permite que el gobierno mida
//   en vez de declarar: cada indicador se puede rastrear hasta el hecho que lo
//   produjo.
// ─────────────────────────────────────────────────────────────────────────────

export const services = pgTable("services",{
 code:varchar("code",{length:12}).primaryKey(),
 name:text("name").notNull(),
 criticality:text("criticality").$type<"Crítico"|"Alto"|"Medio"|"Bajo">().notNull(),
 owner:text("owner").notNull(),
 targetAvailability:real("target_availability").notNull(),
 // Minutos comprometidos para resolver, por severidad
 slaCriticalMinutes:integer("sla_critical_minutes").notNull(),
 slaHighMinutes:integer("sla_high_minutes").notNull(),
})

export const suppliers = pgTable("suppliers",{
 code:varchar("code",{length:12}).primaryKey(),
 name:text("name").notNull(),
 criticality:text("criticality").$type<"Crítico"|"Alto"|"Medio"|"Bajo">().notNull(),
 service:text("service").notNull(),
 contractEnd:timestamp("contract_end",{withTimezone:true}).notNull(),
})

export const controls = pgTable("controls",{
 code:varchar("code",{length:12}).primaryKey(),
 name:text("name").notNull(),
 objectiveCode:varchar("objective_code",{length:8}).notNull().references(()=>objectives.code),
 owner:text("owner").notNull(),
 frequencyDays:integer("frequency_days").notNull(),
})

export const incidents = pgTable("incidents",{
 id:serial("id").primaryKey(),
 code:varchar("code",{length:16}).notNull().unique(),
 title:text("title").notNull(),
 serviceCode:varchar("service_code",{length:12}).notNull().references(()=>services.code),
 severity:text("severity").$type<"Crítica"|"Alta"|"Media"|"Baja">().notNull(),
 openedAt:timestamp("opened_at",{withTimezone:true}).notNull(),
 resolvedAt:timestamp("resolved_at",{withTimezone:true}),
 // Un incidente puede quedar ligado al cambio que lo provocó (BAI06/BAI07)
 causedByChange:varchar("caused_by_change",{length:16}),
 recurring:boolean("recurring").notNull().default(false),
 reportedBy:text("reported_by").notNull(),
})

export const changes = pgTable("changes",{
 id:serial("id").primaryKey(),
 code:varchar("code",{length:16}).notNull().unique(),
 title:text("title").notNull(),
 serviceCode:varchar("service_code",{length:12}).notNull().references(()=>services.code),
 kind:text("kind").$type<"Normal"|"Estándar"|"Emergencia">().notNull(),
 requestedAt:timestamp("requested_at",{withTimezone:true}).notNull(),
 windowStart:timestamp("window_start",{withTimezone:true}),
 windowEnd:timestamp("window_end",{withTimezone:true}),
 deployedAt:timestamp("deployed_at",{withTimezone:true}),
 // Evidencia de aprobación completa: el insumo directo de BAI06
 hasApprovalEvidence:boolean("has_approval_evidence").notNull().default(false),
 rolledBack:boolean("rolled_back").notNull().default(false),
 requestedBy:text("requested_by").notNull(),
})

export const projects = pgTable("projects",{
 id:serial("id").primaryKey(),
 code:varchar("code",{length:16}).notNull().unique(),
 name:text("name").notNull(),
 sponsor:text("sponsor").notNull(),
 budget:integer("budget").notNull(),
 spent:integer("spent").notNull().default(0),
 startedAt:timestamp("started_at",{withTimezone:true}).notNull(),
 plannedEnd:timestamp("planned_end",{withTimezone:true}).notNull(),
 forecastEnd:timestamp("forecast_end",{withTimezone:true}).notNull(),
 status:text("status").$type<"En curso"|"En riesgo"|"Detenido"|"Cerrado">().notNull(),
})

export const risks = pgTable("risks",{
 id:serial("id").primaryKey(),
 code:varchar("code",{length:16}).notNull().unique(),
 title:text("title").notNull(),
 category:text("category").notNull(),
 projectCode:varchar("project_code",{length:16}),
 impact:integer("impact").notNull(),
 likelihood:integer("likelihood").notNull(),
 mitigationsPlanned:integer("mitigations_planned").notNull().default(0),
 mitigationsDone:integer("mitigations_done").notNull().default(0),
 owner:text("owner").notNull(),
 status:text("status").$type<"Abierto"|"Mitigado"|"Aceptado"|"Cerrado">().notNull(),
 raisedAt:timestamp("raised_at",{withTimezone:true}).notNull(),
})

export const slaMeasurements = pgTable("sla_measurements",{
 id:serial("id").primaryKey(),
 serviceCode:varchar("service_code",{length:12}).notNull().references(()=>services.code),
 periodStart:timestamp("period_start",{withTimezone:true}).notNull(),
 measuredAvailability:real("measured_availability").notNull(),
 breaches:integer("breaches").notNull().default(0),
})

export const supplierEvaluations = pgTable("supplier_evaluations",{
 id:serial("id").primaryKey(),
 supplierCode:varchar("supplier_code",{length:12}).notNull().references(()=>suppliers.code),
 evaluatedAt:timestamp("evaluated_at",{withTimezone:true}).notNull(),
 slaCompliance:real("sla_compliance").notNull(),
 findings:integer("findings").notNull().default(0),
 evaluatedBy:text("evaluated_by").notNull(),
})

export const securityEvents = pgTable("security_events",{
 id:serial("id").primaryKey(),
 code:varchar("code",{length:16}).notNull().unique(),
 kind:text("kind").notNull(),
 severity:text("severity").$type<"Crítica"|"Alta"|"Media"|"Baja">().notNull(),
 detectedAt:timestamp("detected_at",{withTimezone:true}).notNull(),
 containedAt:timestamp("contained_at",{withTimezone:true}),
 dataInvolved:boolean("data_involved").notNull().default(false),
 source:text("source").notNull(),
})

export const controlTests = pgTable("control_tests",{
 id:serial("id").primaryKey(),
 controlCode:varchar("control_code",{length:12}).notNull().references(()=>controls.code),
 testedAt:timestamp("tested_at",{withTimezone:true}).notNull(),
 result:text("result").$type<"Efectivo"|"Parcial"|"Inefectivo">().notNull(),
 evidence:text("evidence").notNull(),
 testedBy:text("tested_by").notNull(),
})

// Bitácora de los agentes: cada paso del motor deja una entrada legible. Es lo que
// hace visible el trabajo cuando entra información: qué regla saltó, qué argumentó
// cada agente, qué concluyó Nexus, qué se retiró.
export const agentEvents = pgTable("agent_events",{
 id:serial("id").primaryKey(),
 at:timestamp("at",{withTimezone:true}).notNull().defaultNow(),
 kind:text("kind").$type<"rule.fired"|"agent.argued"|"nexus.synthesized"|"negotiation.retired"|"authoring.deferred"|"evaluation.completed">().notNull(),
 actor:text("actor").notNull(),
 ruleKey:varchar("rule_key",{length:64}),
 objectiveCode:varchar("objective_code",{length:8}),
 summary:text("summary").notNull(),
 evaluationId:integer("evaluation_id"),
})
