"use client"
import { Bot,Cpu,Radar,ScrollText,Trash2,Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AgentEventView } from "@/lib/types"

const agentName:Record<string,string>={EDM:"Centinela Estratégico",APO:"Navegante de Riesgo",BAI:"Arquitecto de Cambio",DSS:"Guardián Operativo",MEA:"Auditor Continuo",NEXUS:"Nexus",REGLA:"Regla"}
const style:Record<AgentEventView["kind"],{icon:typeof Bot;label:string;tone:string}>={
 "rule.fired":{icon:Radar,label:"detectó",tone:"text-warning"},
 "agent.argued":{icon:Bot,label:"argumentó",tone:"text-primary"},
 "nexus.synthesized":{icon:Cpu,label:"concluyó",tone:"text-foreground"},
 "negotiation.retired":{icon:Trash2,label:"retiró",tone:"text-success"},
 "authoring.deferred":{icon:Clock,label:"pospuso",tone:"text-muted-foreground"},
 "evaluation.completed":{icon:ScrollText,label:"evaluó",tone:"text-muted-foreground"},
}

// Línea de tiempo de lo que hicieron el motor y los agentes. Se usa justo después
// de registrar algo en la mesa de trabajo y como feed permanente en Agentes.
export function AgentActivity({events,empty="Sin actividad registrada.",compact=false}:{events:AgentEventView[];empty?:string;compact?:boolean}){
 if(events.length===0)return <p className="text-sm text-muted-foreground">{empty}</p>
 return <ol className="flex flex-col gap-2">{events.map(e=>{const s=style[e.kind];const Icon=s.icon;return <li key={e.id} className={`flex gap-3 rounded-lg border bg-background/50 ${compact?"p-2.5":"p-3"}`}><Icon className={`mt-0.5 size-4 shrink-0 ${s.tone}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><span className="font-medium">{agentName[e.actor]??e.actor}</span><span className={s.tone}>{s.label}</span>{e.objective&&<Badge variant="outline" className="font-mono">{e.objective}</Badge>}{e.ruleKey&&!compact&&<span className="font-mono text-[10px] text-muted-foreground">{e.ruleKey}</span>}<span className="ml-auto text-muted-foreground">{e.at}</span></div><p className={`mt-1 leading-relaxed ${compact?"text-xs":"text-sm"} ${e.kind==="agent.argued"?"italic":""}`}>{e.kind==="agent.argued"?`“${e.summary}”`:e.summary}</p></div></li>})}</ol>
}
