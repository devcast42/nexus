"use client"
import { useRouter } from "next/navigation"
import { useCallback,useState } from "react"

export type Op = { type:string; payload:Record<string,unknown> }

// Única vía de escritura de la mesa de trabajo: la misma API que usa el generador.
// Tras cada operación se recarga el Server Component, así el gobierno reacciona.
export function useOperations(){
 const router=useRouter()
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState<string|null>(null)
 const [last,setLast]=useState<string|null>(null)
 const run=useCallback(async(ops:Op|Op[]):Promise<boolean>=>{
  setBusy(true);setError(null);setLast(null)
  try{
   const response=await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(ops)})
   const result=await response.json() as {error?:string;applied?:{type:string;code?:string}[];signals?:{escalated:number;negotiations:number}}
   if(!response.ok){setError(result.error??`La API respondió ${response.status}`);return false}
   const codes=(result.applied??[]).map(a=>a.code).filter(Boolean)
   setLast(`${result.applied?.length??0} operación${(result.applied?.length??0)===1?"":"es"} registrada${(result.applied?.length??0)===1?"":"s"}${codes.length?` · ${codes.join(", ")}`:""}${result.signals?` · ${result.signals.escalated} escalada${result.signals.escalated===1?"":"s"} al comité`:""}`)
   router.refresh()
   return true
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar la operación");return false}
  finally{setBusy(false)}
 },[router])
 return {run,busy,error,last}
}
