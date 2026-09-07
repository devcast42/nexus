export type DomainCode = "EDM" | "APO" | "BAI" | "DSS" | "MEA"
export type Verdict = "approved" | "rejected"
export type Outcome = { label:string; impact:string; delta:number }

export type DomainView = { code:DomainCode; name:string; baseScore:number; trend:number; targetMaturity:number }
export type ObjectiveView = { code:string; name:string; domain:DomainCode; baseScore:number; agent:string; history:number[] }
export type AgentView = { code:string; name:string; status:string; action:string; watched:number; activity:number[] }
export type NegotiationView = {
 id:number; objective:string; domain:DomainCode; severity:"critical"|"warning"|"info"
 fact:string
 initiatorAgent:string; initiatorName:string; initiatorPosition:string
 counterpartAgent:string; counterpartName:string; counterpartPosition:string
 principle:string; principleName:string
 outcome:"resolved"|"escalated"
 resolution:string|null
 escalationReason:string|null
 proposal:string|null
 approve:Outcome|null; reject:Outcome|null
 time:string
}
export type NoticeView = { id:number; objective:string; domain:DomainCode; severity:"critical"|"warning"|"info"; agent:string; fact:string; time:string }
export type DecisionView = { negotiationId:number; objective:string; domain:DomainCode; agent:string; verdict:Verdict; label:string; impact:string; delta:number; decidedBy:string; at:string }
export type DesignValueView = { id:string; key:string; label:string; weights:Record<string,number> }
export type DesignFactorView = { code:string; name:string; description:string; input:"rating"|"toggle"|"choice"; values:DesignValueView[] }
export type DesignProfileView = { id:number; name:string; inputs:Record<string,number>; appliedBy:string; appliedAt:string }
export type AiSystemView = { id:number; name:string; area:string; description:string; risk:string; status:string; controls:string[]; acceptedControls:string[]; assessed:boolean }
export type GovernanceData = { domains:DomainView[]; objectives:ObjectiveView[]; agents:AgentView[]; negotiations:NegotiationView[]; notices:NoticeView[]; decisions:DecisionView[]; aiSystems:AiSystemView[]; designFactors:DesignFactorView[]; activeProfile:DesignProfileView|null }
