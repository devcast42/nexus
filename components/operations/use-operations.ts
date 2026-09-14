"use client"
import { useRouter } from "next/navigation"
import { useCallback,useState } from "react"
import type { AgentEventView } from "@/lib/types"

export type Op = { type:string; payload:Record<string,unknown> }

// Única vía de escritura de la mesa de trabajo: la misma API que usa el generador.
// Tras cada operación se recarga el Server Component, así el gobierno reacciona.
export function useOperations(){
 const router=useRouter()
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState<string|null>(null)
 const [last,setLast]=useState<string|null>(null)
 const [activity,setActivity]=useState<AgentEventView[]>([])
 const run=useCallback(async(ops:Op|Op[]):Promise<boolean>=>{
  setBusy(true);setError(null);setLast(null);setActivity([])
  try{
   const response=await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ops)})
   const result=await response.json() as {error?:string;applied?:{type:string;code?:string}[];signals?:{escalated:number;negotiations:number;events?:{kind:AgentEventView["kind"];actor:string;ruleKey?:string;objectiveCode?:string;summary:string}[]}}
   if(!response.ok){setError(result.error??`La API respondió ${response.status}`);return false}
   const codes=(result.applied??[]).map(a=>a.code).filter(Boolean)
   setLast(`${result.applied?.length??0} operación${(result.applied?.length??0)===1?"":"es"} registrada${(result.applied?.length??0)===1?"":"s"}${codes.length?` · ${codes.join(", ")}`:""}${result.signals?` · ${result.signals.escalated} escalada${result.signals.escalated===1?"":"s"} al comité`:""}`)
   // Lo que los agentes hicieron con este registro, para mostrarlo en el acto
   const mine=new Set(codes as string[])
   const touches=(e:{ruleKey?:string;summary:string})=>[...mine].some(c=>(e.ruleKey??"").includes(c)||e.summary.includes(c))
   const all=(result.signals?.events??[]).filter(e=>e.kind!=="evaluation.completed")
   // Primero lo que se refiere a lo recién registrado; luego el resto de la corrida
   const ordered=[...all.filter(touches),...all.filter(e=>!touches(e))]
   setActivity(ordered.map((e,i)=>({id:i,evaluationId:null,at:"ahora",kind:e.kind,actor:e.actor,ruleKey:e.ruleKey??null,objective:e.objectiveCode??null,summary:e.summary})))
   router.refresh()
   return true
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar la operación");return false}
  finally{setBusy(false)}
 },[router])
 return {run,busy,error,last,activity}
}
