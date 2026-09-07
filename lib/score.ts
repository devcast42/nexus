// Los health score viven en 0-100 tanto en el servidor como en el cliente.
export function clampScore(value:number){return Math.max(0,Math.min(100,Math.round(value)))}
