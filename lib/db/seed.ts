import { config } from "dotenv"
config({ path: ".env.local" })
config({ path: ".env" })

import { isNull,sql } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { defaultDesignInputs,designFactors as seedDesignFactors } from "../cobit-design"
import { controls as seedControls,services as seedServices,suppliers as seedSuppliers } from "../operational-master"
import { agents as seedAgents,aiSystems as seedAiSystems,domains as seedDomains,objectives as seedObjectives } from "../mock-data"
import * as schema from "./schema"

const url=process.env.DATABASE_URL
if(!url){console.error("Falta DATABASE_URL. Créala en .env.local antes de sembrar.");process.exit(1)}

// Dos perfiles de semilla:
//   fresh → solo el marco COBIT (dominios, objetivos, agentes, factores de diseño) y un
//           mandato base. Sin empresa: sin servicios, proveedores, controles, sistemas
//           de IA, línea base ni historial. Es el estado de una organización nueva.
//   demo  → además, la organización de ejemplo (Corporación Andina) con línea base
//           declarada, para demostraciones y desarrollo.
const PROFILE=(process.env.SEED_PROFILE??"demo")==="fresh"?"fresh":"demo"
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
 console.log(`Perfil de semilla: ${PROFILE}`)
 await db.insert(schema.domains).values(seedDomains.map(d=>({code:d.code,name:d.name,baseScore:PROFILE==="demo"?d.score:null,trend:PROFILE==="demo"?d.trend:null,targetMaturity:d.target})))
  .onConflictDoUpdate({target:schema.domains.code,set:{name:sqlExcluded("name"),baseScore:sqlExcluded("base_score"),trend:sqlExcluded("trend"),targetMaturity:sqlExcluded("target_maturity")}})
 console.log(`✓ ${seedDomains.length} dominios`)

 await db.insert(schema.objectives).values(seedObjectives.map(o=>({code:o.code,name:o.name,domainCode:o.domain,baseScore:PROFILE==="demo"?o.score:null,agent:o.agent,history:PROFILE==="demo"?o.history:[]})))
  .onConflictDoUpdate({target:schema.objectives.code,set:{name:sqlExcluded("name"),baseScore:sqlExcluded("base_score"),agent:sqlExcluded("agent"),history:sqlExcluded("history")}})
 console.log(`✓ ${seedObjectives.length} objetivos COBIT`)

 await db.insert(schema.agents).values(seedAgents.map(a=>({code:a.domain,name:a.name,mandate:a.mandate})))
  .onConflictDoUpdate({target:schema.agents.code,set:{name:sqlExcluded("name"),mandate:sqlExcluded("mandate")}})
 console.log(`✓ ${seedAgents.length} agentes`)

 // Negociaciones y avisos NO se siembran: los producen las reglas de gobierno
 // (lib/governance-rules.ts) evaluando la capa operativa.
 console.log("· negociaciones y avisos: generados por reglas sobre la operación, no sembrados")

 await db.insert(schema.designFactors).values(seedDesignFactors.map((f,i)=>({code:f.code,name:f.name,description:f.description,input:f.input,displayOrder:i})))
  .onConflictDoUpdate({target:schema.designFactors.code,set:{name:sqlExcluded("name"),description:sqlExcluded("description"),input:sqlExcluded("input"),displayOrder:sqlExcluded("display_order")}})
 const values=seedDesignFactors.flatMap(f=>f.values.map((v,i)=>({id:`${f.code}.${v.key}`,factorCode:f.code,valueKey:v.key,label:v.label,displayOrder:i})))
 await db.insert(schema.designFactorValues).values(values)
  .onConflictDoUpdate({target:schema.designFactorValues.id,set:{label:sqlExcluded("label"),displayOrder:sqlExcluded("display_order")}})
 const weights=seedDesignFactors.flatMap(f=>f.values.flatMap(v=>Object.entries(v.weights).map(([objectiveCode,weight])=>({valueId:`${f.code}.${v.key}`,objectiveCode,weight}))))
 await db.insert(schema.designFactorWeights).values(weights)
  .onConflictDoUpdate({target:[schema.designFactorWeights.valueId,schema.designFactorWeights.objectiveCode],set:{weight:sqlExcluded("weight")}})
 const [existingProfile]=await db.select({id:schema.designProfiles.id}).from(schema.designProfiles).limit(1)
 if(!existingProfile){await db.insert(schema.designProfiles).values({name:"Diseño base",inputs:defaultDesignInputs});console.log("✓ mandato inicial 'Diseño base' aplicado")}
 console.log(`✓ ${seedDesignFactors.length} factores de diseño · ${values.length} valores · ${weights.length} pesos sobre objetivos`)

 if(PROFILE==="fresh"){console.log("· sin sistemas de IA ni maestros operativos: la organización los da de alta desde la mesa de trabajo");return}

 // Un sistema "Aprobado" solo es coherente si el comité aceptó sus controles en algún momento
 const assessedAt=new Date(Date.now()-7*24*60*60_000)
 await db.insert(schema.aiSystems).values(seedAiSystems.map(s=>({name:s.name,area:s.area,description:s.desc,risk:s.risk,status:s.status,controls:s.controls,acceptedControls:s.status==="Aprobado"?s.controls:[],assessedAt:s.status==="Aprobado"?assessedAt:null})))
  .onConflictDoUpdate({target:schema.aiSystems.name,set:{area:sqlExcluded("area"),description:sqlExcluded("description"),risk:sqlExcluded("risk"),status:sqlExcluded("status"),controls:sqlExcluded("controls"),acceptedControls:sqlExcluded("accepted_controls"),assessedAt:sqlExcluded("assessed_at")},setWhere:isNull(schema.aiSystems.assessedAt)})
 console.log(`✓ ${seedAiSystems.length} sistemas de IA`)
 // Maestros de la capa operativa. Lo transaccional NO se siembra: entra por la API.
 await db.insert(schema.services).values(seedServices)
  .onConflictDoUpdate({target:schema.services.code,set:{name:sqlExcluded("name"),criticality:sqlExcluded("criticality"),owner:sqlExcluded("owner"),targetAvailability:sqlExcluded("target_availability")}})
 await db.insert(schema.suppliers).values(seedSuppliers.map(s=>({code:s.code,name:s.name,criticality:s.criticality,service:s.service,contractEnd:new Date(Date.now()+s.contractMonths*30*24*60*60_000)})))
  .onConflictDoUpdate({target:schema.suppliers.code,set:{name:sqlExcluded("name"),criticality:sqlExcluded("criticality"),service:sqlExcluded("service")}})
 await db.insert(schema.controls).values(seedControls.map(c=>({code:c.code,name:c.name,objectiveCode:c.objective,owner:c.owner,frequencyDays:c.frequencyDays})))
  .onConflictDoUpdate({target:schema.controls.code,set:{name:sqlExcluded("name"),objectiveCode:sqlExcluded("objective_code"),owner:sqlExcluded("owner"),frequencyDays:sqlExcluded("frequency_days")}})
 console.log(`✓ maestros operativos: ${seedServices.length} servicios · ${seedSuppliers.length} proveedores · ${seedControls.length} controles`)
 console.log("  (incidentes, cambios, riesgos, eventos y pruebas NO se siembran: entran por la API operativa)")
}

main().then(()=>{console.log("\nSemilla completa.");process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})
