// Identidad de la organización que usa el sistema. Antes estaba escrita en el
// código (Corporación Andina, Lina Castillo); ahora sale del entorno, para que
// una empresa nueva la fije sin tocar nada.
export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME?.trim() || "Mi organización"
export const COMMITTEE_SIGNER = process.env.NEXT_PUBLIC_COMMITTEE_SIGNER?.trim() || "Comité de gobierno"
export const SIGNER_INITIALS = COMMITTEE_SIGNER.split(/\s+/).map(w=>w[0]?.toUpperCase()??"").join("").slice(0,2) || "CG"
export const SIGNER_ROLE = process.env.NEXT_PUBLIC_COMMITTEE_ROLE?.trim() || "Gobierno de TI"
