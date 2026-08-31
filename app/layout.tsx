import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "Nexus — AI Governance Command Center",
  description: "Centro de mando inteligente para gobierno de TI basado en COBIT 2019.",
  generator: "v0.app",
}
export const viewport: Viewport = { colorScheme: "dark", themeColor: "#0a0a0f" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className="dark bg-background"><body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}><TooltipProvider>{children}</TooltipProvider>{process.env.NODE_ENV === "production" && <Analytics />}</body></html>
}
