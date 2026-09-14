"use client"
import { useMemo,useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from "@/components/ui/sheet"
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table"
import type { IncidentView,ServiceView,Severity } from "@/lib/types"
import { Feedback,Field,SEVERITIES,SelectField,SeverityBadge,TextField,Yes,minutesLabel } from "./shared"
import { useOperations } from "./use-operations"

type Filter="abiertos"|"resueltos"|"todos"

export function IncidentsPanel({incidents,services}:{incidents:IncidentView[];services:ServiceView[]}){
 const {run,busy,error,last}=useOperations()
 const [filter,setFilter]=useState<Filter>("abiertos")
 const [severity,setSeverity]=useState<"todas"|Severity>("todas")
 const [service,setService]=useState("todos")
 const [query,setQuery]=useState("")
 const [selectedCode,setSelectedCode]=useState<string|null>(null)
 const [creating,setCreating]=useState(false)
 const selected=incidents.find(i=>i.code===selectedCode)??null

 const rows=useMemo(()=>incidents.filter(i=>(filter==="todos"||(filter==="abiertos"?!i.resolvedAt:!!i.resolvedAt))
  &&(severity==="todas"||i.severity===severity)&&(service==="todos"||i.serviceCode===service)
  &&(i.code+i.title+i.serviceName).toLowerCase().includes(query.toLowerCase())),[incidents,filter,severity,service,query])
 const open=incidents.filter(i=>!i.resolvedAt).length
 const breached=incidents.filter(i=>i.slaMet===false).length

 // Formulario de alta
 const [fTitle,setFTitle]=useState("");const [fService,setFService]=useState(services[0]?.code??"");const [fSeverity,setFSeverity]=useState<Severity>("Media");const [fReporter,setFReporter]=useState("Mesa de Servicio");const [fRecurring,setFRecurring]=useState(false);const [fChange,setFChange]=useState("")
 async function create(){
  const ok=await run({type:"incident.open",payload:{title:fTitle,serviceCode:fService,severity:fSeverity,reportedBy:fReporter,recurring:fRecurring,causedByChange:fChange||undefined}})
  if(ok){setCreating(false);setFTitle("");setFRecurring(false);setFChange("")}
 }
 async function resolve(code:string){if(await run({type:"incident.resolve",payload:{code}}))setSelectedCode(null)}

 return <div className="flex flex-col gap-4">
  <div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Abiertos</CardDescription><CardTitle className="font-mono text-2xl">{open}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Fuera de SLA (histórico)</CardDescription><CardTitle className="font-mono text-2xl">{breached}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Alimenta a</CardDescription><CardTitle className="font-mono text-base text-primary">DSS02 · DSS03</CardTitle></CardHeader></Card></div>
  <Card><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle>Incidentes</CardTitle><CardDescription>Cada incidente resuelto se compara con el tiempo comprometido de su servicio</CardDescription></div>
   <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border p-0.5">{(["abiertos","resueltos","todos"] as Filter[]).map(f=><Button key={f} size="sm" variant={filter===f?"secondary":"ghost"} onClick={()=>setFilter(f)}>{f[0].toUpperCase()+f.slice(1)}</Button>)}</div>
   <SelectField label="" value={severity} onChange={setSeverity} options={[{value:"todas",label:"Toda severidad"},...SEVERITIES]}/>
   <SelectField label="" value={service} onChange={setService} options={[{value:"todos",label:"Todos los servicios"},...services.map(s=>({value:s.code,label:s.name}))]}/>
   <Input className="sm:w-48" placeholder="Buscar" value={query} onChange={e=>setQuery(e.target.value)}/>
   <Button onClick={()=>setCreating(true)}><Plus data-icon="inline-start"/>Abrir incidente</Button></div></div>
   <div className="pt-3"><Feedback error={error} last={last}/></div></CardHeader>
   <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Servicio</TableHead><TableHead>Severidad</TableHead><TableHead>Abierto</TableHead><TableHead>Duración</TableHead><TableHead>SLA</TableHead><TableHead>Recurrente</TableHead></TableRow></TableHeader>
   <TableBody>{rows.length===0?<TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin incidentes para este filtro</TableCell></TableRow>:rows.map(i=><TableRow key={i.code} className="cursor-pointer" onClick={()=>setSelectedCode(i.code)}><TableCell className="font-mono text-primary">{i.code}</TableCell><TableCell className="min-w-64 font-medium">{i.title}</TableCell><TableCell className="text-muted-foreground">{i.serviceName}</TableCell><TableCell><SeverityBadge severity={i.severity}/></TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{i.openedLabel}</TableCell><TableCell className="font-mono text-xs">{i.durationMinutes===null?<Badge variant="outline">abierto</Badge>:minutesLabel(i.durationMinutes)}</TableCell><TableCell><Yes ok={i.slaMet} yes="cumplido" no="incumplido"/></TableCell><TableCell>{i.recurring?<Badge variant="destructive">sí</Badge>:<span className="text-muted-foreground">no</span>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

  <Sheet open={creating} onOpenChange={o=>!o&&setCreating(false)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Abrir incidente</SheetTitle><SheetDescription>Entra por la API operativa con autor y hora. DSS02 lo medirá cuando se resuelva.</SheetDescription></SheetHeader>
   <div className="flex flex-col gap-4 px-4 pb-6"><TextField label="Título" value={fTitle} onChange={setFTitle} placeholder="Ej. Timeouts intermitentes en la pasarela"/><SelectField label="Servicio afectado" value={fService} onChange={setFService} options={services.map(s=>({value:s.code,label:`${s.name} · ${s.criticality}`}))}/><SelectField label="Severidad" value={fSeverity} onChange={setFSeverity} options={SEVERITIES} hint={`Tiempo comprometido: ${(()=>{const s=services.find(x=>x.code===fService);if(!s)return "—";return fSeverity==="Crítica"?minutesLabel(s.slaCriticalMinutes):minutesLabel(s.slaHighMinutes)})()}`}/><TextField label="Reportado por" value={fReporter} onChange={setFReporter}/><TextField label="Causado por el cambio (opcional)" value={fChange} onChange={setFChange} placeholder="CHG-0012" hint="Vincula el incidente al cambio que lo provocó"/><label className="flex items-center gap-3 text-sm"><Checkbox checked={fRecurring} onCheckedChange={v=>setFRecurring(v===true)}/>Es recurrente (ya ocurrió antes en este servicio)</label>
   <Button disabled={busy||!fTitle.trim()} onClick={create}>{busy?"Registrando...":"Registrar incidente"}</Button></div></SheetContent></Sheet>

  <Sheet open={!!selected} onOpenChange={o=>!o&&setSelectedCode(null)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="font-mono text-primary">{selected?.code}</SheetTitle><SheetDescription>{selected?.title}</SheetDescription></SheetHeader>
   {selected&&<div className="flex flex-col gap-4 px-4 pb-6"><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Servicio</dt><dd>{selected.serviceName}</dd><dt className="text-muted-foreground">Severidad</dt><dd><SeverityBadge severity={selected.severity}/></dd><dt className="text-muted-foreground">Abierto</dt><dd>{selected.openedLabel}</dd><dt className="text-muted-foreground">Resuelto</dt><dd>{selected.resolvedLabel??"—"}</dd><dt className="text-muted-foreground">Tiempo comprometido</dt><dd className="font-mono">{minutesLabel(selected.slaMinutes)}</dd><dt className="text-muted-foreground">Duración</dt><dd className="font-mono">{selected.durationMinutes===null?"en curso":minutesLabel(selected.durationMinutes)}</dd><dt className="text-muted-foreground">SLA</dt><dd><Yes ok={selected.slaMet} yes="cumplido" no="incumplido"/></dd><dt className="text-muted-foreground">Reportado por</dt><dd>{selected.reportedBy}</dd>{selected.causedByChange&&<><dt className="text-muted-foreground">Causado por</dt><dd className="font-mono">{selected.causedByChange}</dd></>}</dl>
   <Field label="" hint="Resolver ahora fija la hora de cierre y DSS02 compara la duración con el tiempo comprometido.">{!selected.resolvedAt?<Button disabled={busy} onClick={()=>resolve(selected.code)}>{busy?"Resolviendo...":"Resolver incidente"}</Button>:<p className="text-sm text-muted-foreground">Incidente cerrado. Su resultado ya cuenta para DSS02{selected.recurring&&" y DSS03"}.</p>}</Field></div>}</SheetContent></Sheet>
 </div>
}
