"use client"
import { useMemo,useState } from "react"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table"
import type { ProjectView,RiskView } from "@/lib/types"
import { Feedback,Field,SelectField,TextField } from "./shared"
import { useOperations } from "./use-operations"

const CATEGORIES=["Programas y proyectos","Terceros","Infraestructura","Personal","Cumplimiento","Operación","Seguridad","Datos"]
const STATUSES=[{value:"Abierto",label:"Abierto"},{value:"Mitigado",label:"Mitigado"},{value:"Aceptado",label:"Aceptado por el comité"},{value:"Cerrado",label:"Cerrado"}] as const

export function RisksPanel({risks,projects,riskAppetite}:{risks:RiskView[];projects:ProjectView[];riskAppetite:number}){
 const {run,busy,error,last,activity}=useOperations()
 const [filter,setFilter]=useState<"abiertos"|"todos">("abiertos")
 const [query,setQuery]=useState("")
 const [selectedCode,setSelectedCode]=useState<string|null>(null)
 const [creating,setCreating]=useState(false)
 const [closeStatus,setCloseStatus]=useState<RiskView["status"]>("Cerrado")
 const selected=risks.find(r=>r.code===selectedCode)??null
 const rows=useMemo(()=>risks.filter(r=>(filter==="todos"||r.status==="Abierto")&&(r.code+r.title+r.category).toLowerCase().includes(query.toLowerCase())),[risks,filter,query])
 const open=risks.filter(r=>r.status==="Abierto");const over=open.filter(r=>r.overAppetite).length

 const [fTitle,setFTitle]=useState("");const [fCategory,setFCategory]=useState(CATEGORIES[0]);const [fImpact,setFImpact]=useState(3);const [fLikelihood,setFLikelihood]=useState(3);const [fPlanned,setFPlanned]=useState(2);const [fOwner,setFOwner]=useState("Gerencia de Riesgos");const [fProject,setFProject]=useState("ninguno")
 const previewResidual=Math.round((fImpact*fLikelihood/5)*10)/10
 async function create(){
  const ok=await run({type:"risk.raise",payload:{title:fTitle,category:fCategory,impact:fImpact,likelihood:fLikelihood,mitigationsPlanned:fPlanned,owner:fOwner,projectCode:fProject==="ninguno"?undefined:fProject}})
  if(ok){setCreating(false);setFTitle("")}
 }
 const slider=(label:string,value:number,set:(v:number)=>void,max=5)=><Field label={`${label}: ${value}/${max}`}><Slider min={max===5?1:0} max={max} step={1} value={[value]} onValueChange={x=>set(typeof x==="number"?x:x[0])}/></Field>

 return <div className="flex flex-col gap-4">
  <div className="grid gap-3 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Abiertos</CardDescription><CardTitle className="font-mono text-2xl">{open.length}</CardTitle></CardHeader></Card><Card className={over>0?"critical-glow":""}><CardHeader className="pb-2"><CardDescription>Sobre el apetito ({riskAppetite.toFixed(1)})</CardDescription><CardTitle className="font-mono text-2xl">{over}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Alimenta a</CardDescription><CardTitle className="font-mono text-base text-primary">APO12 · EDM03</CardTitle></CardHeader></Card></div>
  <Card><CardHeader><div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><CardTitle>Riesgos</CardTitle><CardDescription>Residual = impacto × probabilidad ÷ 5, reducido hasta 60% por las mitigaciones ejecutadas. Sobre el apetito, escala.</CardDescription></div>
   <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border p-0.5">{(["abiertos","todos"] as const).map(f=><Button key={f} size="sm" variant={filter===f?"secondary":"ghost"} onClick={()=>setFilter(f)}>{f[0].toUpperCase()+f.slice(1)}</Button>)}</div><Input className="sm:w-48" placeholder="Buscar" value={query} onChange={e=>setQuery(e.target.value)}/><Button onClick={()=>setCreating(true)}><Plus data-icon="inline-start"/>Levantar riesgo</Button></div></div><div className="pt-3"><Feedback error={error} last={last} activity={activity}/></div></CardHeader>
   <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Riesgo</TableHead><TableHead>Categoría</TableHead><TableHead>Proyecto</TableHead><TableHead>I × P</TableHead><TableHead>Residual</TableHead><TableHead>Mitigaciones</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
   <TableBody>{rows.length===0?<TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin riesgos para este filtro</TableCell></TableRow>:rows.map(r=><TableRow key={r.code} className="cursor-pointer" onClick={()=>setSelectedCode(r.code)}><TableCell className="font-mono text-primary">{r.code}</TableCell><TableCell className="min-w-64 font-medium">{r.title}</TableCell><TableCell className="text-muted-foreground">{r.category}</TableCell><TableCell className="text-xs text-muted-foreground">{r.projectName?.split(" — ")[0]??"—"}</TableCell><TableCell className="font-mono">{r.impact}×{r.likelihood}</TableCell><TableCell><span className={`font-mono ${r.overAppetite?"text-destructive":""}`}>{r.residual.toFixed(1)}</span>{r.overAppetite&&<Badge variant="destructive" className="ml-2">sobre apetito</Badge>}</TableCell><TableCell><div className="flex min-w-28 items-center gap-2"><Progress value={r.mitigationsPlanned?(r.mitigationsDone/r.mitigationsPlanned)*100:0}/><span className="font-mono text-xs">{r.mitigationsDone}/{r.mitigationsPlanned}</span></div></TableCell><TableCell><Badge variant={r.status==="Abierto"?"outline":r.status==="Aceptado"?"destructive":"secondary"}>{r.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>

  <Sheet open={creating} onOpenChange={o=>!o&&setCreating(false)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Levantar riesgo</SheetTitle><SheetDescription>Residual estimado sin mitigar: <span className={`font-mono ${previewResidual>riskAppetite?"text-destructive":"text-success"}`}>{previewResidual.toFixed(1)}</span> contra apetito {riskAppetite.toFixed(1)}</SheetDescription></SheetHeader>
   <div className="flex flex-col gap-4 px-4 pb-6"><TextField label="Riesgo" value={fTitle} onChange={setFTitle} placeholder="Ej. Dependencia de un único proveedor de nube"/><SelectField label="Categoría" value={fCategory} onChange={setFCategory} options={CATEGORIES.map(c=>({value:c,label:c}))}/><SelectField label="Proyecto asociado" value={fProject} onChange={setFProject} options={[{value:"ninguno",label:"Ninguno"},...projects.map(p=>({value:p.code,label:p.name}))]} hint="Si lo hay, EDM defenderá el proyecto cuando escale"/>{slider("Impacto",fImpact,setFImpact)}{slider("Probabilidad",fLikelihood,setFLikelihood)}{slider("Mitigaciones planificadas",fPlanned,setFPlanned,8)}<TextField label="Responsable" value={fOwner} onChange={setFOwner}/><Button disabled={busy||!fTitle.trim()} onClick={create}>{busy?"Registrando...":"Registrar riesgo"}</Button></div></SheetContent></Sheet>

  <Sheet open={!!selected} onOpenChange={o=>!o&&setSelectedCode(null)}><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle className="font-mono text-primary">{selected?.code}</SheetTitle><SheetDescription>{selected?.title}</SheetDescription></SheetHeader>
   {selected&&<div className="flex flex-col gap-4 px-4 pb-6"><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-muted-foreground">Categoría</dt><dd>{selected.category}</dd><dt className="text-muted-foreground">Proyecto</dt><dd>{selected.projectName??"—"}</dd><dt className="text-muted-foreground">Impacto × probabilidad</dt><dd className="font-mono">{selected.impact} × {selected.likelihood}</dd><dt className="text-muted-foreground">Residual</dt><dd className={`font-mono ${selected.overAppetite?"text-destructive":""}`}>{selected.residual.toFixed(1)} / apetito {riskAppetite.toFixed(1)}</dd><dt className="text-muted-foreground">Mitigaciones</dt><dd className="font-mono">{selected.mitigationsDone} de {selected.mitigationsPlanned}</dd><dt className="text-muted-foreground">Responsable</dt><dd>{selected.owner}</dd><dt className="text-muted-foreground">Levantado</dt><dd>{selected.raisedLabel}</dd><dt className="text-muted-foreground">Estado</dt><dd>{selected.status}</dd></dl>
   {selected.status==="Abierto"&&<><Field label="Ejecutar una mitigación" hint="Cada mitigación reduce el residual. Si cae bajo el apetito, la negociación se retira sola."><Button disabled={busy||selected.mitigationsDone>=selected.mitigationsPlanned} onClick={()=>run({type:"risk.mitigate",payload:{code:selected.code}})}>{busy?"Registrando...":`Marcar mitigación ${Math.min(selected.mitigationsDone+1,selected.mitigationsPlanned)} de ${selected.mitigationsPlanned}`}</Button></Field><Field label="Cerrar el riesgo"><SelectField label="" value={closeStatus} onChange={setCloseStatus} options={STATUSES.filter(s=>s.value!=="Abierto")}/><Button variant="outline" disabled={busy} onClick={async()=>{if(await run({type:"risk.close",payload:{code:selected.code,status:closeStatus}}))setSelectedCode(null)}}>Cerrar como {closeStatus.toLowerCase()}</Button></Field></>}</div>}</SheetContent></Sheet>
 </div>
}
