import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"

export type ChatTurn = { role:"user"|"assistant"; content:string }
export type Provider = "anthropic" | "groq"

// Haiku 4.5 por defecto: es el más barato y alcanza para el copiloto y la deliberación.
// ANTHROPIC_MODEL permite subir a claude-sonnet-5 o claude-opus-5.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001"
// Haiku no acepta el parámetro effort; solo se envía en Sonnet/Opus.
export function anthropicEffort(level:"low"|"medium"):{effort:"low"|"medium"}|{}{return ANTHROPIC_MODEL.includes("haiku")?{}:{effort:level}}
// Verificado contra el catálogo de la cuenta: el de mayor capacidad disponible.
const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"

// COPILOT_PROVIDER manda; si no está, se usa el proveedor cuya clave exista.
export function activeProvider():Provider{
 const explicit=process.env.COPILOT_PROVIDER?.toLowerCase()
 if(explicit==="groq"||explicit==="anthropic")return explicit
 if(process.env.GROQ_API_KEY)return "groq"
 return "anthropic"
}

export function activeModel(){return activeProvider()==="groq"?GROQ_MODEL:ANTHROPIC_MODEL}

export async function*streamCopilot(system:string,messages:ChatTurn[]):AsyncGenerator<string>{
 if(activeProvider()==="groq"){
  const groq=new Groq()
  const stream=await groq.chat.completions.create({
   model:GROQ_MODEL,
   max_completion_tokens:4096,
   temperature:0.2,
   stream:true,
   messages:[{role:"system",content:system},...messages],
  })
  for await(const chunk of stream){
   const text=chunk.choices[0]?.delta?.content
   if(text)yield text
  }
  return
 }

 const anthropic=new Anthropic()
 const stream=anthropic.messages.stream({
  model:ANTHROPIC_MODEL,
  max_tokens:4000,
  output_config:{...anthropicEffort("medium")},
  system:[{type:"text",text:system,cache_control:{type:"ephemeral"}}],
  messages,
 })
 try{
  for await(const event of stream){
   if(event.type==="content_block_delta"&&event.delta.type==="text_delta")yield event.delta.text
  }
  const final=await stream.finalMessage()
  if(final.stop_reason==="refusal")yield "\n\n[El modelo declinó responder esta consulta.]"
 }finally{
  stream.abort()
 }
}

// La causa real viene en el cuerpo de la respuesta (saldo agotado, modelo inexistente...).
// Sin esto un 400 llega al comité como un número y no se puede actuar sobre él.
function apiDetail(error:{message:string}&{error?:unknown}){
 const nested=(error as {error?:{error?:{message?:unknown}}}).error?.error?.message
 if(typeof nested==="string"&&nested.length>0)return nested
 const direct=(error as {error?:{message?:unknown}}).error?.message
 if(typeof direct==="string"&&direct.length>0)return direct
 const match=error.message.match(/\{[\s\S]*\}/)
 if(match){try{const parsed=JSON.parse(match[0]) as {error?:{message?:unknown}};if(typeof parsed.error?.message==="string")return parsed.error.message}catch{}}
 return error.message
}

export function describeError(error:unknown){
 if(error instanceof Anthropic.AuthenticationError||error instanceof Groq.AuthenticationError)return "La clave de la API no es válida."
 if(error instanceof Anthropic.RateLimitError||error instanceof Groq.RateLimitError)return "El proveedor está limitando las peticiones. Intenta de nuevo en unos segundos."
 if(error instanceof Anthropic.APIError||error instanceof Groq.APIError)return `Error de la API (${error.status}): ${apiDetail(error)}`
 if(error instanceof Error&&/api[ _-]?key/i.test(error.message)){
  const variable=activeProvider()==="groq"?"GROQ_API_KEY":"ANTHROPIC_API_KEY"
  return `Falta la credencial: añade ${variable} a .env y reinicia el servidor.`
 }
 return "No se pudo completar la consulta."
}
