import type { DesignFactorView } from "./types"

// Intensidad con la que un valor de factor entra en la suma ponderada.
//   rating 1-5 -> 0..1 (el neutro 3 aporta 0.5)
//   toggle/choice -> 0 o 1
export function intensity(input:DesignFactorView["input"],raw:number){
 if(input==="rating")return Math.min(1,Math.max(0,(raw-1)/4))
 return raw>0?1:0
}

export type PriorityScore = { code:string; raw:number; score:number }

// Suma ponderada de los factores de diseño y normalización a importancia relativa,
// donde 100 es el objetivo más prioritario para esta configuración.
export function computePriorities(factors:DesignFactorView[],inputs:Record<string,number>):PriorityScore[]{
 const raw=new Map<string,number>()
 for(const factor of factors)for(const value of factor.values){
  const weightOf=intensity(factor.input,inputs[value.id]??0)
  if(weightOf===0)continue
  for(const [objective,weight] of Object.entries(value.weights))raw.set(objective,(raw.get(objective)??0)+weight*weightOf)
 }
 const max=Math.max(0,...raw.values())
 return [...raw.entries()]
  .map(([code,value])=>({code,raw:Math.round(value*10)/10,score:max>0?Math.round(Math.max(0,value)/max*100):0}))
  .sort((a,b)=>b.score-a.score||a.code.localeCompare(b.code))
}

// Punto de partida cuando todavía no hay un mandato aplicado.
export function neutralInputs(factors:DesignFactorView[]):Record<string,number>{
 const out:Record<string,number>={}
 for(const factor of factors)for(const [i,value] of factor.values.entries()){
  out[value.id]=factor.input==="rating"?3:factor.input==="choice"&&i===0?1:0
 }
 return out
}

// Qué objetivos cambian de PUESTO entre dos configuraciones. Se compara el orden y no
// el puntaje: como la importancia es relativa al objetivo más alto, subir un solo peso
// reescala a todos y el puntaje daría una falsa sensación de cambio masivo.
export function comparePriorities(before:PriorityScore[],after:PriorityScore[]){
 const rankBefore=new Map(before.map((p,i)=>[p.code,i]))
 const moved=after.map((p,i)=>({code:p.code,delta:(rankBefore.get(p.code)??i)-i})).filter(m=>m.delta!==0)
 return {changed:moved.length,biggest:[...moved].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,3)}
}
