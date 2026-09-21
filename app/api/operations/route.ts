import { revalidatePath } from "next/cache"
import { syncGovernanceSignals } from "@/lib/governance-rules"
import { OperationError,applyOperation,operationTypes,operationalSummary } from "@/lib/operations"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Única puerta HTTP de la capa operativa. La mesa de trabajo y el generador de
// actividad usan exactamente este endpoint: no hay ninguna vía que escriba
// directamente en la base.
export async function POST(request:Request){
 let body:unknown
 try{body=await request.json()}catch{return Response.json({error:"Cuerpo inválido"},{status:400})}

 const batch=Array.isArray(body)?body:[body]
 if(batch.length===0||batch.length>200)return Response.json({error:"Entre 1 y 200 operaciones por petición"},{status:400})

 const applied:unknown[]=[]
 try{
  for(const entry of batch){
   const {type,payload,at}=(entry??{}) as {type?:unknown;payload?:unknown;at?:unknown}
   if(typeof type!=="string")return Response.json({error:"Cada operación necesita un 'type'"},{status:400})
   const when=typeof at==="string"?new Date(at):new Date()
   if(Number.isNaN(when.getTime()))return Response.json({error:"Fecha 'at' inválida"},{status:400})
   applied.push({type,...await applyOperation(type,(payload??{}) as Record<string,unknown>,when)})
  }
 }catch(error){
  if(error instanceof OperationError)return Response.json({error:error.message,applied},{status:400})
  throw error
 }

 // Cada hecho nuevo puede abrir o cerrar una negociación: las reglas se reevalúan aquí
 const signals=await syncGovernanceSignals()
 revalidatePath("/")
 return Response.json({applied,count:applied.length,signals})
}

export async function GET(){
 const summary=await operationalSummary()
 return Response.json({
  operaciones:operationTypes,
  totales:{
   incidentes:summary.incidents.length,
   cambios:summary.changes.length,
   riesgos:summary.risks.length,
   proyectos:summary.projects.length,
   eventosSeguridad:summary.securityEvents.length,
   pruebasDeControl:summary.controlTests.length,
  },
 })
}
