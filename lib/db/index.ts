import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

type Db = ReturnType<typeof drizzle<typeof schema>>
let cached:Db|null=null

export function getDb(){
 if(cached)return cached
 const url=process.env.DATABASE_URL
 if(!url)throw new Error("Falta DATABASE_URL. Copia .env.example a .env.local y pega la cadena de conexión de Neon.")
 cached=drizzle(neon(url),{schema})
 return cached
}
