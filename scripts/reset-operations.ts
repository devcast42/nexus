import { config } from "dotenv"
config({ path: ".env.local" }); config({ path: ".env" })
import { sql } from "drizzle-orm"
import { getDb } from "../lib/db"

// Borra lo transaccional y las señales que se derivan de él (negociaciones, avisos
// y las firmas sobre ellas): sin los hechos que las sostienen no tienen sentido.
// Los maestros (servicios, proveedores, controles), los objetivos y los mandatos
// quedan intactos. Los nombres salen de esta lista literal, no de entrada externa.
const TRANSACTIONAL = ["decisions","notices","negotiations","control_tests","supplier_evaluations","sla_measurements","security_events","risks","changes","incidents","projects"] as const

async function main(){
  const db = getDb()
  for (const table of TRANSACTIONAL) {
    await db.execute(sql.raw(`truncate table ${table} restart identity cascade`))
    console.log(`  vaciada ${table}`)
  }
  console.log("✓ capa operativa y señales vacías; maestros, objetivos y mandatos intactos")
}
main().catch(e=>{console.error(e.message);process.exit(1)})
