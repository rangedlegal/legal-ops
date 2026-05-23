import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../app/generated/prisma/client"
import bcrypt from "bcryptjs"
import { join } from "path"

// Use DATABASE_URL from environment, or fall back to local dev.db
const DB_PATH = process.env.DATABASE_URL || `file:${join(process.cwd(), "dev.db")}`

const adapter = new PrismaLibSql({ url: DB_PATH })
const prisma = new PrismaClient({ adapter })

const urgencyMultipliers: Record<string, number> = { NORMAL: 1.0, PRIORITY: 1.25, URGENT: 1.5 }

async function makeTask(data: {
  clientId: string
  title: string
  description?: string
  category: string
  assignedToId?: string | null
  reviewerId?: string | null
  status: string
  priority: string
  complexity: string
  effortScore: number
  seniorityMultiplier: number
  outOfScope?: boolean
  internalNotes?: string
  clientFacingSummary?: string
  dueDate?: Date
  completedAt?: Date
  createdAt?: Date
}) {
  const urgencyMultiplier = urgencyMultipliers[data.priority] ?? 1.0
  const weightedEffortUnits = parseFloat(
    (data.effortScore * data.seniorityMultiplier * urgencyMultiplier).toFixed(2),
  )
  const now = new Date()
  return prisma.task.create({
    data: {
      ...data,
      assignedToId: data.assignedToId ?? null,
      reviewerId: data.reviewerId ?? null,
      urgencyMultiplier,
      weightedEffortUnits,
      outOfScope: data.outOfScope ?? false,
      createdAt: data.createdAt ?? new Date(now.getFullYear(), now.getMonth(), 1),
      completedAt: data.completedAt ?? null,
    },
  })
}

