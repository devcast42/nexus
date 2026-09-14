"use client"
import { useState } from "react"
import { Activity,AlertTriangle,FolderKanban,GitBranch,Layers,ShieldAlert,ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useGovernance } from "../governance-provider"
import { ChangesPanel } from "./changes-panel"
import { ControlsPanel } from "./controls-panel"
import { IncidentsPanel } from "./incidents-panel"
import { ProjectsPanel } from "./projects-panel"
import { RisksPanel } from "./risks-panel"
import { SecurityPanel } from "./security-panel"
import { ServicesPanel } from "./services-panel"

const tabs=[
 {id:"incidents",label:"Incidentes",icon:Activity},
 {id:"changes",label:"Cambios",icon:GitBranch},
 {id:"risks",label:"Riesgos",icon:AlertTriangle},
 {id:"projects",label:"Proyectos",icon:FolderKanban},
 {id:"security",label:"Seguridad",icon:ShieldAlert},
 {id:"controls",label:"Controles",icon:ClipboardCheck},
 {id:"services",label:"Servicios y proveedores",icon:Layers},
] as const
type Tab=typeof tabs[number]["id"]

// Mesa de trabajo operativa. Todo lo que se registra aquí entra por la misma API
// que usa el generador; el gobierno lo mide y las reglas reaccionan.
export function OperationsView(){
 const {operations,coverage}=useGovernance()
 const [tab,setTab]=useState<Tab>("incidents")
 const counts:Record<Tab,number>={
  incidents:operations.incidents.filter(i=>!i.resolvedAt).length,
  changes:operations.changes.filter(c=>c.deployed&&!c.hasApprovalEvidence&&!c.rolledBack).length,
  risks:operations.risks.filter(r=>r.overAppetite).length,
  projects:operations.projects.filter(p=>p.status==="En riesgo"||p.status==="Detenido").length,
  security:operations.securityEvents.filter(e=>!e.contained).length,
  controls:operations.controls.filter(c=>c.overdue||c.lastTest?.result==="Inefectivo").length,
  services:operations.services.filter(s=>s.latestAvailability!==null&&s.latestAvailability<s.targetAvailability).length,
 }
 return <div className="flex flex-col gap-5">
  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-semibold">Operación</h2><p className="text-muted-foreground">Lo que aquí se registra es lo que el gobierno mide. {coverage.covered} de {coverage.total} objetivos se derivan de esta capa.</p></div><p className="rounded-lg border bg-background/40 px-3 py-2 text-xs text-muted-foreground">Cada registro entra por <code className="font-mono text-primary">POST /api/operations</code> con autor y hora. No hay escritura directa a la base.</p></div>
  <nav className="flex flex-wrap gap-1 rounded-lg border bg-background/40 p-1">{tabs.map(t=><Button key={t.id} size="sm" variant={tab===t.id?"secondary":"ghost"} className="gap-2" onClick={()=>setTab(t.id)}><t.icon className="size-3.5"/>{t.label}{counts[t.id]>0&&<Badge variant={tab===t.id?"default":"outline"} className="ml-1 h-4 min-w-4 px-1 font-mono text-[10px]">{counts[t.id]}</Badge>}</Button>)}</nav>
  {tab==="incidents"&&<IncidentsPanel incidents={operations.incidents} services={operations.services}/>}
  {tab==="changes"&&<ChangesPanel changes={operations.changes} services={operations.services}/>}
  {tab==="risks"&&<RisksPanel risks={operations.risks} projects={operations.projects} riskAppetite={operations.riskAppetite}/>}
  {tab==="projects"&&<ProjectsPanel projects={operations.projects}/>}
  {tab==="security"&&<SecurityPanel events={operations.securityEvents}/>}
  {tab==="controls"&&<ControlsPanel controls={operations.controls}/>}
  {tab==="services"&&<ServicesPanel services={operations.services} suppliers={operations.suppliers}/>}
 </div>
}
