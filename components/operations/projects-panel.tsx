"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from "@/components/ui/sheet"
import type { ProjectView } from "@/lib/types"
import { Feedback,Field,SelectField,TextField } from "./shared"
import { useOperations } from "./use-operations"

const STATUSES=[{value:"En curso",label:"En curso"},{value:"En riesgo",label:"En riesgo"},{value:"Detenido",label:"Detenido"},{value:"Cerrado",label:"Cerrado"}] as const
const money=(n:number)=>new Intl.NumberFormat("es-PE",{style:"currency",currency:"PEN",maximumFractionDigits:0}).format(n)

export function ProjectsPanel({projects}:{projects:ProjectView[]}){
 const {run,busy,error,last,activity}=useOperations()
 const [selectedCode,setSelectedCode]=useState<string|null>(null)
 const [creating,setCreating]=useState(false)
 const selected=projects.find(p=>p.code===selectedCode)??null
 const [fName,setFName]=useState("");const [fSponsor,setFSponsor]=useState("Dirección Comercial");const [fBudget,setFBudget]=useState("500000");const [fEnd,setFEnd]=useState("")
 const [uSpent,setUSpent]=useState("");const [uForecast,setUForecast]=useState("");const [uStatus,setUStatus]=useState<ProjectView["status"]>("En curso")
 function openDetail(p:ProjectView){setSelectedCode(p.code);setUSpent(String(p.spent));setUForecast(p.forecastEnd.slice(0,10));setUStatus(p.status)}
 async function create(){if(await run({type:"project.start",payload:{name:fName,sponsor:fSponsor,budget:Number(fBudget),plannedEnd:fEnd?new Date(fEnd).toISOString():undefined}})){setCreating(false);setFName("")}}
 async function update(){if(selected&&await run({type:"project.update",payload:{code:selected.code,spent:Number(uSpent),forecastEnd:uForecast?new Date(uForecast).toISOString():undefined,status:uStatus}}))setSelectedCode(null)}
 const statusVariant=(s:ProjectView["status"])=>s==="Detenido"?"destructive":s==="En riesgo"?"default":s==="Cerrado"?"outline":"secondary"

 return <div className="flex flex-col gap-4">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-semibold">Proyectos y programas</h3><p className="text-sm text-muted-foreground">Presupuesto y cronograma alimentan a APO06, BAI01 y BAI11. Detener uno es una operación que el comité puede firmar.</p></div><Button onClick={()=>setCreating(true)}><Plus data-icon="inline-start"/>Iniciar proyecto</Button></div>
  <Feedback error={error} last={last} activity={activity}/>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map(p=><Card key={p.code} className={`cursor-pointer transition-all hover:-translate-y-0.5 ${p.status==="Detenido"?"critical-glow":p.status==="En riesgo"?"warning-glow":""}`} onClick={()=>openDetail(p)}><CardHeader><div className="flex items-start justify-between gap-2"><Badge variant="outline" className="font-mono">{p.code}</Badge><Badge variant={statusVariant(p.status)}>{p.status}</Badge></div><CardTitle className="text-base">{p.name}</CardTitle><CardDescription>{p.sponsor}</CardDescription></CardHeader><CardContent className="flex flex-col gap-3 text-sm"><div><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Presupuesto ejecutado</span><span className={`font-mono ${p.spentPct>100?"text-destructive":""}`}>{p.spentPct}%</span></div><Progress value={Math.min(100,p.spentPct)}/><p className="mt-1 text-xs text-muted-foreground">{money(p.spent)} de {money(p.budget)}</p></div><div className="flex justify-between text-xs"><span className="text-muted-foreground">Fin planificado</span><span>{p.plannedEndLabel}</span></div><div className="flex justify-between text-xs"><span className="text-muted-foreground">Fin proyectado</span><span className={p.delayDays>0?"text-destructive":"text-success"}>{p.forecastEndLabel} ({p.delayDays>0?`+${p.delayDays} d`:`${p.delayDays} d`})</span></div></CardContent></Card>)}</div>

  <Sheet open={creating} onOpenChange={o=>!o&&setCreating(false)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Iniciar proyecto</SheetTitle><SheetDescription>Queda En curso con la fecha planificada como proyección inicial.</SheetDescription></SheetHeader><div className="flex flex-col gap-4 px-4 pb-6"><TextField label="Nombre" value={fName} onChange={setFName} placeholder="Ej. Ónix — renovación del CRM"/><TextField label="Patrocinador" value={fSponsor} onChange={setFSponsor}/><TextField label="Presupuesto (S/)" type="number" value={fBudget} onChange={setFBudget}/><TextField label="Fin planificado" type="date" value={fEnd} onChange={setFEnd}/><Button disabled={busy||!fName.trim()||!fEnd} onClick={create}>{busy?"Registrando...":"Iniciar proyecto"}</Button></div></SheetContent></Sheet>

  <Sheet open={!!selected} onOpenChange={o=>!o&&setSelectedCode(null)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="font-mono text-primary">{selected?.code}</SheetTitle><SheetDescription>{selected?.name}</SheetDescription></SheetHeader>{selected&&<div className="flex flex-col gap-4 px-4 pb-6"><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Patrocinador</dt><dd>{selected.sponsor}</dd><dt className="text-muted-foreground">Inicio</dt><dd>{selected.startedLabel}</dd><dt className="text-muted-foreground">Presupuesto</dt><dd className="font-mono">{money(selected.budget)}</dd><dt className="text-muted-foreground">Ejecutado</dt><dd className="font-mono">{money(selected.spent)} ({selected.spentPct}%)</dd></dl><Field label="Actualizar avance" hint="Cambiar el estado a Detenido es lo mismo que firma el comité cuando un riesgo del proyecto supera el apetito."><TextField label="Gasto ejecutado (S/)" type="number" value={uSpent} onChange={setUSpent}/><TextField label="Fin proyectado" type="date" value={uForecast} onChange={setUForecast}/><SelectField label="Estado" value={uStatus} onChange={setUStatus} options={STATUSES}/><Button disabled={busy} onClick={update}>{busy?"Guardando...":"Guardar actualización"}</Button></Field></div>}</SheetContent></Sheet>
 </div>
}
