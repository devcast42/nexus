"use client"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card"
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from "@/components/ui/sheet"
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table"
import type { ServiceView,SupplierView } from "@/lib/types"
import { Feedback,Field,TextField } from "./shared"
import { useOperations } from "./use-operations"

export function ServicesPanel({services,suppliers}:{services:ServiceView[];suppliers:SupplierView[]}){
 const {run,busy,error,last}=useOperations()
 const [service,setService]=useState<ServiceView|null>(null);const [supplier,setSupplier]=useState<SupplierView|null>(null)
 const [mAvail,setMAvail]=useState("99.9");const [mBreaches,setMBreaches]=useState("0")
 const [eCompliance,setECompliance]=useState("95");const [eFindings,setEFindings]=useState("0");const [eBy,setEBy]=useState("Gerencia de Abastecimiento")
 const critVariant=(c:string)=>c==="Crítico"?"destructive":c==="Alto"?"default":"secondary"
 async function measure(){if(service&&await run({type:"sla.measure",payload:{serviceCode:service.code,measuredAvailability:Number(mAvail),breaches:Number(mBreaches)}}))setService(null)}
 async function evaluate(){if(supplier&&await run({type:"supplier.evaluate",payload:{supplierCode:supplier.code,slaCompliance:Number(eCompliance),findings:Number(eFindings),evaluatedBy:eBy}}))setSupplier(null)}

 return <div className="flex flex-col gap-4"><Feedback error={error} last={last}/>
  <Card><CardHeader><CardTitle>Catálogo de servicios</CardTitle><CardDescription>Maestro sembrado. La disponibilidad medida por periodo alimenta a BAI04 y APO09.</CardDescription></CardHeader>
   <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Criticidad</TableHead><TableHead>Propietario</TableHead><TableHead>Objetivo</TableHead><TableHead>Último periodo</TableHead><TableHead>Incidentes abiertos</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
   <TableBody>{services.map(s=><TableRow key={s.code}><TableCell><span className="font-mono text-primary">{s.code}</span> <span className="font-medium">{s.name}</span></TableCell><TableCell><Badge variant={critVariant(s.criticality)}>{s.criticality}</Badge></TableCell><TableCell className="text-muted-foreground">{s.owner}</TableCell><TableCell className="font-mono">{s.targetAvailability}%</TableCell><TableCell className="font-mono text-xs">{s.latestAvailability===null?"—":<span className={s.latestAvailability>=s.targetAvailability?"text-success":"text-destructive"}>{s.latestAvailability.toFixed(2)}% · {s.latestBreaches} incumpl.</span>}</TableCell><TableCell className="font-mono">{s.openIncidents}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={()=>{setService(s);setMAvail(String(s.targetAvailability))}}>Medir periodo</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  <Card><CardHeader><CardTitle>Proveedores</CardTitle><CardDescription>Maestro sembrado. La última evaluación de cada uno alimenta a APO10.</CardDescription></CardHeader>
   <CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>Criticidad</TableHead><TableHead>Servicio</TableHead><TableHead>Contrato</TableHead><TableHead>Última evaluación</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
   <TableBody>{suppliers.map(s=><TableRow key={s.code}><TableCell><span className="font-mono text-primary">{s.code}</span> <span className="font-medium">{s.name}</span></TableCell><TableCell><Badge variant={critVariant(s.criticality)}>{s.criticality}</Badge></TableCell><TableCell className="text-muted-foreground">{s.service}</TableCell><TableCell className="text-xs"><span className={s.contractDaysLeft<90?"text-destructive":""}>{s.contractEndLabel} ({s.contractDaysLeft} d)</span></TableCell><TableCell className="font-mono text-xs">{s.latestCompliance===null?"sin evaluar":<span className={s.latestCompliance>=90?"text-success":"text-warning"}>{s.latestCompliance}% · {s.latestFindings} hallazgos · {s.latestEvaluatedLabel}</span>}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={()=>setSupplier(s)}>Evaluar</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  <Sheet open={!!service} onOpenChange={o=>!o&&setService(null)}><SheetContent className="sm:max-w-lg"><SheetHeader><SheetTitle>Medir periodo · {service?.name}</SheetTitle><SheetDescription>Objetivo comprometido: {service?.targetAvailability}%</SheetDescription></SheetHeader><div className="flex flex-col gap-4 px-4 pb-6"><TextField label="Disponibilidad medida (%)" type="number" value={mAvail} onChange={setMAvail}/><TextField label="Incumplimientos en el periodo" type="number" value={mBreaches} onChange={setMBreaches}/><Button disabled={busy} onClick={measure}>{busy?"Registrando...":"Registrar medición"}</Button></div></SheetContent></Sheet>
  <Sheet open={!!supplier} onOpenChange={o=>!o&&setSupplier(null)}><SheetContent className="sm:max-w-lg"><SheetHeader><SheetTitle>Evaluar · {supplier?.name}</SheetTitle><SheetDescription>{supplier?.service}</SheetDescription></SheetHeader><div className="flex flex-col gap-4 px-4 pb-6"><TextField label="Cumplimiento de SLA (%)" type="number" value={eCompliance} onChange={setECompliance}/><TextField label="Hallazgos" type="number" value={eFindings} onChange={setEFindings}/><TextField label="Evaluado por" value={eBy} onChange={setEBy}/><Field label="" hint="La evaluación más reciente es la que cuenta para APO10."><Button disabled={busy} onClick={evaluate}>{busy?"Registrando...":"Registrar evaluación"}</Button></Field></div></SheetContent></Sheet>
 </div>
}