async function main() {
  console.log("Seeding database...")

  await prisma.report.deleteMany()
  await prisma.task.deleteMany()
  await prisma.teamMemberCapacity.deleteMany()
  await prisma.firmSettings.deleteMany()
  await prisma.client.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  await prisma.firmSettings.create({
    data: {
      blendedCostPerUnit: 55,
      adminUpliftPercentage: 10,
      overheadPercentage: 8,
      defaultCurrency: "AUD",
      firmName: "Ranged Legal",
    },
  })

  const password = await bcrypt.hash("Ver0sh@n", 12)

  const admin = await prisma.user.create({
    data: { name: "Veroshan", email: "veroshan@ranged.com.au", password, role: "ADMIN", jobTitle: "Managing Partner", costRate: 15000, capacityUnits: 80, seniorityMultiplier: 1.5 },
  })
  const senior1 = await prisma.user.create({
    data: { name: "James Chen", email: "james@rangedlegal.com", password, role: "TEAM_MEMBER", jobTitle: "Senior Lawyer", costRate: 12000, capacityUnits: 120, seniorityMultiplier: 1.0 },
  })
  const senior2 = await prisma.user.create({
    data: { name: "Priya Sharma", email: "priya@rangedlegal.com", password, role: "TEAM_MEMBER", jobTitle: "Senior Lawyer", costRate: 11500, capacityUnits: 120, seniorityMultiplier: 1.0 },
  })
  const junior1 = await prisma.user.create({
    data: { name: "Tom Nguyen", email: "tom@rangedlegal.com", password, role: "TEAM_MEMBER", jobTitle: "Junior Lawyer", costRate: 7500, capacityUnits: 140, seniorityMultiplier: 0.7 },
  })
  const paralegal = await prisma.user.create({
    data: { name: "Emma White", email: "emma@rangedlegal.com", password, role: "TEAM_MEMBER", jobTitle: "Paralegal", costRate: 5000, capacityUnits: 150, seniorityMultiplier: 0.4 },
  })
  await prisma.user.create({
    data: { name: "Alex Kim", email: "alex@rangedlegal.com", password, role: "VIEWER", jobTitle: "Legal Ops", costRate: 6000, capacityUnits: 100, seniorityMultiplier: 0.4 },
  })

  console.log("Created 6 team members")

  const client1 = await prisma.client.create({ data: { name: "Apex Ventures Pty Ltd", subscriptionTier: "Enterprise", monthlyFee: 12000, billingStartDate: new Date("2024-01-01"), accountOwnerId: admin.id, status: "ACTIVE", includedScope: "M&A advisory, corporate governance, employment matters", monthlyEffortAllowance: 150, notes: "Key strategic client. CEO is responsive. Board changes expected Q3." } })
  const client2 = await prisma.client.create({ data: { name: "BluePeak Retail Group", subscriptionTier: "Growth", monthlyFee: 6500, billingStartDate: new Date("2024-03-01"), accountOwnerId: senior1.id, status: "ACTIVE", includedScope: "Employment, supplier contracts, consumer law", monthlyEffortAllowance: 100, notes: "Fast-growing retail chain. High volume of employment matters." } })
  const client3 = await prisma.client.create({ data: { name: "Clearwater Technologies", subscriptionTier: "Starter", monthlyFee: 3500, billingStartDate: new Date("2024-06-01"), accountOwnerId: senior2.id, status: "ACTIVE", includedScope: "SaaS contracts, IP, privacy", monthlyEffortAllowance: 60, notes: "Series A startup. Needs significant IP work — watch margin." } })
  const client4 = await prisma.client.create({ data: { name: "Meridian Property Trust", subscriptionTier: "Growth", monthlyFee: 7500, billingStartDate: new Date("2023-11-01"), accountOwnerId: admin.id, status: "ACTIVE", includedScope: "Property transactions, leasing, dispute resolution", monthlyEffortAllowance: 110 } })
  const client5 = await prisma.client.create({ data: { name: "Nexus Health Partners", subscriptionTier: "Enterprise", monthlyFee: 9500, billingStartDate: new Date("2024-02-01"), accountOwnerId: senior1.id, status: "ACTIVE", includedScope: "Regulatory compliance, employment, commercial contracts", monthlyEffortAllowance: 130, notes: "Healthcare regulatory work is time-intensive. Monitor capacity." } })

  console.log("Created 5 clients")

  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15)

  // Apex Ventures tasks
  await makeTask({ clientId: client1.id, title: "Board governance policy review", category: "GOVERNANCE", assignedToId: admin.id, reviewerId: admin.id, status: "COMPLETED", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.5, clientFacingSummary: "Reviewed and updated board governance framework. Recommendations provided for director onboarding.", completedAt: new Date(now.getFullYear(), now.getMonth(), 5), createdAt: thisMonth })
  await makeTask({ clientId: client1.id, title: "Employment contract — COO hire", description: "Draft executive employment agreement for incoming COO", category: "EMPLOYMENT", assignedToId: senior1.id, reviewerId: admin.id, status: "COMPLETED", priority: "URGENT", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, clientFacingSummary: "Executive employment agreement drafted for COO appointment. Includes IP assignment, restraint of trade and equity provisions.", completedAt: new Date(now.getFullYear(), now.getMonth(), 8), createdAt: thisMonth })
  await makeTask({ clientId: client1.id, title: "Shareholder agreement amendments — Series B", description: "Negotiate amendments to SHA for Series B round", category: "NEGOTIATION", assignedToId: admin.id, status: "IN_PROGRESS", priority: "URGENT", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.5, internalNotes: "Investor pushing aggressive drag-along provisions. May need to push back on timeline.", clientFacingSummary: "Shareholder agreement amendments progressing for Series B. Key commercial terms under negotiation.", dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15) })
  await makeTask({ clientId: client1.id, title: "M&A due diligence support", category: "GOVERNANCE", assignedToId: senior1.id, reviewerId: admin.id, status: "IN_PROGRESS", priority: "PRIORITY", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.0, clientFacingSummary: "Legal due diligence underway for proposed acquisition. Data room review in progress.", dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 30) })
  await makeTask({ clientId: client1.id, title: "Privacy policy update — AI features", category: "REGULATORY", assignedToId: junior1.id, reviewerId: senior2.id, status: "ASSIGNED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.7, clientFacingSummary: "Privacy policy update initiated for new AI product features." })
  await makeTask({ clientId: client1.id, title: "External audit vendor contract", category: "CONTRACT_REVIEW", assignedToId: junior1.id, status: "COMPLETED", priority: "NORMAL", complexity: "LOW", effortScore: 1, seniorityMultiplier: 0.7, clientFacingSummary: "Vendor audit contract reviewed. Liability cap and IP ownership provisions negotiated.", completedAt: new Date(now.getFullYear(), now.getMonth(), 12), createdAt: thisMonth })
  await makeTask({ clientId: client1.id, title: "Restraint of trade — departing employee", category: "EMPLOYMENT", assignedToId: senior2.id, reviewerId: admin.id, status: "WAITING_ON_CLIENT", priority: "URGENT", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, internalNotes: "Client yet to provide employment contract copy. Chasing since Monday.", clientFacingSummary: "Advising on restraint of trade enforceability. Awaiting additional documentation from client." })

  // BluePeak Retail tasks
  await makeTask({ clientId: client2.id, title: "Casual conversion obligations review", category: "EMPLOYMENT", assignedToId: senior1.id, status: "COMPLETED", priority: "PRIORITY", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 1.0, clientFacingSummary: "Casual conversion obligations reviewed. Written guidance provided on eligibility criteria and process requirements.", completedAt: new Date(now.getFullYear(), now.getMonth(), 3), createdAt: thisMonth })
  await makeTask({ clientId: client2.id, title: "Supplier T&Cs update", category: "CONTRACT_DRAFTING", assignedToId: junior1.id, reviewerId: senior1.id, status: "COMPLETED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.7, clientFacingSummary: "Standard supplier terms updated. New payment terms, returns policy and force majeure provisions incorporated.", completedAt: new Date(now.getFullYear(), now.getMonth(), 6), createdAt: thisMonth })
  await makeTask({ clientId: client2.id, title: "Consumer law compliance audit", category: "REGULATORY", assignedToId: senior2.id, status: "IN_PROGRESS", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, clientFacingSummary: "Consumer law compliance audit underway. Website and marketing materials under review." })
  await makeTask({ clientId: client2.id, title: "Franchisee dispute — underperforming store", category: "DISPUTE", assignedToId: admin.id, reviewerId: admin.id, status: "IN_PROGRESS", priority: "URGENT", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.5, internalNotes: "Franchisee has threatened to sue. Engage barrister if escalates.", clientFacingSummary: "Advising on franchise agreement termination rights. Commercial resolution being explored.", dueDate: new Date(now.getFullYear(), now.getMonth(), 28) })
  await makeTask({ clientId: client2.id, title: "Payroll system implementation agreement", category: "CONTRACT_REVIEW", assignedToId: paralegal.id, reviewerId: senior1.id, status: "ASSIGNED", priority: "NORMAL", complexity: "LOW", effortScore: 1, seniorityMultiplier: 0.4, clientFacingSummary: "Payroll SaaS agreement under review. Focusing on data security, SLA and exit provisions." })
  await makeTask({ clientId: client2.id, title: "Performance management advice", category: "EMPLOYMENT", assignedToId: senior1.id, status: "COMPLETED", priority: "NORMAL", complexity: "LOW", effortScore: 1, seniorityMultiplier: 1.0, clientFacingSummary: "Advice provided on lawful performance management process. Templates and guidance notes issued.", completedAt: new Date(now.getFullYear(), now.getMonth(), 10), createdAt: thisMonth })

  // Clearwater Technologies (low margin client)
  await makeTask({ clientId: client3.id, title: "Software IP ownership structure", category: "REGULATORY", assignedToId: senior2.id, reviewerId: admin.id, status: "COMPLETED", priority: "PRIORITY", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.0, clientFacingSummary: "IP ownership structure advice provided. Written recommendations for contractor IP assignment processes issued.", completedAt: new Date(now.getFullYear(), now.getMonth(), 4), createdAt: thisMonth })
  await makeTask({ clientId: client3.id, title: "Privacy Act compliance — data breach policy", category: "REGULATORY", assignedToId: senior2.id, status: "IN_PROGRESS", priority: "URGENT", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, outOfScope: true, internalNotes: "Out of scope under their Starter plan. Need to invoice separately.", clientFacingSummary: "Data breach response policy being drafted per Privacy Act notifiable breach requirements." })
  await makeTask({ clientId: client3.id, title: "Customer SaaS agreement — enterprise tier", category: "CONTRACT_DRAFTING", assignedToId: junior1.id, reviewerId: senior2.id, status: "ASSIGNED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.7, clientFacingSummary: "Enterprise SaaS agreement drafting commenced." })
  await makeTask({ clientId: client3.id, title: "Series A investor NDA", category: "CONTRACT_REVIEW", assignedToId: junior1.id, status: "COMPLETED", priority: "PRIORITY", complexity: "LOW", effortScore: 1, seniorityMultiplier: 0.7, clientFacingSummary: "Investor NDA reviewed and negotiated. Mutual confidentiality scope and carve-outs agreed.", completedAt: new Date(now.getFullYear(), now.getMonth(), 2), createdAt: thisMonth })
  await makeTask({ clientId: client3.id, title: "Employee IP assignment audit", category: "EMPLOYMENT", assignedToId: paralegal.id, reviewerId: senior2.id, status: "IN_PROGRESS", priority: "PRIORITY", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.4, outOfScope: true, internalNotes: "Second OOS item this month. Flag for renewal discussion.", clientFacingSummary: "Employee IP assignment audit in progress. Reviewing all current employment agreements." })

  // Meridian Property Trust
  await makeTask({ clientId: client4.id, title: "Commercial lease — Sydney CBD", category: "CONTRACT_REVIEW", assignedToId: senior1.id, reviewerId: admin.id, status: "COMPLETED", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, clientFacingSummary: "Commercial lease reviewed. Key provisions negotiated including rent review mechanism, make-good obligations and option to renew.", completedAt: new Date(now.getFullYear(), now.getMonth(), 7), createdAt: thisMonth })
  await makeTask({ clientId: client4.id, title: "Strata dispute — waterproofing defects", category: "DISPUTE", assignedToId: admin.id, status: "IN_PROGRESS", priority: "URGENT", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.5, internalNotes: "OC threatening NCAT proceedings. Budget running over.", clientFacingSummary: "Advising on strata scheme dispute regarding common area waterproofing defects. NCAT filing under consideration." })
  await makeTask({ clientId: client4.id, title: "Property acquisition due diligence", category: "CONTRACT_REVIEW", assignedToId: senior2.id, reviewerId: admin.id, status: "IN_PROGRESS", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, clientFacingSummary: "Legal due diligence underway for warehouse portfolio acquisition." })
  await makeTask({ clientId: client4.id, title: "Tenant default notices", category: "DISPUTE", assignedToId: junior1.id, reviewerId: senior1.id, status: "COMPLETED", priority: "NORMAL", complexity: "LOW", effortScore: 1, seniorityMultiplier: 0.7, clientFacingSummary: "Formal default notices issued to non-compliant commercial tenants.", completedAt: new Date(now.getFullYear(), now.getMonth(), 9), createdAt: thisMonth })
  await makeTask({ clientId: client4.id, title: "Development approval — planning submission", category: "REGULATORY", assignedToId: senior1.id, status: "WAITING_ON_THIRD_PARTY", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, internalNotes: "Waiting on council. Expected 3 weeks.", clientFacingSummary: "Planning submission under review. Awaiting council assessment response." })

  // Nexus Health Partners
  await makeTask({ clientId: client5.id, title: "Healthcare regulatory compliance review", description: "Full TGA compliance review for new product line", category: "REGULATORY", assignedToId: senior2.id, reviewerId: admin.id, status: "IN_PROGRESS", priority: "URGENT", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.0, clientFacingSummary: "TGA compliance review in progress for new product line. Regulatory pathway being assessed." })
  await makeTask({ clientId: client5.id, title: "Clinical trial agreements", category: "CONTRACT_DRAFTING", assignedToId: senior2.id, reviewerId: admin.id, status: "IN_PROGRESS", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, clientFacingSummary: "Clinical trial agreements being drafted for hospital partnerships." })
  await makeTask({ clientId: client5.id, title: "Medical device IP licensing agreement", category: "NEGOTIATION", assignedToId: admin.id, reviewerId: admin.id, status: "COMPLETED", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.5, clientFacingSummary: "Medical device IP licensing agreement negotiated and executed. Royalty structure and exclusivity provisions agreed.", completedAt: new Date(now.getFullYear(), now.getMonth(), 11), createdAt: thisMonth })
  await makeTask({ clientId: client5.id, title: "Employment contracts — medical staff", category: "EMPLOYMENT", assignedToId: junior1.id, reviewerId: senior2.id, status: "COMPLETED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.7, clientFacingSummary: "Medical and nursing employment agreements updated to reflect FWC modern award changes.", completedAt: new Date(now.getFullYear(), now.getMonth(), 5), createdAt: thisMonth })
  await makeTask({ clientId: client5.id, title: "Subcontractor nurse agreements", category: "CONTRACT_DRAFTING", assignedToId: junior1.id, reviewerId: senior2.id, status: "ASSIGNED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.7, clientFacingSummary: "Independent contractor agreements being drafted for nurse bank program." })
  await makeTask({ clientId: client5.id, title: "Privacy policy — patient data", category: "REGULATORY", assignedToId: paralegal.id, reviewerId: senior2.id, status: "NEW", priority: "PRIORITY", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 0.4, clientFacingSummary: "Privacy policy update commenced for patient data management changes." })
  await makeTask({ clientId: client5.id, title: "Hospital partnership structure advice", category: "GENERAL_ADVICE", assignedToId: admin.id, status: "COMPLETED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 1.5, clientFacingSummary: "Legal advice provided on hospital partnership structure options. Three structural models assessed.", completedAt: new Date(now.getFullYear(), now.getMonth(), 14), createdAt: thisMonth })

  // Last month tasks for trend data
  await makeTask({ clientId: client1.id, title: "Director service agreement", category: "EMPLOYMENT", assignedToId: senior1.id, status: "COMPLETED", priority: "NORMAL", complexity: "MEDIUM", effortScore: 3, seniorityMultiplier: 1.0, clientFacingSummary: "Director service agreement drafted and executed.", completedAt: lastMonthDate, createdAt: lastMonthDate })
  await makeTask({ clientId: client2.id, title: "EBA negotiation support", category: "EMPLOYMENT", assignedToId: admin.id, status: "COMPLETED", priority: "PRIORITY", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.5, clientFacingSummary: "Enterprise bargaining agreement negotiations supported. Key terms agreed.", completedAt: lastMonthDate, createdAt: lastMonthDate })
  await makeTask({ clientId: client4.id, title: "Portfolio lease review", category: "CONTRACT_REVIEW", assignedToId: senior1.id, status: "COMPLETED", priority: "NORMAL", complexity: "HIGH", effortScore: 6, seniorityMultiplier: 1.0, clientFacingSummary: "Portfolio lease review completed. 12 leases assessed.", completedAt: lastMonthDate, createdAt: lastMonthDate })
  await makeTask({ clientId: client5.id, title: "TGA regulatory submission", category: "REGULATORY", assignedToId: senior2.id, status: "COMPLETED", priority: "PRIORITY", complexity: "STRATEGIC", effortScore: 10, seniorityMultiplier: 1.0, clientFacingSummary: "Regulatory submission prepared and lodged with TGA.", completedAt: lastMonthDate, createdAt: lastMonthDate })

  console.log("Created 41 tasks")

  // Capacity records
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  for (const member of [admin, senior1, senior2, junior1, paralegal]) {
    await prisma.teamMemberCapacity.upsert({
      where: { userId_month_year: { userId: member.id, month, year } },
      update: {},
      create: { userId: member.id, month, year, capacityUnits: member.capacityUnits },
    })
  }

  console.log("\nSeed complete!")
  console.log("Login credentials:")
  console.log("  Admin:       veroshan@ranged.com.au / Ver0sh@n")
  console.log("  Senior:      james@rangedlegal.com / password123")
  console.log("  Senior:      priya@rangedlegal.com / password123")
  console.log("  Junior:      tom@rangedlegal.com / password123")
  console.log("  Paralegal:   emma@rangedlegal.com / password123")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
