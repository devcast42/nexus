export type Domain = "EDM" | "APO" | "BAI" | "DSS" | "MEA"
export type Objective = { code: string; name: string; domain: Domain; score: number; priority: "Alta" | "Media" | "Baja"; agent: string; history: number[] }

export const domains = [
  { code: "EDM" as Domain, target: 4.5, name: "Evaluar, Dirigir y Monitorear", score: 91, trend: 3.2 },
  { code: "APO" as Domain, target: 4.2, name: "Alinear, Planificar y Organizar", score: 67, trend: -5.1 },
  { code: "BAI" as Domain, target: 4.1, name: "Construir, Adquirir e Implementar", score: 78, trend: 1.8 },
  { code: "DSS" as Domain, target: 4.3, name: "Entregar, Servicio y Soporte", score: 84, trend: 2.4 },
  { code: "MEA" as Domain, target: 4.2, name: "Monitorear, Evaluar y Valorar", score: 73, trend: -1.2 },
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
export type Outcome = { label: string; impact: string; delta: number }
export type Negotiation = {
  id: number; objective: string; domain: Domain; severity: "critical" | "warning" | "info"
  fact: string
  initiator: Domain; initiatorPosition: string
  counterpart: Domain; counterpartPosition: string
  principle: string
  outcome: "resolved" | "escalated"
  resolution?: string
  escalationReason?: string
  proposal?: string
  approve?: Outcome; reject?: Outcome
  time: string
}
export type Notice = { id: number; objective: string; domain: Domain; severity: "critical" | "warning" | "info"; agent: string; fact: string; time: string }

// Discrepancias entre agentes. Las que no caben en el mandato vigente escalan y se
// convierten en las decisiones que el comité debe firmar.
export const negotiations: Negotiation[] = [
 {id:1,objective:"APO12",domain:"APO",severity:"critical",time:"hace 4 min",
  fact:"El riesgo residual del proyecto Atlas superó el umbral 4.2 fijado en el diseño de gobierno. Faltan dos evidencias de mitigación.",
  initiator:"APO",initiatorPosition:"Detener Atlas hasta cerrar las dos evidencias de mitigación pendientes.",
  counterpart:"EDM",counterpartPosition:"Sostener Atlas: es el vehículo del objetivo de crecimiento que el comité aprobó para el ejercicio.",
  principle:"EDM03",outcome:"escalated",
  escalationReason:"Ninguna de las dos posiciones cabe en el mandato: continuar exige operar por encima del apetito de riesgo que fijó el comité, y detener revierte una prioridad que el propio comité aprobó.",
  proposal:"Detener Atlas hasta que el propietario del riesgo cierre las evidencias pendientes.",
  approve:{label:"Detener Atlas",impact:"El proyecto queda suspendido y APO12 vuelve al rango tolerado. Se notifica al propietario del riesgo.",delta:8},
  reject:{label:"Aceptar el riesgo",impact:"Atlas continúa. Aceptas formalmente un riesgo por encima del umbral que fijaste y queda registrado a tu nombre.",delta:-4}},
 {id:2,objective:"DSS04",domain:"DSS",severity:"warning",time:"hace 12 min",
  fact:"La prueba de continuidad del servicio crítico se ejecutó fuera de la ventana acordada con el negocio.",
  initiator:"DSS",initiatorPosition:"Repetir la prueba dentro de ventana en los próximos 7 días.",
  counterpart:"BAI",counterpartPosition:"No hay ventana libre en 7 días: el calendario de cambios está comprometido hasta fin de mes.",
  principle:"DSS04",outcome:"escalated",
  escalationReason:"Resolverlo obliga a desplazar cambios ya aprobados o a dar por válida una prueba fuera de ventana. Ambas salidas modifican compromisos que los agentes no pueden alterar por sí solos.",
  proposal:"Reprogramar la prueba dentro de los próximos 7 días desplazando el calendario de cambios.",
  approve:{label:"Reprogramar prueba",impact:"Se agenda dentro de ventana y DSS04 recupera conformidad. Dos cambios se desplazan una semana.",delta:5},
  reject:{label:"Aceptar la desviación",impact:"La prueba se da por válida fuera de ventana. La excepción queda documentada para la próxima auditoría.",delta:-3}},
 {id:3,objective:"BAI06",domain:"BAI",severity:"warning",time:"hace 21 min",
  fact:"El cambio CHG-291 pasó a producción con evidencia de aprobación incompleta.",
  initiator:"MEA",initiatorPosition:"Revertir CHG-291: sin evidencia completa el control de cambios queda sin efecto.",
  counterpart:"BAI",counterpartPosition:"El cambio es estable en producción y revertirlo introduce un riesgo operativo mayor que el de la evidencia faltante.",
  principle:"BAI06",outcome:"escalated",
  escalationReason:"El principio exige evidencia previa al despliegue, pero aplicarlo ahora significa revertir un cambio estable. Autorizar la excepción solo le corresponde al comité.",
  proposal:"Exigir evidencia retroactiva al responsable del cambio en 48 horas, manteniendo CHG-291 en producción.",
  approve:{label:"Exigir evidencia",impact:"CHG-291 queda condicionado y BAI06 recupera trazabilidad.",delta:6},
  reject:{label:"Aceptar como excepción",impact:"El cambio se ratifica sin evidencia completa. Se crea un precedente que MEA02 vigilará.",delta:-5}},
 {id:4,objective:"BAI04",domain:"BAI",severity:"info",time:"hace 38 min",
  fact:"El despliegue de la versión 4.2 se solicitó para la ventana del viernes.",
  initiator:"BAI",initiatorPosition:"Desplegar la versión 4.2 en la ventana del viernes, ya reservada.",
  counterpart:"DSS",counterpartPosition:"La capacidad proyectada no absorbe el despliegue en esa ventana.",
  principle:"BAI04",outcome:"resolved",
  resolution:"Ventana diferida 48 h con verificación previa de capacidad. Ninguna de las dos posiciones exigía tocar el mandato, así que se resolvió sin escalar."},
 {id:5,objective:"APO05",domain:"APO",severity:"info",time:"hace 1 h",
  fact:"Se propuso reasignar presupuesto del portafolio hacia las iniciativas de crecimiento.",
  initiator:"EDM",initiatorPosition:"Reasignar el presupuesto hacia las cuatro iniciativas de crecimiento del plan.",
  counterpart:"APO",counterpartPosition:"Dos de esas iniciativas no tienen evaluación de riesgo cerrada.",
  principle:"EDM02",outcome:"resolved",
  resolution:"Reasignación aprobada solo para las iniciativas con evaluación cerrada; las otras dos quedan en espera. Cabe dentro del apetito vigente."},
 {id:6,objective:"MEA01",domain:"MEA",severity:"info",time:"hace 2 h",
  fact:"Se propuso ampliar el muestreo de controles de acceso al doble de frecuencia.",
  initiator:"MEA",initiatorPosition:"Duplicar la frecuencia de muestreo sobre todos los controles de acceso.",
  counterpart:"DSS",counterpartPosition:"El muestreo adicional degrada la ventana operativa del equipo de servicio.",
  principle:"MEA01",outcome:"resolved",
  resolution:"Muestreo ampliado solo sobre los controles con eficacia decreciente. Acordado sin alterar prioridades."},
]

// Señales que los agentes reportan sin proponer acción: no hay nada que decidir.
export const notices: Notice[] = [
 {id:1,objective:"MEA02",domain:"MEA",severity:"warning",agent:"Auditor MEA",time:"hace 38 min",
  fact:"La eficacia del control de acceso decrece por tercer periodo consecutivo. El agente sigue recolectando evidencia antes de proponer una acción."},
 {id:2,objective:"EDM03",domain:"EDM",severity:"info",agent:"Centinela EDM",time:"hace 1 h",
  fact:"El comité revisó el apetito de riesgo. Los umbrales vigentes ya fueron aplicados por los agentes."},
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
