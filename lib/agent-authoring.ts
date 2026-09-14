import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import Groq from "groq-sdk"
import { z } from "zod"
import { activeModel,activeProvider } from "./copilot-provider"
import { ORG_NAME } from "./org"

// Nivel 2 de agentes: la regla decide CUÁNDO hay discrepancia y si cabe en el
// mandato; el modelo escribe QUÉ dice cada agente desde la evidencia, y Nexus
// sintetiza los términos del consenso o la propuesta que llega al comité.
// Si no hay modelo disponible, se usan las plantillas de la regla y se marca
// authoredBy:"rule". El sistema nunca depende del LLM para funcionar.

export type Persona = { code:string; name:string; mandate:string }
export type Op = { type:string; payload:Record<string,unknown> }
export type Draft = {
 ruleKey:string; outcome:"resolved"|"escalated"; objectiveCode:string; principleCode:string; principleName:string
 evidence:string; riskAppetite:number; mandateName:string
 initiator:Persona; counterpart:Persona
 approveOps:Op[]; rejectOps:Op[]
 // Plantillas de la regla: respaldo cuando no hay modelo
 template:{ initiatorPosition:string; counterpartPosition:string; resolution:string|null; escalationReason:string|null; proposal:string|null; approveLabel:string|null; approveImpact:string|null; rejectLabel:string|null; rejectImpact:string|null }
}
export type Authored = Draft["template"] & { authoredBy:"model"|"rule"; authoringModel:string|null }

const Position=z.object({position:z.string().min(20).max(700)})
const Resolved=z.object({resolution:z.string().min(30).max(900)})
const Escalated=z.object({
 escalationReason:z.string().min(30).max(900),
 proposal:z.string().min(20).max(500),
 approve:z.object({label:z.string().min(3).max(60),impact:z.string().min(20).max(500)}),
 reject:z.object({label:z.string().min(3).max(60),impact:z.string().min(20).max(500)}),
})

// Cambiar este número obliga a redactar de nuevo lo ya escrito con el prompt anterior.
export const PROMPT_VERSION="4"

const STYLE="Escribe en español, en primera persona del agente, sin saludos ni preámbulos. Argumenta SOLO con los hechos entregados: cifras, códigos y fechas tal como aparecen. No inventes datos. No menciones el apetito de riesgo salvo que el hecho sea un riesgo con residual. Máximo 60 palabras por campo de texto; las etiquetas de botón, máximo 4 palabras."
const LIMITS="Tus poderes: observar, argumentar y PROPONER acciones a otro agente o al comité. NO puedes ordenar, suspender servicios, detener proyectos ni cerrar riesgos por tu cuenta: eso lo decide el comité. Habla como quien propone, no como quien ejecuta."

// Un 429 trae cuánto esperar. Se respeta hasta dos veces y luego se cede el turno:
// la negociación queda en plantilla y se reintenta en la siguiente evaluación.
async function withRateLimitRetry<T>(call:()=>Promise<T>,attempt=0):Promise<T>{
 try{return await call()}
 catch(error){
  const status=(error as {status?:number}).status
  if(status!==429||attempt>=2)throw error
  const message=error instanceof Error?error.message:""
  const seconds=Number(message.match(/try again in ([\d.]+)s/i)?.[1]??5)
  await new Promise(r=>setTimeout(r,Math.min(15_000,Math.ceil(seconds*1000)+500)))
  return withRateLimitRetry(call,attempt+1)
 }
}

async function completeJSON<T>(system:string,user:string,schema:z.ZodType<T>):Promise<T>{
 return withRateLimitRetry(()=>completeJSONOnce(system,user,schema))
}

