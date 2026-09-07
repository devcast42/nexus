"use client"
import { createContext,useCallback,useContext,useMemo,useTransition,type ReactNode } from "react"
import { decideNegotiation,undoDecision } from "@/app/actions"
import type { DecisionView,DomainCode,GovernanceData,NegotiationView,Verdict } from "@/lib/types"

type Governance = GovernanceData & {
 pending:NegotiationView[]
 settled:NegotiationView[]
 log:DecisionView[]
 saving:boolean
 decide:(negotiation:NegotiationView,verdict:Verdict)=>void
 undo:(negotiationId:number)=>void
 deltaFor:(objective:string)=>number
 domainDelta:(domain:DomainCode)=>number
}
const GovernanceContext = createContext<Governance|null>(null)

export function useGovernance(){const ctx=useContext(GovernanceContext);if(!ctx)throw new Error("useGovernance debe usarse dentro de GovernanceProvider");return ctx}

export function GovernanceProvider({data,children}:{data:GovernanceData;children:ReactNode}){
 const [saving,startTransition]=useTransition()
 const run=useCallback((task:()=>Promise<void>)=>{startTransition(async()=>{await task()})},[])
 const decide=useCallback((negotiation:NegotiationView,verdict:Verdict)=>run(()=>decideNegotiation(negotiation.id,verdict)),[run])
 const undo=useCallback((negotiationId:number)=>run(()=>undoDecision(negotiationId)),[run])

 const value=useMemo<Governance>(()=>{
  const decided=new Set(data.decisions.map(d=>d.negotiationId))
  return {...data,
   // Escaladas y aún sin firmar: lo que espera al comité
   pending:data.negotiations.filter(n=>n.outcome==="escalated"&&!decided.has(n.id)),
   // Resueltas entre agentes, o escaladas y ya firmadas
   settled:data.negotiations.filter(n=>n.outcome==="resolved"||decided.has(n.id)),
   log:data.decisions,
   saving,decide,undo,
   deltaFor:objective=>data.decisions.filter(d=>d.objective===objective).reduce((sum,d)=>sum+d.delta,0),
   domainDelta:domain=>data.decisions.filter(d=>d.domain===domain).reduce((sum,d)=>sum+d.delta,0),
  }
 },[data,saving,decide,undo])

 return <GovernanceContext value={value}>{children}</GovernanceContext>
}
