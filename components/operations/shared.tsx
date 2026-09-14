"use client"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select,SelectContent,SelectGroup,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select"
import type { AgentEventView,Severity } from "@/lib/types"
import { AgentActivity } from "../agent-activity"

export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){
 return <label className="flex flex-col gap-1.5 text-sm"><span className="font-medium">{label}</span>{children}{hint&&<span className="text-xs text-muted-foreground">{hint}</span>}</label>
}
export function TextField({label,value,onChange,placeholder,hint,type="text"}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string;hint?:string;type?:string}){
 return <Field label={label} hint={hint}><Input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></Field>
}
export function SelectField<T extends string>({label,value,onChange,options,hint}:{label:string;value:T;onChange:(v:T)=>void;options:readonly {value:T;label:string}[];hint?:string}){
 return <Field label={label} hint={hint}><Select value={value} onValueChange={v=>v&&onChange(v as T)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectGroup>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}
export function SeverityBadge({severity}:{severity:Severity}){
 return <Badge variant={severity==="Crítica"?"destructive":severity==="Alta"?"default":"secondary"}>{severity}</Badge>
}
export function Yes({ok,yes="Sí",no="No"}:{ok:boolean|null;yes?:string;no?:string}){
 if(ok===null)return <span className="text-muted-foreground">—</span>
 return <span className={ok?"text-success":"text-destructive"}>{ok?yes:no}</span>
}
export function Feedback({error,last,activity=[]}:{error:string|null;last:string|null;activity?:AgentEventView[]}){
 if(error)return <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
 if(!last)return null
 return <div className="flex flex-col gap-2"><p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">{last}</p>{activity.length>0&&<div className="rounded-lg border border-primary/25 bg-primary/5 p-3"><p className="status-label mb-2 text-primary">Lo que hicieron los agentes con este registro</p><AgentActivity events={activity} compact/></div>}{activity.length===0&&<p className="px-1 text-xs text-muted-foreground">Ninguna regla se disparó con este registro: la medición se actualizó, pero no hay discrepancia nueva que argumentar.</p>}</div>
}
export const SEVERITIES:readonly {value:Severity;label:string}[]=[{value:"Crítica",label:"Crítica"},{value:"Alta",label:"Alta"},{value:"Media",label:"Media"},{value:"Baja",label:"Baja"}]
export const minutesLabel=(m:number)=>m<60?`${m} min`:m<1440?`${Math.round(m/60*10)/10} h`:`${Math.round(m/1440*10)/10} d`
