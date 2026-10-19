import { eq } from "drizzle-orm"
import { getDb } from "./db"
import * as schema from "./db/schema"
import { syncGovernanceSignals } from "./governance-rules"
import { applyOperation } from "./operations"
import { COMMITTEE_SIGNER } from "./org"
import type { Verdict } from "./types"

// La firma del comité, sin la capa de Next. La acción del servidor la envuelve y
// revalida la vista; el arnés de evaluación la llama directamente. Así lo que se
// mide es la misma ruta de código que ejecuta la interfaz, no una réplica.
export async function signDecision(negotiationId:number,verdict:Verdict){
 if(!Number.isInteger(negotiationId))throw new Error("Identificador de negociación inválido")
 if(verdict!=="approved"&&verdict!=="rejected")throw new Error("Veredicto inválido")
 const db=getDb()
 const [negotiation]=await db.select().from(schema.negotiations).where(eq(schema.negotiations.id,negotiationId))
 if(!negotiation)throw new Error(`La negociación ${negotiationId} no existe`)
 if(negotiation.outcome!=="escalated")throw new Error("Nexus resolvió esta discrepancia dentro del mandato: no hay nada que firmar")
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
 return {executedOps:branchOps.length,label,objectiveCode:negotiation.objectiveCode}
}
