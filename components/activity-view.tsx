"use client"
import { useMemo,useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { AgentEventView } from "@/lib/types"
import { AgentActivity } from "./agent-activity"
import { useGovernance } from "./governance-provider"
import { useView } from "./view-context"

const actors=[["todos","Todos"],["REGLA","Reglas"],["EDM","EDM"],["APO","APO"],["BAI","BAI"],["DSS","DSS"],["MEA","MEA"],["NEXUS","Nexus"]] as const
const kinds=[["todos","Todo"],["rule.fired","Detecciones"],["agent.argued","Argumentos"],["nexus.synthesized","Conclusiones"],["negotiation.retired","Retiradas"],["authoring.deferred","Pospuestas"],["evaluation.completed","Corridas"]] as const

// Vista detallada de la bitácora: todo lo que hizo el motor, agrupado por corrida,
// con filtros por actor y tipo de paso y búsqueda por texto o código.
export function ActivityView(){
 const {activity,agents}=useGovernance()
 const {setView}=useView()
 const [actor,setActor]=useState<string>("todos")
 const [kind,setKind]=useState<string>("todos")
 const [query,setQuery]=useState("")
 const filtered=useMemo(()=>activity.filter(e=>(actor==="todos"||e.actor===actor)&&(kind==="todos"||e.kind===kind)&&(e.summary+(e.ruleKey??"")+(e.objective??"")).toLowerCase().includes(query.toLowerCase())),[activity,actor,kind,query])
 // Agrupar por corrida del motor, de la más reciente a la más antigua
 const runs=useMemo(()=>{const map=new Map<string,AgentEventView[]>();for(const e of filtered){const k=e.evaluationId===null?"sin-corrida":String(e.evaluationId);map.set(k,[...(map.get(k)??[]),e])}return [...map.entries()]},[filtered])
 const byActor=useMemo(()=>Object.fromEntries(actors.map(([a])=>[a,activity.filter(e=>a==="todos"||e.actor===a).length])),[activity])
 return <div className="flex flex-col gap-5">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={()=>setView("agents")}><ArrowLeft data-icon="inline-start"/>Volver a Agentes</Button><h2 className="text-2xl font-semibold">Actividad de los agentes</h2><p className="text-muted-foreground">{activity.length} pasos registrados por el motor en {new Set(activity.map(e=>e.evaluationId)).size} corridas. Cada uno es lo que ocurrió, en orden.</p></div><Input className="lg:w-72" placeholder="Buscar por texto, regla u objetivo" value={query} onChange={e=>setQuery(e.target.value)}/></div>
  <div className="flex flex-wrap gap-2"><div className="flex flex-wrap rounded-lg border p-0.5">{actors.map(([a,l])=><Button key={a} size="sm" variant={actor===a?"secondary":"ghost"} onClick={()=>setActor(a)}>{l}{a!=="todos"&&<Badge variant="outline" className="ml-1.5 h-4 px-1 font-mono text-[10px]">{byActor[a]}</Badge>}</Button>)}</div><div className="flex flex-wrap rounded-lg border p-0.5">{kinds.map(([k,l])=><Button key={k} size="sm" variant={kind===k?"secondary":"ghost"} onClick={()=>setKind(k)}>{l}</Button>)}</div></div>
  <div className="grid gap-3 sm:grid-cols-5">{agents.map(a=><Card key={a.code} className="cursor-pointer" onClick={()=>setActor(actor===a.code?"todos":a.code)}><CardHeader className="p-3"><div className="flex items-center justify-between"><Badge variant="outline" className="font-mono">{a.code}</Badge><span className="font-mono text-xs text-muted-foreground">{byActor[a.code]} pasos</span></div><CardDescription className="text-xs">{a.name}</CardDescription></CardHeader></Card>)}</div>
  {runs.length===0?<Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nada coincide con este filtro.</CardContent></Card>:runs.map(([runId,events])=>{const summary=events.find(e=>e.kind==="evaluation.completed");return <Card key={runId}><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">Corrida {runId==="sin-corrida"?"—":`#${runId}`}</CardTitle><span className="text-xs text-muted-foreground">{events[events.length-1]?.at}</span></div>{summary&&<CardDescription>{summary.summary}</CardDescription>}</CardHeader><CardContent><AgentActivity events={events.filter(e=>e.kind!=="evaluation.completed"||kind==="evaluation.completed")}/></CardContent></Card>})}
 </div>
}