async function completeJSONOnce<T>(system:string,user:string,schema:z.ZodType<T>):Promise<T>{
 if(activeProvider()==="groq"){
  const groq=new Groq()
  // gpt-oss razona antes de responder y ese razonamiento cuenta en el presupuesto:
  // sin margen suficiente devuelve JSON vacío. Razonamiento bajo y tope holgado.
  const res=await groq.chat.completions.create({model:activeModel(),temperature:0.4,max_completion_tokens:3000,
   reasoning_effort:"low",
   response_format:{type:"json_object"},
   messages:[{role:"system",content:`${system}\n\nResponde ÚNICAMENTE con un objeto JSON válido con esta forma: ${describe(schema)}`},{role:"user",content:user}]})
  const text=res.choices[0]?.message?.content??""
  return schema.parse(JSON.parse(text))
 }
 const anthropic=new Anthropic()
 const res=await anthropic.messages.parse({model:activeModel(),max_tokens:2000,output_config:{effort:"low",format:zodOutputFormat(schema)},system,messages:[{role:"user",content:user}]})
 if(!res.parsed_output)throw new Error("El modelo no devolvió la estructura esperada")
 return res.parsed_output
}
function describe(schema:z.ZodType){
 if(schema===Position)return '{"position": string}'
 if(schema===Resolved)return '{"resolution": string}'
 return '{"escalationReason": string, "proposal": string, "approve": {"label": string, "impact": string}, "reject": {"label": string, "impact": string}}'
}

async function agentPosition(persona:Persona,other:Persona,draft:Draft,side:"initiator"|"counterpart"){
 const system=`Eres ${persona.name}, agente ${persona.code} del sistema de gobierno de TI de ${ORG_NAME} (COBIT 2019). Tu mandato: ${persona.mandate}\n${LIMITS}\n${STYLE}`
 // La postura la asigna la regla (es lo que hace reproducible el desenlace); el
 // modelo la argumenta con los hechos. No la sustituye ni cede por cortesía.
 const stance=side==="initiator"?draft.template.initiatorPosition:draft.template.counterpartPosition
 const mandateLine=draft.ruleKey.startsWith("risk-")?`Mandato vigente: ${draft.mandateName}, apetito de riesgo ${draft.riskAppetite.toFixed(1)}/5.`:`Mandato vigente: ${draft.mandateName}.`
 const user=`${mandateLine}\nPrincipio COBIT en juego: ${draft.principleCode} (${draft.principleName}).\n\nHechos:\n${draft.evidence}\n\n${side==="initiator"?`Tú levantaste la discrepancia.`:`El agente ${other.code} (${other.name}) sostiene: "${draft.template.initiatorPosition}".`}\nTu postura en esta discrepancia es: "${stance}". Defiéndela con los hechos, con tus razones y desde tu mandato. Mantén la postura aunque el otro tenga argumentos: la discrepancia es real y la resuelve Nexus o el comité, no tú.`
 return (await completeJSON(system,user,Position)).position
}

