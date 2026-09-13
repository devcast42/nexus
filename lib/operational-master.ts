// Datos MAESTROS de la capa operativa: el catálogo con el que opera la organización.
// Esto sí se siembra, como en cualquier sistema real. Lo transaccional (incidentes,
// cambios, riesgos, eventos, pruebas) nunca se siembra: entra por la API operativa.

export const services = [
 {code:"SVC-ERP",name:"ERP corporativo",criticality:"Crítico" as const,owner:"Dirección de Finanzas",targetAvailability:99.9,slaCriticalMinutes:60,slaHighMinutes:240},
 {code:"SVC-PAY",name:"Pasarela de pagos",criticality:"Crítico" as const,owner:"Dirección Comercial",targetAvailability:99.95,slaCriticalMinutes:30,slaHighMinutes:120},
 {code:"SVC-WEB",name:"Portal de clientes",criticality:"Crítico" as const,owner:"Dirección Comercial",targetAvailability:99.9,slaCriticalMinutes:60,slaHighMinutes:240},
 {code:"SVC-RED",name:"Red y conectividad",criticality:"Crítico" as const,owner:"Gerencia de Infraestructura",targetAvailability:99.9,slaCriticalMinutes:30,slaHighMinutes:120},
 {code:"SVC-CRM",name:"CRM comercial",criticality:"Alto" as const,owner:"Dirección Comercial",targetAvailability:99.5,slaCriticalMinutes:120,slaHighMinutes:480},
 {code:"SVC-MAIL",name:"Correo y colaboración",criticality:"Alto" as const,owner:"Gerencia de Servicios",targetAvailability:99.5,slaCriticalMinutes:120,slaHighMinutes:480},
 {code:"SVC-BI",name:"Plataforma analítica",criticality:"Medio" as const,owner:"Gerencia de Datos",targetAvailability:99,slaCriticalMinutes:240,slaHighMinutes:960},
 {code:"SVC-RRHH",name:"Portal de personas",criticality:"Medio" as const,owner:"Dirección de Personas",targetAvailability:99,slaCriticalMinutes:240,slaHighMinutes:960},
]

export const suppliers = [
 {code:"SUP-CLOUD",name:"Andes Cloud",criticality:"Crítico" as const,service:"Infraestructura como servicio",contractMonths:14},
 {code:"SUP-SOC",name:"Centinela SOC",criticality:"Crítico" as const,service:"Monitoreo de seguridad gestionado",contractMonths:7},
 {code:"SUP-ERP",name:"Nortia Systems",criticality:"Alto" as const,service:"Soporte y evolutivos del ERP",contractMonths:20},
 {code:"SUP-NET",name:"Telecom Andina",criticality:"Alto" as const,service:"Enlaces y conectividad",contractMonths:3},
 {code:"SUP-DEV",name:"Kodea Software",criticality:"Medio" as const,service:"Fábrica de desarrollo",contractMonths:11},
 {code:"SUP-BI",name:"Datalab Consultores",criticality:"Bajo" as const,service:"Consultoría de datos",contractMonths:5},
]

// Cada control se prueba periódicamente y su resultado alimenta al objetivo COBIT
// que le corresponde. Es el puente entre la operación y MEA02.
export const controls = [
 {code:"CTL-01",name:"Aprobación formal de cambios",objective:"BAI06",owner:"Gerencia de Cambios",frequencyDays:30},
 {code:"CTL-02",name:"Pruebas de aceptación antes de producción",objective:"BAI07",owner:"Gerencia de Calidad",frequencyDays:30},
 {code:"CTL-03",name:"Revisión de accesos privilegiados",objective:"DSS05",owner:"Seguridad de la Información",frequencyDays:30},
 {code:"CTL-04",name:"Gestión de vulnerabilidades",objective:"APO13",owner:"Seguridad de la Información",frequencyDays:15},
 {code:"CTL-05",name:"Prueba de respaldo y restauración",objective:"DSS04",owner:"Gerencia de Infraestructura",frequencyDays:90},
 {code:"CTL-06",name:"Monitoreo de disponibilidad y capacidad",objective:"BAI04",owner:"Gerencia de Infraestructura",frequencyDays:30},
 {code:"CTL-07",name:"Registro y clasificación de incidentes",objective:"DSS02",owner:"Mesa de Servicio",frequencyDays:30},
 {code:"CTL-08",name:"Análisis de causa raíz de problemas",objective:"DSS03",owner:"Gerencia de Servicios",frequencyDays:30},
 {code:"CTL-09",name:"Evaluación de proveedores críticos",objective:"APO10",owner:"Gerencia de Abastecimiento",frequencyDays:90},
 {code:"CTL-10",name:"Revisión de acuerdos de servicio",objective:"APO09",owner:"Gerencia de Servicios",frequencyDays:90},
 {code:"CTL-11",name:"Registro y valoración de riesgos",objective:"APO12",owner:"Gerencia de Riesgos",frequencyDays:30},
 {code:"CTL-12",name:"Conciliación de datos maestros",objective:"APO14",owner:"Gerencia de Datos",frequencyDays:30},
 {code:"CTL-13",name:"Control presupuestal de TI",objective:"APO06",owner:"Dirección de Finanzas",frequencyDays:30},
 {code:"CTL-14",name:"Segregación de funciones",objective:"DSS06",owner:"Auditoría Interna",frequencyDays:90},
 {code:"CTL-15",name:"Cumplimiento normativo externo",objective:"MEA03",owner:"Cumplimiento",frequencyDays:90},
 {code:"CTL-16",name:"Inventario y conciliación de activos",objective:"BAI09",owner:"Gerencia de Infraestructura",frequencyDays:90},
]
