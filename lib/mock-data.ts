export type Domain = "EDM" | "APO" | "BAI" | "DSS" | "MEA"
export type Objective = { code: string; name: string; domain: Domain; score: number; priority: "Alta" | "Media" | "Baja"; agent: string; history: number[] }

export const domains = [
  { code: "EDM" as Domain, name: "Evaluar, Dirigir y Monitorear", score: 91, trend: 3.2 },
  { code: "APO" as Domain, name: "Alinear, Planificar y Organizar", score: 67, trend: -5.1 },
  { code: "BAI" as Domain, name: "Construir, Adquirir e Implementar", score: 78, trend: 1.8 },
  { code: "DSS" as Domain, name: "Entregar, Servicio y Soporte", score: 84, trend: 2.4 },
  { code: "MEA" as Domain, name: "Monitorear, Evaluar y Valorar", score: 73, trend: -1.2 },
]

const names: Record<Domain, string[]> = {
EDM:["Marco de gobierno asegurado","Entrega de beneficios asegurada","Optimización del riesgo asegurada","Optimización de recursos asegurada","Involucramiento de interesados asegurado"],
APO:["Marco de gestión de I&T","Estrategia gestionada","Arquitectura empresarial gestionada","Innovación gestionada","Portafolio gestionado","Presupuesto y costos gestionados","Recursos humanos gestionados","Relaciones gestionadas","Acuerdos de servicio gestionados","Proveedores gestionados","Calidad gestionada","Riesgo gestionado","Seguridad gestionada","Datos gestionados"],
BAI:["Programas gestionados","Definición de requisitos gestionada","Identificación y construcción de soluciones","Disponibilidad y capacidad gestionadas","Cambio organizacional gestionado","Cambios de TI gestionados","Aceptación y transición del cambio","Conocimiento gestionado","Activos gestionados","Configuración gestionada","Proyectos gestionados"],
DSS:["Operaciones gestionadas","Solicitudes e incidentes gestionados","Problemas gestionados","Continuidad gestionada","Servicios de seguridad gestionados","Controles de procesos de negocio gestionados"],
MEA:["Desempeño y conformidad monitoreados","Sistema de control interno monitoreado","Cumplimiento externo gestionado","Aseguramiento gestionado"],
}
const bases: Record<Domain, number>={EDM:88,APO:68,BAI:77,DSS:83,MEA:74}
export const objectives: Objective[] = (Object.keys(names) as Domain[]).flatMap(domain => names[domain].map((name,i)=>{
 const score=Math.max(42,Math.min(96,bases[domain]+((i*7)%19)-9));
 return {code:`${domain}${String(i+1).padStart(2,"0")}`,name,domain,score,priority:score<65?"Alta":score<80?"Media":"Baja",agent:`Agente ${domain}`,history:[score-7,score-5,score-4,score-2,score+1,score].map(v=>Math.max(35,Math.min(98,v)))}
}))
export const alerts = [
 {id:1,severity:"critical",text:"APO12 — Riesgo del proyecto Atlas escaló a nivel alto",agent:"Centinela APO",time:"hace 4 min"},
 {id:2,severity:"warning",text:"DSS04 — Prueba de continuidad fuera de ventana",agent:"Guardián DSS",time:"hace 12 min"},
 {id:3,severity:"info",text:"BAI06 — Cambio CHG-291 aprobado sin evidencia completa",agent:"Arquitecto BAI",time:"hace 21 min"},
 {id:4,severity:"warning",text:"MEA02 — Control de acceso con eficacia decreciente",agent:"Auditor MEA",time:"hace 38 min"},
 {id:5,severity:"info",text:"EDM03 — Apetito de riesgo revisado por el comité",agent:"Centinela EDM",time:"hace 1 h"},
]
export const agents = [
 {domain:"EDM",name:"Centinela Estratégico",status:"Activo",action:"Validó alineación del portafolio",count:5,data:[4,7,5,8,9,8]},
 {domain:"APO",name:"Navegante de Riesgo",status:"Alerta",action:"Escaló riesgo del proyecto Atlas",count:14,data:[5,4,8,7,11,14]},
 {domain:"BAI",name:"Arquitecto de Cambio",status:"Analizando",action:"Revisando evidencia de transición",count:11,data:[3,6,5,9,7,10]},
 {domain:"DSS",name:"Guardián Operativo",status:"Activo",action:"Verificó SLA de servicios críticos",count:6,data:[8,7,9,8,10,9]},
 {domain:"MEA",name:"Auditor Continuo",status:"Analizando",action:"Correlacionando controles internos",count:4,data:[2,5,4,6,8,7]},
 {domain:"NX",name:"Orquestador Nexus",status:"Activo",action:"Sincronizó consenso multiagente",count:40,data:[9,12,11,15,14,18]},
]
export const aiSystems = [
 {name:"Sales Copilot",area:"Comercial",desc:"Asistente generativo para propuestas",risk:"Alto",controls:["APO12","APO13","MEA03"],status:"Pendiente"},
 {name:"Talent Match",area:"Personas",desc:"Ranking automatizado de candidatos",risk:"Alto",controls:["EDM03","APO14"],status:"Bloqueado"},
 {name:"Invoice Vision",area:"Finanzas",desc:"Extracción automática de facturas",risk:"Medio",controls:["DSS06","BAI10"],status:"Aprobado"},
 {name:"Support Sense",area:"Servicio",desc:"Clasificación de solicitudes",risk:"Medio",controls:["DSS02","APO11"],status:"Pendiente"},
 {name:"Code Pilot",area:"Tecnología",desc:"Asistente de desarrollo interno",risk:"Bajo",controls:["BAI03","APO13"],status:"Aprobado"},
 {name:"Market Pulse",area:"Estrategia",desc:"Síntesis de inteligencia competitiva",risk:"Bajo",controls:["EDM02","APO04"],status:"Pendiente"},
]
