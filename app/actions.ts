"use server"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { syncGovernanceSignals } from "@/lib/governance-rules"
import { applyOperation } from "@/lib/operations"
import { COMMITTEE_SIGNER } from "@/lib/org"
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
 if(label===null||impact===null)throw new Error("La negociación no define esta rama de decisión")
 // La firma ejecuta la rama en la capa operativa: el efecto es lo que la operación
 // cambia, no un delta. Con puntajes medidos, un delta fijo no significaría nada.
 const branchOps=verdict==="approved"?negotiation.approveOps:negotiation.rejectOps
 for(const op of branchOps)await applyOperation(op.type,op.payload)
 await db.insert(schema.decisions)
  .values({negotiationId,objectiveCode:negotiation.objectiveCode,domainCode:negotiation.domainCode,lens:negotiation.initiatorLens,verdict,label,impact,delta:delta??0,decidedBy:COMMITTEE_SIGNER})
  .onConflictDoUpdate({target:schema.decisions.negotiationId,set:{verdict,label,impact,delta:delta??0,decidedBy:COMMITTEE_SIGNER,decidedAt:new Date()}})
 await syncGovernanceSignals()
 revalidatePath("/")
}

export async function undoDecision(negotiationId:number){
 if(!Number.isInteger(negotiationId))throw new Error("Identificador de negociación inválido")
 const db=getDb()
 const [decision]=await db.select().from(schema.decisions).where(eq(schema.decisions.negotiationId,negotiationId))
 if(!decision)return
 const [negotiation]=await db.select().from(schema.negotiations).where(eq(schema.negotiations.id,negotiationId))
 // Una firma que ya ejecutó operaciones en la capa operativa no se deshace: el
 // proyecto ya está detenido, el riesgo ya está aceptado. Se revierte con otra decisión.
 const executed=decision.verdict==="approved"?negotiation?.approveOps??[]:negotiation?.rejectOps??[]
 if(executed.length>0)throw new Error("Esta decisión ejecutó operaciones y no se puede deshacer; revertir su efecto requiere una nueva decisión del comité.")
 await db.delete(schema.decisions).where(eq(schema.decisions.negotiationId,negotiationId))
 await syncGovernanceSignals()
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
// Nexus negocian y priorizan.
export async function applyDesignProfile(name:string,inputs:Record<string,number>,riskAppetite:number){
 if(typeof name!=="string"||name.trim().length===0)throw new Error("El diseño necesita un nombre")
 if(inputs===null||typeof inputs!=="object")throw new Error("Configuración inválida")
 if(!Number.isFinite(riskAppetite)||riskAppetite<0||riskAppetite>5)throw new Error("El apetito de riesgo debe estar entre 0 y 5")
 const db=getDb()
 const valueRows=await db.select({id:schema.designFactorValues.id}).from(schema.designFactorValues)
 const valid=new Set(valueRows.map(v=>v.id))
 const clean=Object.fromEntries(Object.entries(inputs).filter(([id,value])=>valid.has(id)&&Number.isFinite(value)).map(([id,value])=>[id,Number(value)]))
 if(Object.keys(clean).length===0)throw new Error("La configuración no contiene ningún factor de diseño conocido")
 await db.insert(schema.designProfiles).values({name:name.trim().slice(0,80),inputs:clean,riskAppetite:Math.round(riskAppetite*10)/10,appliedBy:COMMITTEE_SIGNER})
 // Un mandato nuevo cambia los umbrales que Nexus aplican: lo que antes era
 // aviso puede pasar a escalar, y al revés.
 await syncGovernanceSignals()
 revalidatePath("/")
}
