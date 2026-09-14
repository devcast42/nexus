import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import Groq from "groq-sdk"
import { z } from "zod"
import { activeModel,activeProvider } from "./copilot-provider"
import { ORG_NAME } from "./org"

// Nexus es el único agente. Cuando una regla detecta una discrepancia, Nexus la
// analiza desde los dos lentes en tensión —dos mandatos de dominio COBIT—, escribe
// la posición que cada lente sostiene con los hechos, y concluye: formula los
// términos del consenso si la regla determinó que cabe en el mandato, o la propuesta
// que llega al comité si no. Una sola deliberación, una sola llamada al modelo.
// Sin modelo disponible, se usan las plantillas de la regla y se marca authoredBy:"rule".

// Cambiar este número obliga a deliberar de nuevo lo ya escrito con el prompt anterior.
export const PROMPT_VERSION="6"

export type Lens = { code:string; name:string; mandate:string }
export type Op = { type:string; payload:Record<string,unknown> }
export type Draft = {
 ruleKey:string; outcome:"resolved"|"escalated"; objectiveCode:string; principleCode:string; principleName:string
 evidence:string; riskAppetite:number; mandateName:string
 initiator:Lens; counterpart:Lens
 approveOps:Op[]; rejectOps:Op[]
 template:{ initiatorPosition:string; counterpartPosition:string; resolution:string|null; escalationReason:string|null; proposal:string|null; approveLabel:string|null; approveImpact:string|null; rejectLabel:string|null; rejectImpact:string|null }
}
export type Deliberation = Draft["template"] & { authoredBy:"model"|"rule"; authoringModel:string|null }

const Resolved=z.object({
 initiatorPosition:z.string().min(20).max(700),
 counterpartPosition:z.string().min(20).max(700),
 resolution:z.string().min(30).max(900),
})
const Escalated=z.object({
 initiatorPosition:z.string().min(20).max(700),
 counterpartPosition:z.string().min(20).max(700),
 escalationReason:z.string().min(30).max(900),
 proposal:z.string().min(20).max(500),
 approve:z.object({label:z.string().min(3).max(60),impact:z.string().min(20).max(500)}),
 reject:z.object({label:z.string().min(3).max(60),impact:z.string().min(20).max(500)}),
})

// Un 429 trae cuánto esperar. Se respeta hasta dos veces y luego se cede el turno.
async function withRateLimitRetry<T>(call:()=>Promise<T>,attempt=0):Promise<T>{
 try{return await call()}
 catch(error){
  const status=(error as {status?:number}).status
  if(status!==429||attempt>=2)throw error
  const seconds=Number((error instanceof Error?error.message:"").match(/try again in ([\d.]+)s/i)?.[1]??5)
  await new Promise(r=>setTimeout(r,Math.min(15_000,Math.ceil(seconds*1000)+500)))
  return withRateLimitRetry(call,attempt+1)
 }
}

async function completeJSON<T>(system:string,user:string,schema:z.ZodType<T>,shape:string):Promise<T>{
 return withRateLimitRetry(async()=>{
  if(activeProvider()==="groq"){
   const groq=new Groq()
   // gpt-oss razona antes de responder y ese razonamiento cuenta en el presupuesto
   const res=await groq.chat.completions.create({model:activeModel(),temperature:0.4,max_completion_tokens:3500,reasoning_effort:"low",
    response_format:{type:"json_object"},
    messages:[{role:"system",content:`${system}\n\nResponde ÚNICAMENTE con un objeto JSON válido con esta forma: ${shape}`},{role:"user",content:user}]})
   return schema.parse(JSON.parse(res.choices[0]?.message?.content??""))
  }
  const anthropic=new Anthropic()
  const res=await anthropic.messages.parse({model:activeModel(),max_tokens:3000,output_config:{effort:"low",format:zodOutputFormat(schema)},system,messages:[{role:"user",content:user}]})
  if(!res.parsed_output)throw new Error("El modelo no devolvió la estructura esperada")
  return res.parsed_output
 })
}

const SYSTEM=(mandateLine:string)=>`Eres Nexus, el agente de gobierno de TI de ${ORG_NAME} (COBIT 2019). No decides: aplicas el mandato que fijó el comité. Analizas cada discrepancia desde dos lentes —dos mandatos de dominio en tensión— y luego concluyes.
${mandateLine}
Reglas de redacción: español, sin saludos ni preámbulos. Argumenta SOLO con los hechos entregados: cifras, códigos y fechas tal como aparecen; no inventes datos. Al escribir desde un lente, hablas en primera persona de ese lente, defiendes SU mandato aunque el otro tenga razones, y propones: un lente no ordena, no suspende servicios, no detiene proyectos ni cierra riesgos por su cuenta. Tu conclusión va en tercera persona, tono institucional. Máximo 60 palabras por campo; las etiquetas de botón, máximo 4 palabras. No menciones el apetito de riesgo salvo que el hecho sea un riesgo con residual.`

