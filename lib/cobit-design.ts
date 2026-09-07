// Factores de diseño de COBIT 2019 (DF1-DF10) y su influencia sobre los 40 objetivos.
//
// PROCEDENCIA DE LOS PESOS: los valores de `weights` son una calibración propia de
// este proyecto, NO las tablas del COBIT 2019 Design Guide / Toolkit de ISACA, que
// son material licenciado. La ESTRUCTURA del cálculo sí sigue el modelo de COBIT:
// cada valor de un factor aporta un peso a ciertos objetivos, se suman ponderados
// por la intensidad que elige el usuario y el resultado se normaliza a importancia
// relativa. Para usar las tablas oficiales basta reemplazar los pesos de la tabla
// design_factor_weights; el motor no cambia.
//
// input:
//   "rating" -> cada valor se puntúa 1-5 (3 = neutro), como los arquetipos de DF1/DF7
//   "toggle" -> cada valor se marca o no (aplica / no aplica)
//   "choice" -> se elige un único valor del factor

export type DesignInput = "rating" | "toggle" | "choice"
export type DesignValue = { key: string; label: string; weights: Record<string, number> }
export type DesignFactor = { code: string; name: string; description: string; input: DesignInput; values: DesignValue[] }

export const designFactors: DesignFactor[] = [
 {code:"DF1",name:"Estrategia empresarial",description:"Arquetipo estratégico dominante de la organización",input:"rating",values:[
  {key:"growth",label:"Crecimiento / Adquisición",weights:{APO02:3,APO05:3,EDM02:3,BAI01:2,APO08:2,BAI11:2,APO06:2}},
  {key:"innovation",label:"Innovación / Diferenciación",weights:{APO04:4,APO02:3,BAI03:3,EDM02:2,APO05:2,BAI05:2}},
  {key:"cost",label:"Liderazgo en costos",weights:{APO06:4,EDM04:3,APO10:2,DSS01:2,BAI09:2,APO09:2}},
  {key:"service",label:"Servicio al cliente / Estabilidad",weights:{APO09:3,DSS02:3,DSS04:3,APO08:3,DSS01:2,BAI04:2}},
 ]},
 {code:"DF2",name:"Metas empresariales",description:"Metas del cuadro de mando integral que la organización persigue",input:"toggle",values:[
  {key:"EG01",label:"Portafolio de productos y servicios competitivos",weights:{APO02:2,APO04:2,APO05:2,BAI03:2}},
  {key:"EG02",label:"Riesgo de negocio gestionado",weights:{APO12:4,EDM03:3,MEA02:2,DSS04:2}},
  {key:"EG03",label:"Cumplimiento de leyes y regulaciones externas",weights:{MEA03:4,MEA02:3,APO13:2,DSS06:2}},
  {key:"EG04",label:"Calidad de la información financiera",weights:{DSS06:3,MEA02:3,APO14:2,MEA04:2}},
  {key:"EG05",label:"Cultura de servicio orientada al cliente",weights:{APO08:3,DSS02:3,APO09:2}},
  {key:"EG06",label:"Continuidad y disponibilidad del servicio",weights:{DSS04:4,BAI04:3,DSS01:3,DSS03:2}},
  {key:"EG07",label:"Calidad de la información de gestión",weights:{APO14:4,BAI08:3,MEA01:2}},
  {key:"EG08",label:"Optimización de procesos internos",weights:{APO11:3,DSS06:3,BAI02:2,APO01:2}},
  {key:"EG09",label:"Optimización de costos de procesos",weights:{APO06:3,EDM04:3,DSS01:2,APO10:2}},
  {key:"EG10",label:"Habilidades y motivación del personal",weights:{APO07:4,BAI05:2,BAI08:2}},
  {key:"EG11",label:"Cumplimiento de políticas internas",weights:{MEA02:3,APO01:3,MEA04:2}},
  {key:"EG12",label:"Programas de transformación digital gestionados",weights:{BAI05:3,APO04:3,BAI01:3,APO02:2}},
  {key:"EG13",label:"Innovación de productos y negocio",weights:{APO04:4,BAI03:3,APO02:2,EDM02:2}},
 ]},
 {code:"DF3",name:"Perfil de riesgo",description:"Categorías de riesgo con exposición relevante para la organización",input:"toggle",values:[
  {key:"R01",label:"Decisiones de inversión en TI",weights:{EDM02:3,APO05:3,APO06:2}},
  {key:"R02",label:"Ciclo de vida de programas y proyectos",weights:{BAI01:4,BAI11:3,BAI05:2}},
  {key:"R03",label:"Costo y supervisión de TI",weights:{APO06:4,EDM04:2,MEA01:2}},
  {key:"R04",label:"Habilidades y comportamiento del personal de TI",weights:{APO07:4,BAI08:2}},
  {key:"R05",label:"Arquitectura empresarial y de TI",weights:{APO03:4,BAI03:2,APO04:2}},
  {key:"R06",label:"Incidentes de infraestructura operativa",weights:{DSS01:4,DSS03:3,BAI04:2}},
  {key:"R07",label:"Acciones no autorizadas",weights:{DSS05:4,APO13:3,MEA02:2}},
  {key:"R08",label:"Adopción y uso de software",weights:{BAI05:3,BAI07:3,BAI08:2}},
  {key:"R09",label:"Incidentes de hardware",weights:{BAI09:3,DSS01:3,BAI04:2}},
  {key:"R10",label:"Fallas de software",weights:{BAI03:3,BAI06:3,DSS03:2}},
  {key:"R11",label:"Ataques lógicos (hacking, malware)",weights:{APO13:4,DSS05:4,DSS04:2}},
  {key:"R12",label:"Incidentes de terceros y proveedores",weights:{APO10:4,APO09:3,MEA03:2}},
  {key:"R13",label:"Incumplimiento normativo",weights:{MEA03:4,MEA02:3,APO13:2}},
  {key:"R14",label:"Asuntos geopolíticos",weights:{APO10:2,DSS04:2,MEA03:2}},
  {key:"R15",label:"Robo de infraestructura",weights:{BAI09:3,DSS05:3}},
  {key:"R16",label:"Destrucción de infraestructura",weights:{DSS04:4,BAI09:2,DSS01:2}},
  {key:"R17",label:"Innovación tecnológica",weights:{APO04:4,APO02:2,BAI03:2}},
  {key:"R18",label:"Entornos industriales",weights:{DSS01:2,BAI04:2,APO13:2}},
  {key:"R19",label:"Gestión de datos e información",weights:{APO14:4,DSS06:2,MEA02:2}},
 ]},
 {code:"DF4",name:"Problemas actuales de TI",description:"Situaciones que la organización enfrenta hoy",input:"toggle",values:[
  {key:"I01",label:"Frustración entre el negocio y las áreas de TI",weights:{APO08:4,EDM05:2,APO09:2}},
  {key:"I02",label:"Costos de TI percibidos como excesivos",weights:{APO06:4,EDM04:3,APO10:2}},
  {key:"I03",label:"Iniciativas de TI que no cumplen la estrategia",weights:{APO02:4,APO05:3,EDM02:2}},
  {key:"I04",label:"Incidentes operativos recurrentes",weights:{DSS03:4,DSS01:3,DSS02:3}},
  {key:"I05",label:"Proveedores que no cumplen lo pactado",weights:{APO10:4,APO09:3}},
  {key:"I06",label:"Brechas de conocimiento y habilidades",weights:{APO07:4,BAI08:3}},
  {key:"I07",label:"Problemas de calidad de datos",weights:{APO14:4,DSS06:2,MEA02:2}},
  {key:"I08",label:"Deuda técnica y arquitectura fragmentada",weights:{APO03:4,BAI03:2,BAI10:2}},
  {key:"I09",label:"Incidentes de seguridad y fuga de información",weights:{APO13:4,DSS05:4,MEA03:2}},
  {key:"I10",label:"Shadow IT y shadow AI",weights:{APO01:3,APO13:3,MEA02:3,APO03:2}},
 ]},
 {code:"DF5",name:"Panorama de amenazas",description:"Nivel de amenaza del entorno en que opera la organización",input:"choice",values:[
  {key:"normal",label:"Normal",weights:{APO13:1,DSS05:1}},
  {key:"high",label:"Alto",weights:{APO13:4,DSS05:4,DSS04:3,APO12:3,MEA02:2}},
 ]},
 {code:"DF6",name:"Requisitos de cumplimiento",description:"Exigencia regulatoria a la que está sujeta la organización",input:"choice",values:[
  {key:"low",label:"Bajo",weights:{MEA03:1}},
  {key:"normal",label:"Normal",weights:{MEA03:2,MEA02:2}},
  {key:"high",label:"Alto",weights:{MEA03:4,MEA02:4,MEA04:3,APO13:2,DSS06:2}},
 ]},
 {code:"DF7",name:"Rol de TI",description:"Papel que cumple TI dentro del negocio",input:"rating",values:[
  {key:"support",label:"Soporte",weights:{DSS01:3,DSS02:3,APO09:2}},
  {key:"factory",label:"Fábrica",weights:{DSS01:4,DSS04:3,BAI04:3,DSS03:2}},
  {key:"turnaround",label:"Transformación",weights:{APO04:3,BAI01:3,BAI05:3,APO02:2}},
  {key:"strategic",label:"Estratégico",weights:{APO02:4,EDM02:3,APO04:3,APO05:3,EDM01:2}},
 ]},
 {code:"DF8",name:"Modelo de sourcing",description:"Cómo se abastece la organización de capacidades de TI",input:"rating",values:[
  {key:"outsourcing",label:"Tercerización",weights:{APO10:4,APO09:3,MEA03:2}},
  {key:"cloud",label:"Nube",weights:{APO10:3,APO13:3,BAI10:2,DSS05:2,APO09:2}},
  {key:"insourced",label:"Interno",weights:{APO07:3,BAI09:2,DSS01:2}},
 ]},
 {code:"DF9",name:"Métodos de implementación",description:"Cómo construye y entrega soluciones la organización",input:"rating",values:[
  {key:"agile",label:"Ágil",weights:{BAI02:3,BAI03:3,BAI11:2,APO11:2}},
  {key:"devops",label:"DevOps",weights:{BAI06:4,BAI07:3,BAI03:2,DSS01:2}},
  {key:"traditional",label:"Tradicional",weights:{BAI01:3,BAI11:3,BAI02:2}},
 ]},
 {code:"DF10",name:"Estrategia de adopción tecnológica",description:"Con qué rapidez adopta la organización tecnología nueva",input:"choice",values:[
  {key:"firstmover",label:"Pionera",weights:{APO04:4,APO12:3,APO02:2,BAI03:2}},
  {key:"follower",label:"Seguidora",weights:{APO04:2,BAI03:2,APO03:2}},
  {key:"slow",label:"Adoptante tardía",weights:{DSS01:2,BAI09:2,APO06:2}},
 ]},
]

// Configuración por defecto: neutro en los factores puntuados, sin problemas marcados,
// y un valor de partida en los factores de elección única.
const defaultChoices = ["DF5.normal","DF6.normal","DF10.follower"]
export const defaultDesignInputs: Record<string, number> = Object.fromEntries(
  designFactors.flatMap(f =>
    f.values.map(v => {
      const id = `${f.code}.${v.key}`
      if (f.input === "rating") return [id, 3]
      return [id, defaultChoices.includes(id) ? 1 : 0]
    })
  )
)
