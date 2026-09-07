"use server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import type { Verdict } from "@/lib/types"

export async function decideNegotiation(negotiationId:number,verdict:Verdict){
 if(!Number.isInteger(negotiationId))throw new Error("Identificador de negociación inválido")
 if(verdict!=="approved"&&verdict!=="rejected")throw new Error("Veredicto inválido")
 const db=getDb()
 const [negotiation]=await db.select().from(schema.negotiations).where(eq(schema.negotiations.id,negotiationId))
 if(!negotiation)throw new Error(`La negociación ${negotiationId} no existe`)
 if(negotiation.outcome!=="escalated")throw new Error("Los agentes resolvieron esta discrepancia dentro del mandato: no hay nada que firmar")
 const label=verdict==="approved"?negotiation.approveLabel:negotiation.rejectLabel
 const impact=verdict==="approved"?negotiation.approveImpact:negotiation.rejectImpact
 const delta=verdict==="approved"?negotiation.approveDelta:negotiation.rejectDelta
 if(label===null||impact===null||delta===null)throw new Error("La negociación no define esta rama de decisión")
 await db.insert(schema.decisions)
  .values({negotiationId,objectiveCode:negotiation.objectiveCode,domainCode:negotiation.domainCode,agent:negotiation.initiatorAgent,verdict,label,impact,delta})
  .onConflictDoUpdate({target:schema.decisions.negotiationId,set:{verdict,label,impact,delta,decidedAt:new Date()}})
 revalidatePath("/")
}

export async function undoDecision(negotiationId:number){
 if(!Number.isInteger(negotiationId))throw new Error("Identificador de negociación inválido")
 await getDb().delete(schema.decisions).where(eq(schema.decisions.negotiationId,negotiationId))
 revalidatePath("/")
}

// Descubrimiento de shadow AI: inserta el hallazgo si aún no está registrado
export async function scanOrganization(){
 await getDb().insert(schema.aiSystems)
  .values({name:"Meeting Mind",area:"Operaciones",description:"Transcripción no autorizada de reuniones",risk:"Alto",status:"Pendiente",controls:["APO13","DSS05"]})
  .onConflictDoNothing({target:schema.aiSystems.name})
 revalidatePath("/")
}

export async function saveAiAssessment(systemId:number,accepted:string[]){
 if(!Number.isInteger(systemId))throw new Error("Identificador de sistema inválido")
 if(!Array.isArray(accepted)||accepted.some(c=>typeof c!=="string"))throw new Error("Controles inválidos")
 const db=getDb()
 const [system]=await db.select().from(schema.aiSystems).where(eq(schema.aiSystems.id,systemId))
 if(!system)throw new Error(`El sistema ${systemId} no existe`)
 const valid=accepted.filter(c=>system.controls.includes(c))
 const status=valid.length===0?"Pendiente":valid.length===system.controls.length?"Aprobado":"Parcial"
 await db.update(schema.aiSystems).set({acceptedControls:valid,status,assessedAt:new Date()}).where(eq(schema.aiSystems.id,systemId))
 revalidatePath("/")
}

// "Aplicar este diseño" deja de ser decorativo: fija el mandato bajo el que
// los agentes negocian y priorizan.
export async function applyDesignProfile(name:string,inputs:Record<string,number>){
 if(typeof name!=="string"||name.trim().length===0)throw new Error("El diseño necesita un nombre")
 if(inputs===null||typeof inputs!=="object")throw new Error("Configuración inválida")
 const db=getDb()
 const valueRows=await db.select({id:schema.designFactorValues.id}).from(schema.designFactorValues)
 const valid=new Set(valueRows.map(v=>v.id))
 const clean=Object.fromEntries(Object.entries(inputs).filter(([id,value])=>valid.has(id)&&Number.isFinite(value)).map(([id,value])=>[id,Number(value)]))
 if(Object.keys(clean).length===0)throw new Error("La configuración no contiene ningún factor de diseño conocido")
 await db.insert(schema.designProfiles).values({name:name.trim().slice(0,80),inputs:clean})
 revalidatePath("/")
}
