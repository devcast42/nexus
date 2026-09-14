"use client"
import { useState } from "react"
import { Bot,Cpu,Radar,ScrollText,Trash2,Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { NexusEventView } from "@/lib/types"

// Los códigos de dominio son lentes de Nexus: se muestran como "Nexus · lente APO"
const actorLabel=(a:string)=>a==="NEXUS"?"Nexus":a==="REGLA"?"Regla":`Nexus · lente ${a}`
const lensName:Record<string,string>={EDM:"Centinela Estratégico",APO:"Navegante de Riesgo",BAI:"Arquitecto de Cambio",DSS:"Guardián Operativo",MEA:"Auditor Continuo"}
const style:Record<NexusEventView["kind"],{icon:typeof Bot;label:string;tone:string}>={
 "rule.fired":{icon:Radar,label:"detectó",tone:"text-warning"},
 "nexus.argued":{icon:Bot,label:"argumentó",tone:"text-primary"},
 "nexus.concluded":{icon:Cpu,label:"concluyó",tone:"text-foreground"},
 "negotiation.retired":{icon:Trash2,label:"retiró",tone:"text-success"},
 "authoring.deferred":{icon:Clock,label:"pospuso",tone:"text-muted-foreground"},
 "evaluation.completed":{icon:ScrollText,label:"evaluó",tone:"text-muted-foreground"},
}

// Línea de tiempo de lo que hizo Nexus: qué detectó, qué argumentó desde cada lente,
// qué concluyó. Feed en la vista de Nexus y en la vista detallada de actividad.
// `limit` muestra solo los últimos pasos sustantivos (detecciones, argumentos,
// conclusiones); las posposiciones y los resúmenes de corrida quedan tras "ver todo".
export function NexusActivity({events,empty="Sin actividad registrada.",compact=false,limit}:{events:NexusEventView[];empty?:string;compact?:boolean;limit?:number}){
 const [expanded,setExpanded]=useState(false)
 if(events.length===0)return <p className="text-sm text-muted-foreground">{empty}</p>
 const substantive=events.filter(e=>e.kind!=="authoring.deferred"&&e.kind!=="evaluation.completed")
 const shown=limit&&!expanded?substantive.slice(0,limit):events
 const hidden=events.length-shown.length
 return <div className="flex flex-col gap-2"><ol className="flex flex-col gap-2">{shown.map(e=>{const s=style[e.kind];const Icon=s.icon;return <li key={e.id} className={`flex gap-3 rounded-lg border bg-background/50 ${compact?"p-2.5":"p-3"}`}><Icon className={`mt-0.5 size-4 shrink-0 ${s.tone}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><span className="font-medium">{actorLabel(e.actor)}</span>{lensName[e.actor]&&<span className="text-muted-foreground">{lensName[e.actor]}</span>}<span className={s.tone}>{s.label}</span>{e.objective&&<Badge variant="outline" className="font-mono">{e.objective}</Badge>}{e.ruleKey&&!compact&&<span className="font-mono text-[10px] text-muted-foreground">{e.ruleKey}</span>}<span className="ml-auto text-muted-foreground">{e.at}</span></div><p className={`mt-1 leading-relaxed ${compact?"text-xs":"text-sm"} ${e.kind==="nexus.argued"?"italic":""}`}>{e.kind==="nexus.argued"?`“${e.summary}”`:e.summary}</p></div></li>})}</ol>{limit&&hidden>0&&<Button size="sm" variant="ghost" className="self-start" onClick={()=>setExpanded(true)}>Ver todo · {hidden} pasos más, incluidas posposiciones y resúmenes de corrida</Button>}{limit&&expanded&&<Button size="sm" variant="ghost" className="self-start" onClick={()=>setExpanded(false)}>Mostrar solo los últimos {limit}</Button>}</div>
}
