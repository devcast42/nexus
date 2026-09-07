import { integer,jsonb,pgTable,primaryKey,real,serial,text,timestamp,varchar } from "drizzle-orm/pg-core"

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

export const agents = pgTable("agents",{
 code:varchar("code",{length:3}).primaryKey(),
 name:text("name").notNull(),
 status:text("status").notNull(),
 action:text("action").notNull(),
 watched:integer("watched").notNull(),
 activity:jsonb("activity").$type<number[]>().notNull(),
})

export const negotiations = pgTable("negotiations",{
 id:integer("id").primaryKey(),
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
 openedAt:timestamp("opened_at",{withTimezone:true}).notNull().defaultNow(),
})

export const notices = pgTable("notices",{
 id:integer("id").primaryKey(),
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
 appliedBy:text("applied_by").notNull().default("Lina Castillo"),
 appliedAt:timestamp("applied_at",{withTimezone:true}).notNull().defaultNow(),
})
