import { z } from "zod"

export const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  subscriptionTier: z.string().min(1, "Subscription tier is required"),
  monthlyFee: z.number().min(0, "Monthly fee must be positive"),
  billingStartDate: z.string().min(1, "Billing start date is required"),
  accountOwnerId: z.string().min(1, "Account owner is required"),
  status: z.enum(["ACTIVE", "PAUSED", "EXITED"]).default("ACTIVE"),
  includedScope: z.string().optional(),
  excludedScope: z.string().optional(),
  monthlyEffortAllowance: z.number().optional().nullable(),
  notes: z.string().optional(),
})

export const taskSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum([
    "CONTRACT_REVIEW",
    "CONTRACT_DRAFTING",
    "NEGOTIATION",
    "EMPLOYMENT",
    "REGULATORY",
    "GOVERNANCE",
    "DISPUTE",
    "GENERAL_ADVICE",
    "ADMIN_LEGAL_OPS",
  ]),
  assignedToId: z.string().optional().nullable(),
  reviewerId: z.string().optional().nullable(),
  status: z
    .enum([
      "NEW",
      "ASSIGNED",
      "IN_PROGRESS",
      "WAITING_ON_CLIENT",
      "WAITING_ON_THIRD_PARTY",
      "COMPLETED",
      "CANCELLED",
    ])
    .default("NEW"),
  priority: z.enum(["NORMAL", "PRIORITY", "URGENT"]).default("NORMAL"),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH", "STRATEGIC"]).default("MEDIUM"),
  effortScore: z.number().min(0.5).max(10).default(3),
  dueDate: z.string().optional().nullable(),
  intakeSource: z
    .enum(["MANUAL", "OUTLOOK", "SLACK", "TEAMS", "OTHER"])
    .default("MANUAL"),
  outOfScope: z.boolean().default(false),
  internalNotes: z.string().optional(),
  clientFacingSummary: z.string().optional(),
})

export const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["ADMIN", "TEAM_MEMBER", "VIEWER"]).default("TEAM_MEMBER"),
  jobTitle: z.string().optional(),
  costRate: z.number().optional().nullable(),
  capacityUnits: z.number().min(0).default(120),
  seniorityMultiplier: z.number().min(0.1).max(2.0).default(1.0),
  active: z.boolean().default(true),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
})

export const firmSettingsSchema = z.object({
  blendedCostPerUnit: z.number().min(0),
  adminUpliftPercentage: z.number().min(0).max(100),
  overheadPercentage: z.number().min(0).max(100),
  defaultCurrency: z.string().min(1),
  firmName: z.string().min(1),
})

export const capacitySchema = z.object({
  userId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  capacityUnits: z.number().min(0),
  costPerUnit: z.number().optional().nullable(),
})

export type ClientFormData = z.infer<typeof clientSchema>
export type TaskFormData = z.infer<typeof taskSchema>
export type TeamMemberFormData = z.infer<typeof teamMemberSchema>
export type FirmSettingsFormData = z.infer<typeof firmSettingsSchema>
export type CapacityFormData = z.infer<typeof capacitySchema>
