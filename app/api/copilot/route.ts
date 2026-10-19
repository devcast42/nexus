import { COPILOT_INSTRUCTIONS,buildGovernanceSnapshot } from "@/lib/copilot-context"
import { activeModel,activeProvider,describeError,streamCopilot,type ChatTurn } from "@/lib/copilot-provider"
import { loadGovernanceData } from "@/lib/db/queries"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Incoming = { messages?: { role?:unknown; content?:unknown }[] }

export async function POST(request:Request){
 let body:Incoming
 try{body=await request.json()}catch{return new Response("Cuerpo de la petición inválido",{status:400})}

 // Solo se conservan las PREGUNTAS anteriores, para que «¿y ese riesgo?» se entienda.
 // Las respuestas previas se descartan: se escribieron con el estado de aquel momento
 // y el modelo tiende a repetirlas en vez de releer el estado actual. Cada respuesta
 // se construye contra la instantánea de ahora, no contra lo que el copiloto ya dijo.
 const history=Array.isArray(body.messages)?body.messages:[]
 const questions=history
  .filter(m=>m.role==="user"&&typeof m.content==="string"&&m.content.trim().length>0)
  .map(m=>(m.content as string).slice(0,4000))
  .slice(-6)
 if(questions.length===0){
  return new Response("La conversación debe terminar en un mensaje del usuario",{status:400})
 }
 const previous=questions.slice(0,-1)
 const messages:ChatTurn[]=[]

 // El estado se lee en el servidor: el copiloto solo puede hablar de lo que hay en la base.
 // Va pegado a la última pregunta, no solo en el prompt de sistema: la conversación
 // arrastra respuestas de cuando el estado era otro, y lo último que el modelo lee
 // tiene que ser el estado de ahora, no lo que él mismo contestó hace media hora.
 const snapshot=buildGovernanceSnapshot(await loadGovernanceData())
 const system=COPILOT_INSTRUCTIONS
 const context=previous.length>0?`Preguntas anteriores del comité en esta conversación, solo como contexto de a qué se refiere: ${previous.map(q=>`«${q}»`).join(", ")}.\n\n`:""
 messages.push({role:"user",content:`# Estado de gobierno\n\n${snapshot}\n\n---\n\n${context}Responde ÚNICAMENTE con el estado de arriba, que es el de este instante:\n\n${questions[questions.length-1]}`})

 const encoder=new TextEncoder()
 const stream=new ReadableStream<Uint8Array>({
  async start(controller){
   try{
    for await(const chunk of streamCopilot(system,messages))controller.enqueue(encoder.encode(chunk))
   }catch(error){
    controller.enqueue(encoder.encode(`\n\n[${describeError(error)}]`))
   }finally{
    controller.close()
   }
  },
 })

 return new Response(stream,{headers:{
  "Content-Type":"text/plain; charset=utf-8",
  "Cache-Control":"no-store",
  "X-Copilot-Provider":activeProvider(),
  "X-Copilot-Model":activeModel(),
 }})
}
