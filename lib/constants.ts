export const TASK_CATEGORIES = [
  { value: "CONTRACT_REVIEW", label: "Contract Review" },
  { value: "CONTRACT_DRAFTING", label: "Contract Drafting" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "EMPLOYMENT", label: "Employment" },
  { value: "REGULATORY", label: "Regulatory" },
  { value: "GOVERNANCE", label: "Governance" },
  { value: "DISPUTE", label: "Dispute" },
  { value: "GENERAL_ADVICE", label: "General Advice" },
  { value: "ADMIN_LEGAL_OPS", label: "Admin / Legal Ops" },
] as const

export const TASK_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_ON_CLIENT", label: "Waiting on Client" },
  { value: "WAITING_ON_THIRD_PARTY", label: "Waiting on Third Party" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const

export const TASK_PRIORITIES = [
  { value: "NORMAL", label: "Normal", effortMultiplier: 1.0 },
  { value: "PRIORITY", label: "Priority", effortMultiplier: 1.25 },
  { value: "URGENT", label: "Urgent", effortMultiplier: 1.5 },
] as const

export const TASK_COMPLEXITIES = [
  { value: "LOW", label: "Low", effortScore: 1 },
  { value: "MEDIUM", label: "Medium", effortScore: 3 },
  { value: "HIGH", label: "High", effortScore: 6 },
  { value: "STRATEGIC", label: "Strategic", effortScore: 10 },
] as const

export const INTAKE_SOURCES = [
  { value: "MANUAL", label: "Manual" },
  { value: "OUTLOOK", label: "Outlook" },
  { value: "SLACK", label: "Slack" },
  { value: "TEAMS", label: "Teams" },
  { value: "OTHER", label: "Other" },
] as const

export const CLIENT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXITED", label: "Exited" },
] as const

export const USER_ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "TEAM_MEMBER", label: "Team Member" },
  { value: "VIEWER", label: "Viewer" },
] as const

export const SENIORITY_PRESETS = [
  { label: "Paralegal / Legal Ops", value: 0.4 },
  { label: "Junior Lawyer", value: 0.7 },
  { label: "Senior Lawyer", value: 1.0 },
  { label: "Principal / Partner", value: 1.5 },
] as const

export const OPEN_TASK_STATUSES = ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_ON_CLIENT", "WAITING_ON_THIRD_PARTY"]
export const ACTIVE_CLIENT_STATUSES = ["ACTIVE"]
