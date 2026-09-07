import { GovernanceProvider } from "@/components/governance-provider"
import { NexusShell } from "@/components/nexus-shell"
import { loadGovernanceData } from "@/lib/db/queries"

export const dynamic = "force-dynamic"

export default async function Page() {
  const data = await loadGovernanceData()
  return (
    <GovernanceProvider data={data}>
      <NexusShell />
    </GovernanceProvider>
  )
}
