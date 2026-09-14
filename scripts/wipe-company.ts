import { config } from "dotenv"
config({ path: ".env.local" }); config({ path: ".env" })
import { sql } from "drizzle-orm"
import { getDb } from "../lib/db"

// Deja el sistema como para una organización nueva: borra TODO lo que es de la
// empresa —operación, señales, firmas, maestros, sistemas de IA, mandatos, línea
// base e historial— y conserva el marco COBIT (dominios, objetivos, agentes,
// factores de diseño). Después, `pnpm db:seed` con SEED_PROFILE=fresh repone el
// mandato base.
const COMPANY_TABLES=["agent_events","governance_evaluations","decisions","notices","negotiations",
 "control_tests","supplier_evaluations","sla_measurements","security_events","risks","changes","incidents","projects",
 "controls","suppliers","services","ai_systems","design_profiles"] as const

async function main(){
  const db=getDb()
  for(const t of COMPANY_TABLES){await db.execute(sql.raw(`truncate table ${t} restart identity cascade`));console.log(`  vaciada ${t}`)}
  await db.execute(sql`update objectives set base_score=null, history='[]'::jsonb`)
  await db.execute(sql`update domains set base_score=null, trend=null`)
  console.log("  línea base e historial anulados: los objetivos quedan sin dato hasta que haya evidencia")
  console.log("✓ organización vacía. Queda el marco COBIT. Ejecuta: SEED_PROFILE=fresh pnpm db:seed")
}
main().catch(e=>{console.error(e.message);process.exit(1)})
