import { COPILOT_INSTRUCTIONS,buildGovernanceSnapshot } from "@/lib/copilot-context"
import { activeModel,activeProvider,describeError,streamCopilot,type ChatTurn } from "@/lib/copilot-provider"
import { loadGovernanceData } from "@/lib/db/queries"

export const dynamic = "force-dynamic"
export const maxDuration = 60

type Incoming = { messages?: { role?:unknown; content?:unknown }[] }

export async function POST(request:Request){
 let body:Incoming
 try{body=await request.json()}catch{return new Response("Cuerpo de la petición inválido",{status:400})}

 const history=Array.isArray(body.messages)?body.messages:[]
 const messages:ChatTurn[]=history
  .filter(m=>(m.role==="user"||m.role==="assistant")&&typeof m.content==="string"&&m.content.trim().length>0)
  .slice(-20)
  .map(m=>({role:m.role as "user"|"assistant",content:(m.content as string).slice(0,4000)}))
 if(messages.length===0||messages[messages.length-1].role!=="user"){
  return new Response("La conversación debe terminar en un mensaje del usuario",{status:400})
 }

 // El estado se lee en el servidor: el copiloto solo puede hablar de lo que hay en la base.
 const snapshot=buildGovernanceSnapshot(await loadGovernanceData())
 const system=`${COPILOT_INSTRUCTIONS}\n\n# Estado de gobierno\n\n${snapshot}`

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
