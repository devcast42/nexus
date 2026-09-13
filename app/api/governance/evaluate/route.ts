import { revalidatePath } from "next/cache"
import { syncGovernanceSignals } from "@/lib/governance-rules"

export const dynamic = "force-dynamic"

// Reevaluación manual de las reglas de gobierno sobre la capa operativa.
// Normalmente ocurre sola tras cada operación y cada firma; esto es para forzarla.
export async function POST(){
 const signals=await syncGovernanceSignals()
 revalidatePath("/")
 return Response.json(signals)
}