async function nexusSynthesis(draft:Draft,initiatorPosition:string,counterpartPosition:string){
 const system=`Eres Nexus, el motor de gobierno de ${ORG_NAME}. No decides: aplicas el mandato que fijó el comité. ${STYLE.replace("en primera persona del agente","en tercera persona, tono institucional")}`
 const facts=`Mandato: ${draft.mandateName}${draft.ruleKey.startsWith("risk-")?`, apetito ${draft.riskAppetite.toFixed(1)}/5`:""}. Principio árbitro: ${draft.principleCode} (${draft.principleName}).\nHechos:\n${draft.evidence}\n\nPosición de ${draft.initiator.code} (${draft.initiator.name}): ${initiatorPosition}\nPosición de ${draft.counterpart.code} (${draft.counterpart.name}): ${counterpartPosition}`
 const codes=`Los únicos códigos de objetivo COBIT que puedes citar son ${draft.objectiveCode} y ${draft.principleCode}. No existen códigos como DS5, PO9 o AI6.`
 if(draft.outcome==="resolved"){
  const user=`${facts}\n\nLa regla determinó que esta discrepancia CABE dentro del mandato y fijó la sustancia del consenso: "${draft.template.resolution}".\nTú NO decides otro consenso: formulas ese con precisión (qué se hace, quién, con qué condición, en qué plazo), usando los hechos. No rebajes compromisos, no cambies objetivos de servicio ni añadas condiciones que ninguna postura propuso. Cierra diciendo por qué no requiere al comité. ${codes}`
  return {resolution:(await completeJSON(system,user,Resolved)).resolution}
 }
 const ops=(list:Op[])=>list.length===0?"ninguna operación; solo queda registrado":list.map(o=>`${o.type} → ${JSON.stringify(o.payload)}`).join("; ")
 const user=`${facts}\n\nLa regla determinó que NO cabe consenso dentro del mandato: escala al comité. Las dos opciones que el comité puede firmar ya están definidas por la regla; tú las formulas con precisión.\n- escalationReason: por qué ninguna de las dos posiciones cabe en el mandato sin que el comité lo cambie. Concreto, con los hechos.\n- proposal: la propuesta que llega al comité. Base: "${draft.template.proposal}".\n- approve: etiqueta imperativa y específica (base: "${draft.template.approveLabel}"; nunca "Aprobar propuesta") e impacto de aprobar. Aprobar ejecuta: ${ops(draft.approveOps)}.\n- reject: etiqueta específica (base: "${draft.template.rejectLabel}"; nunca "Rechazar propuesta") e impacto de rechazar. Rechazar ejecuta: ${ops(draft.rejectOps)}.\nCuando una rama no ejecuta operaciones, su efecto es un compromiso registrado a nombre del comité o un precedente, no "nada": dilo así. Los dos impactos deben ser DISTINTOS entre sí y describir consecuencias opuestas. Base de aprobar: "${draft.template.approveImpact}". Base de rechazar: "${draft.template.rejectImpact}". ${codes}`
 const out=await completeJSON(system,user,Escalated)
 // Validación posterior: lo que el modelo no puede garantizar, lo garantiza el código.
 const t=draft.template
 const badCode=(x:string)=>/\b(DS|PO|AI|ME)\d{1,2}\b/.test(x)||[...x.matchAll(/\b(EDM|APO|BAI|DSS|MEA)\d{2}\b/g)].some(m=>m[0]!==draft.objectiveCode&&m[0]!==draft.principleCode)
 const sameImpact=out.approve.impact.trim().toLowerCase()===out.reject.impact.trim().toLowerCase()
 const approveImpact=sameImpact||badCode(out.approve.impact)?t.approveImpact!:out.approve.impact
 const rejectImpact=sameImpact||badCode(out.reject.impact)?t.rejectImpact!:out.reject.impact
 return {escalationReason:badCode(out.escalationReason)?t.escalationReason!:out.escalationReason,proposal:badCode(out.proposal)?t.proposal!:out.proposal,
  approveLabel:/^(aprobar|rechazar)\b/i.test(out.approve.label)?t.approveLabel!:out.approve.label,approveImpact,
  rejectLabel:/^(aprobar|rechazar)\b/i.test(out.reject.label)?t.rejectLabel!:out.reject.label,rejectImpact}
}

export async function authorNegotiation(draft:Draft):Promise<Authored>{
 const fallback:Authored={...draft.template,authoredBy:"rule",authoringModel:null}
 try{
  const initiatorPosition=await agentPosition(draft.initiator,draft.counterpart,draft,"initiator")
  const counterpartPosition=await agentPosition(draft.counterpart,draft.initiator,{...draft,template:{...draft.template,initiatorPosition}},"counterpart")
  const synthesis=await nexusSynthesis(draft,initiatorPosition,counterpartPosition)
  return {...fallback,initiatorPosition,counterpartPosition,...synthesis,authoredBy:"model",authoringModel:activeModel()}
 }catch(error){
  console.warn(`[nexus] redacción por modelo falló para ${draft.ruleKey}; se usa la plantilla de la regla:`,error instanceof Error?error.message:error)
  return fallback
 }
}

export function modelAvailable(){return Boolean(process.env.GROQ_API_KEY||process.env.ANTHROPIC_API_KEY||process.env.ANTHROPIC_AUTH_TOKEN)}
