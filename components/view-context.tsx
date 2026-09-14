"use client"
import { createContext,useContext } from "react"

export type View = "command"|"operations"|"agents"|"simulator"|"copilot"|"ai"|"activity"
// Permite que una vista navegue a otra (p. ej. "Ver más" de Agentes → actividad detallada)
// sin que las vistas importen la shell, evitando un ciclo de módulos.
export const ViewContext=createContext<{view:View;setView:(v:View)=>void}>({view:"command",setView:()=>{}})
export function useView(){return useContext(ViewContext)}
