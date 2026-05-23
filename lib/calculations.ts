export const URGENCY_MULTIPLIERS: Record<string, number> = {
  NORMAL: 1.0,
  PRIORITY: 1.25,
  URGENT: 1.5,
}

export const SENIORITY_MULTIPLIERS: Record<string, number> = {
  PARALEGAL: 0.4,
  LEGAL_OPS: 0.4,
  JUNIOR_LAWYER: 0.7,
  SENIOR_LAWYER: 1.0,
  PRINCIPAL: 1.5,
  PARTNER: 1.5,
  ADMIN: 0.4,
  TEAM_MEMBER: 0.7,
  VIEWER: 0.4,
}

export const EFFORT_SCORES: Record<string, number> = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 6,
  STRATEGIC: 10,
}

export function calculateWeightedEffort(
  effortScore: number,
  seniorityMultiplier: number,
  urgencyMultiplier: number,
): number {
  return parseFloat((effortScore * seniorityMultiplier * urgencyMultiplier).toFixed(2))
}

export interface CostToServeResult {
  labourCost: number
  adminUplift: number
  overheadCost: number
  directCosts: number
  totalCostToServe: number
  directMargin: number
  fullyLoadedMargin: number
  directMarginPct: number
  fullyLoadedMarginPct: number
}

export function calculateCostToServe(
  totalWeightedUnits: number,
  monthlyFee: number,
  blendedCostPerUnit: number,
  adminUpliftPct: number,
  overheadPct: number,
  directCosts = 0,
): CostToServeResult {
  const labourCost = totalWeightedUnits * blendedCostPerUnit
  const adminUplift = labourCost * (adminUpliftPct / 100)
  const overheadCost = monthlyFee * (overheadPct / 100)
  const totalCostToServe = labourCost + adminUplift + overheadCost + directCosts

  const directMargin = monthlyFee - labourCost - directCosts
  const fullyLoadedMargin = monthlyFee - totalCostToServe

  const directMarginPct = monthlyFee > 0 ? (directMargin / monthlyFee) * 100 : 0
  const fullyLoadedMarginPct = monthlyFee > 0 ? (fullyLoadedMargin / monthlyFee) * 100 : 0

  return {
    labourCost: parseFloat(labourCost.toFixed(2)),
    adminUplift: parseFloat(adminUplift.toFixed(2)),
    overheadCost: parseFloat(overheadCost.toFixed(2)),
    directCosts,
    totalCostToServe: parseFloat(totalCostToServe.toFixed(2)),
    directMargin: parseFloat(directMargin.toFixed(2)),
    fullyLoadedMargin: parseFloat(fullyLoadedMargin.toFixed(2)),
    directMarginPct: parseFloat(directMarginPct.toFixed(1)),
    fullyLoadedMarginPct: parseFloat(fullyLoadedMarginPct.toFixed(1)),
  }
}

export function calculateUtilisation(
  assignedWeightedUnits: number,
  completedWeightedUnits: number,
  capacityUnits: number,
): number {
  if (capacityUnits === 0) return 0
  const total = assignedWeightedUnits + completedWeightedUnits
  return parseFloat(((total / capacityUnits) * 100).toFixed(1))
}

export function isOverCapacity(
  assignedWeightedUnits: number,
  capacityUnits: number,
): boolean {
  return assignedWeightedUnits > capacityUnits
}
