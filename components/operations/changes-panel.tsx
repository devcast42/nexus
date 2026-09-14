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
import type { ChangeView,ServiceView } from "@/lib/types"
import { Feedback,Field,SelectField,TextField,Yes } from "./shared"
import { useOperations } from "./use-operations"

type Filter="pendientes"|"desplegados"|"sin-evidencia"|"todos"
const KINDS=[{value:"Normal",label:"Normal"},{value:"Estándar",label:"Estándar"},{value:"Emergencia",label:"Emergencia"}] as const

export function ChangesPanel({changes,services}:{changes:ChangeView[];services:ServiceView[]}){
 const {run,busy,error,last,activity}=useOperations()
 const [filter,setFilter]=useState<Filter>("todos")
 const [query,setQuery]=useState("")
 const [selectedCode,setSelectedCode]=useState<string|null>(null)
 const [creating,setCreating]=useState(false)
 const [deployEvidence,setDeployEvidence]=useState(true)
 const selected=changes.find(c=>c.code===selectedCode)??null
 const rows=useMemo(()=>changes.filter(c=>(filter==="todos"||(filter==="pendientes"?!c.deployed:filter==="desplegados"?c.deployed:c.deployed&&!c.hasApprovalEvidence&&!c.rolledBack))
  &&(c.code+c.title+c.serviceName).toLowerCase().includes(query.toLowerCase())),[changes,filter,query])
 const deployed=changes.filter(c=>c.deployed)
 const withoutEvidence=deployed.filter(c=>!c.hasApprovalEvidence&&!c.rolledBack).length

 const [fTitle,setFTitle]=useState("");const [fService,setFService]=useState(services[0]?.code??"");const [fKind,setFKind]=useState<ChangeView["kind"]>("Normal");const [fBy,setFBy]=useState("Gerencia de Infraestructura");const [fWindow,setFWindow]=useState("")
 async function create(){
  const windowStart=fWindow?new Date(fWindow):null
  const ok=await run({type:"change.request",payload:{title:fTitle,serviceCode:fService,kind:fKind,requestedBy:fBy,windowStart:windowStart?.toISOString(),windowEnd:windowStart?new Date(windowStart.getTime()+4*60*60_000).toISOString():undefined}})
  if(ok){setCreating(false);setFTitle("");setFWindow("")}
 }
 async function act(type:string,code:string,extra:Record<string,unknown>={}){if(await run({type,payload:{code,...extra}}))setSelectedCode(null)}

 return <div className="flex flex-col gap-4">
  <div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>En producción</CardDescription><CardTitle className="font-mono text-2xl">{deployed.length}</CardTitle></CardHeader></Card><Card className={withoutEvidence>0?"warning-glow":""}><CardHeader className="pb-2"><CardDescription>Sin evidencia de aprobación</CardDescription><CardTitle className="font-mono text-2xl">{withoutEvidence}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Alimenta a</CardDescription><CardTitle className="font-mono text-base text-primary">BAI06 · BAI07</CardTitle></CardHeader></Card></div>
  <Card><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle>Cambios</CardTitle><CardDescription>Un cambio en producción sin evidencia escala al comité por BAI06</CardDescription></div>
   <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border p-0.5">{([["todos","Todos"],["pendientes","Pendientes"],["desplegados","Desplegados"],["sin-evidencia","Sin evidencia"]] as [Filter,string][]).map(([f,l])=><Button key={f} size="sm" variant={filter===f?"secondary":"ghost"} onClick={()=>setFilter(f)}>{l}</Button>)}</div><Input className="sm:w-48" placeholder="Buscar" value={query} onChange={e=>setQuery(e.target.value)}/><Button onClick={()=>setCreating(true)}><Plus data-icon="inline-start"/>Solicitar cambio</Button></div></div><div className="pt-3"><Feedback error={error} last={last} activity={activity}/></div></CardHeader>
   <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Servicio</TableHead><TableHead>Tipo</TableHead><TableHead>Ventana</TableHead><TableHead>Desplegado</TableHead><TableHead>Evidencia</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
   <TableBody>{rows.length===0?<TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin cambios para este filtro</TableCell></TableRow>:rows.map(c=><TableRow key={c.code} className="cursor-pointer" onClick={()=>setSelectedCode(c.code)}><TableCell className="font-mono text-primary">{c.code}</TableCell><TableCell className="min-w-56 font-medium">{c.title}</TableCell><TableCell className="text-muted-foreground">{c.serviceName}</TableCell><TableCell><Badge variant={c.kind==="Emergencia"?"destructive":"outline"}>{c.kind}</Badge></TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{c.windowLabel??"—"}</TableCell><TableCell className="whitespace-nowrap text-xs">{c.deployedLabel??<span className="text-muted-foreground">pendiente</span>}</TableCell><TableCell>{c.deployed?<Yes ok={c.hasApprovalEvidence} yes="registrada" no="falta"/>:<span className="text-muted-foreground">—</span>}</TableCell><TableCell>{c.rolledBack?<Badge variant="destructive">revertido</Badge>:c.deployed?<Badge variant="secondary">en producción</Badge>:<Badge variant="outline">solicitado</Badge>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

  <Sheet open={creating} onOpenChange={o=>!o&&setCreating(false)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Solicitar cambio</SheetTitle><SheetDescription>El cambio queda solicitado; desplegarlo es una operación aparte.</SheetDescription></SheetHeader>
   <div className="flex flex-col gap-4 px-4 pb-6"><TextField label="Título" value={fTitle} onChange={setFTitle} placeholder="Ej. Actualización del módulo contable"/><SelectField label="Servicio" value={fService} onChange={setFService} options={services.map(s=>({value:s.code,label:s.name}))}/><SelectField label="Tipo" value={fKind} onChange={setFKind} options={KINDS} hint="Las emergencias son las que suelen llegar sin evidencia completa"/><TextField label="Solicitado por" value={fBy} onChange={setFBy}/><TextField label="Inicio de ventana (opcional)" type="datetime-local" value={fWindow} onChange={setFWindow} hint="Ventana de 4 horas desde el inicio"/><Button disabled={busy||!fTitle.trim()} onClick={create}>{busy?"Registrando...":"Registrar solicitud"}</Button></div></SheetContent></Sheet>

  <Sheet open={!!selected} onOpenChange={o=>!o&&setSelectedCode(null)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="font-mono text-primary">{selected?.code}</SheetTitle><SheetDescription>{selected?.title}</SheetDescription></SheetHeader>
   {selected&&<div className="flex flex-col gap-4 px-4 pb-6"><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Servicio</dt><dd>{selected.serviceName}</dd><dt className="text-muted-foreground">Tipo</dt><dd>{selected.kind}</dd><dt className="text-muted-foreground">Solicitado</dt><dd>{selected.requestedLabel} · {selected.requestedBy}</dd><dt className="text-muted-foreground">Ventana</dt><dd>{selected.windowLabel??"—"}</dd><dt className="text-muted-foreground">Desplegado</dt><dd>{selected.deployedLabel??"pendiente"}</dd><dt className="text-muted-foreground">Dentro de ventana</dt><dd><Yes ok={selected.insideWindow}/></dd><dt className="text-muted-foreground">Evidencia</dt><dd>{selected.deployed?<Yes ok={selected.hasApprovalEvidence} yes="registrada" no="falta"/>:"—"}</dd><dt className="text-muted-foreground">Revertido</dt><dd><Yes ok={selected.rolledBack} yes="sí" no="no"/></dd></dl>
   {!selected.deployed&&<Field label="Desplegar" hint="Si despliegas sin evidencia, la regla BAI06 lo escalará al comité."><label className="flex items-center gap-3 text-sm"><Checkbox checked={deployEvidence} onCheckedChange={v=>setDeployEvidence(v===true)}/>Con evidencia de aprobación registrada</label><Button disabled={busy} onClick={()=>act("change.deploy",selected.code,{hasApprovalEvidence:deployEvidence})}>{busy?"Desplegando...":"Desplegar a producción"}</Button></Field>}
   {selected.deployed&&!selected.hasApprovalEvidence&&!selected.rolledBack&&<Button variant="outline" disabled={busy} onClick={()=>act("change.attachEvidence",selected.code)}>Adjuntar evidencia de aprobación</Button>}
   {selected.deployed&&!selected.rolledBack&&<Button variant="destructive" disabled={busy} onClick={()=>act("change.rollback",selected.code)}>Revertir cambio</Button>}</div>}</SheetContent></Sheet>
 </div>
}