export async function deliberate(draft:Draft):Promise<Deliberation>{
 const fallback:Deliberation={...draft.template,authoredBy:"rule",authoringModel:null}
 const t=draft.template
 const isRisk=draft.ruleKey.startsWith("risk-")
 const mandateLine=isRisk?`Mandato vigente: ${draft.mandateName}, apetito de riesgo ${draft.riskAppetite.toFixed(1)}/5.`:`Mandato vigente: ${draft.mandateName}.`
 const codes=`Los únicos códigos de objetivo COBIT que puedes citar son ${draft.objectiveCode} y ${draft.principleCode}. No existen códigos como DS5, PO9 o AI6.`
 const lenses=`Lente ${draft.initiator.code} (${draft.initiator.name}) — mandato: ${draft.initiator.mandate}\nPostura que sostiene en esta discrepancia: "${t.initiatorPosition}"\n\nLente ${draft.counterpart.code} (${draft.counterpart.name}) — mandato: ${draft.counterpart.mandate}\nPostura que sostiene: "${t.counterpartPosition}"`
 const facts=`Principio COBIT árbitro: ${draft.principleCode} (${draft.principleName}).\n\nHechos:\n${draft.evidence}\n\n${lenses}\n\nLas posturas las asigna la regla: escríbelas argumentadas con los hechos (initiatorPosition, counterpartPosition), sin sustituirlas ni suavizarlas.`
 try{
  if(draft.outcome==="resolved"){
   const out=await completeJSON(SYSTEM(mandateLine),`${facts}\n\nLa regla determinó que esta discrepancia CABE dentro del mandato y fijó la sustancia del consenso: "${t.resolution}". En resolution formula ese consenso con precisión (qué se hace, quién, con qué condición, en qué plazo). No rebajes compromisos ni añadas condiciones que ninguna postura propuso. Cierra diciendo por qué no requiere al comité. ${codes}`,
    Resolved,'{"initiatorPosition": string, "counterpartPosition": string, "resolution": string}')
   return {...fallback,initiatorPosition:out.initiatorPosition,counterpartPosition:out.counterpartPosition,resolution:badCode(out.resolution,draft)?t.resolution:out.resolution,authoredBy:"model",authoringModel:activeModel()}
  }
  const ops=(list:Op[])=>list.length===0?"ninguna operación; solo queda registrado a nombre del comité":list.map(o=>`${o.type} → ${JSON.stringify(o.payload)}`).join("; ")
  const out=await completeJSON(SYSTEM(mandateLine),`${facts}\n\nLa regla determinó que NO cabe consenso dentro del mandato: escala al comité. Las dos opciones ya están definidas por la regla; tú las formulas con precisión.\n- escalationReason: por qué ninguna postura cabe sin que el comité lo cambie, con los hechos.\n- proposal: la propuesta al comité. Base: "${t.proposal}".\n- approve: etiqueta imperativa y específica (base: "${t.approveLabel}"; nunca "Aprobar propuesta") e impacto. Aprobar ejecuta: ${ops(draft.approveOps)}. Base del impacto: "${t.approveImpact}".\n- reject: etiqueta específica (base: "${t.rejectLabel}") e impacto. Rechazar ejecuta: ${ops(draft.rejectOps)}. Base: "${t.rejectImpact}".\nCuando una rama no ejecuta operaciones, su efecto es una exigencia o autorización registrada a nombre del comité, no "nada". Los dos impactos deben ser distintos. ${codes}`,
   Escalated,'{"initiatorPosition": string, "counterpartPosition": string, "escalationReason": string, "proposal": string, "approve": {"label": string, "impact": string}, "reject": {"label": string, "impact": string}}')
  // Lo que el modelo no puede garantizar, lo garantiza el código
  const sameImpact=out.approve.impact.trim().toLowerCase()===out.reject.impact.trim().toLowerCase()
  const generic=(l:string)=>/^(aprobar|rechazar)\b/i.test(l)
  return {...fallback,
   initiatorPosition:out.initiatorPosition,counterpartPosition:out.counterpartPosition,
   escalationReason:badCode(out.escalationReason,draft)?t.escalationReason:out.escalationReason,
   proposal:badCode(out.proposal,draft)?t.proposal:out.proposal,
   approveLabel:generic(out.approve.label)?t.approveLabel:out.approve.label,
   approveImpact:sameImpact||badCode(out.approve.impact,draft)?t.approveImpact:out.approve.impact,
   rejectLabel:generic(out.reject.label)?t.rejectLabel:out.reject.label,
   rejectImpact:sameImpact||badCode(out.reject.impact,draft)?t.rejectImpact:out.reject.impact,
   authoredBy:"model",authoringModel:activeModel()}
 }catch(error){
  console.warn(`[nexus] la deliberación con modelo falló para ${draft.ruleKey}; se usa la plantilla de la regla:`,error instanceof Error?error.message:error)
  return fallback
 }
}

function badCode(text:string,draft:Draft){
 return /\b(DS|PO|AI|ME)\d{1,2}\b/.test(text)||[...text.matchAll(/\b(EDM|APO|BAI|DSS|MEA)\d{2}\b/g)].some(m=>m[0]!==draft.objectiveCode&&m[0]!==draft.principleCode)
}

export function modelAvailable(){return Boolean(process.env.GROQ_API_KEY||process.env.ANTHROPIC_API_KEY||process.env.ANTHROPIC_AUTH_TOKEN)}
