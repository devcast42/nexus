"use client"
import { useMemo,useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from "@/components/ui/sheet"
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table"
import type { SecurityEventView,Severity } from "@/lib/types"
import { Feedback,SEVERITIES,SelectField,SeverityBadge,TextField,Yes } from "./shared"
import { useOperations } from "./use-operations"

const KINDS=["Intento de acceso no autorizado","Phishing dirigido","Malware detectado en endpoint","Escaneo de puertos","Fuga de credenciales","Uso indebido de privilegios"]

export function SecurityPanel({events}:{events:SecurityEventView[]}){
 const {run,busy,error,last,activity}=useOperations()
 const [filter,setFilter]=useState<"abiertos"|"todos">("abiertos")
 const [creating,setCreating]=useState(false)
 const rows=useMemo(()=>events.filter(e=>filter==="todos"||!e.contained),[events,filter])
 const openCount=events.filter(e=>!e.contained).length
 const [fKind,setFKind]=useState(KINDS[0]);const [fSeverity,setFSeverity]=useState<Severity>("Media");const [fSource,setFSource]=useState("Centinela SOC");const [fData,setFData]=useState(false)
 async function create(){if(await run({type:"security.detect",payload:{kind:fKind,severity:fSeverity,source:fSource,dataInvolved:fData}})){setCreating(false);setFData(false)}}

 return <div className="flex flex-col gap-4">
  <div className="grid gap-3 sm:grid-cols-3"><Card className={openCount>0?"warning-glow":""}><CardHeader className="pb-2"><CardDescription>Sin contener</CardDescription><CardTitle className="font-mono text-2xl">{openCount}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Con información comprometida</CardDescription><CardTitle className="font-mono text-2xl">{events.filter(e=>e.dataInvolved).length}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Alimenta a</CardDescription><CardTitle className="font-mono text-base text-primary">DSS05 · APO13</CardTitle></CardHeader></Card></div>
  <Card><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle>Eventos de seguridad</CardTitle><CardDescription>Un evento sin contener más de 48 h genera un aviso del Guardián DSS</CardDescription></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border p-0.5">{(["abiertos","todos"] as const).map(f=><Button key={f} size="sm" variant={filter===f?"secondary":"ghost"} onClick={()=>setFilter(f)}>{f[0].toUpperCase()+f.slice(1)}</Button>)}</div><Button onClick={()=>setCreating(true)}><Plus data-icon="inline-start"/>Registrar evento</Button></div></div><div className="pt-3"><Feedback error={error} last={last} activity={activity}/></div></CardHeader>
   <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Severidad</TableHead><TableHead>Detectado</TableHead><TableHead>Origen</TableHead><TableHead>Información</TableHead><TableHead>Contención</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
   <TableBody>{rows.length===0?<TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin eventos para este filtro</TableCell></TableRow>:rows.map(e=><TableRow key={e.code}><TableCell className="font-mono text-primary">{e.code}</TableCell><TableCell className="font-medium">{e.kind}</TableCell><TableCell><SeverityBadge severity={e.severity}/></TableCell><TableCell className="whitespace-nowrap text-xs text-muted-foreground">{e.detectedLabel}</TableCell><TableCell className="text-muted-foreground">{e.source}</TableCell><TableCell>{e.dataInvolved?<Badge variant="destructive">comprometida</Badge>:<span className="text-muted-foreground">no</span>}</TableCell><TableCell>{e.contained?<span className="text-success">{e.hoursToContain} h</span>:<Badge variant="outline">pendiente</Badge>}</TableCell><TableCell className="text-right">{!e.contained&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>run({type:"security.contain",payload:{code:e.code}})}>Contener</Button>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  <Sheet open={creating} onOpenChange={o=>!o&&setCreating(false)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Registrar evento de seguridad</SheetTitle><SheetDescription>DSS05 mide la contención; APO13, si hubo información comprometida.</SheetDescription></SheetHeader><div className="flex flex-col gap-4 px-4 pb-6"><SelectField label="Tipo" value={fKind} onChange={setFKind} options={KINDS.map(k=>({value:k,label:k}))}/><SelectField label="Severidad" value={fSeverity} onChange={setFSeverity} options={SEVERITIES}/><TextField label="Origen de la detección" value={fSource} onChange={setFSource}/><label className="flex items-center gap-3 text-sm"><Checkbox checked={fData} onCheckedChange={v=>setFData(v===true)}/>Involucró información corporativa</label><Button disabled={busy} onClick={create}>{busy?"Registrando...":"Registrar evento"}</Button></div></SheetContent></Sheet>
 </div>
}
