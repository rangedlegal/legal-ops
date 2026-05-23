import { describe, it, expect } from "vitest"
import {
  calculateWeightedEffort,
  calculateCostToServe,
  calculateUtilisation,
  isOverCapacity,
  URGENCY_MULTIPLIERS,
  EFFORT_SCORES,
} from "../calculations"

describe("calculateWeightedEffort", () => {
  it("returns effort × seniority × urgency rounded to 2dp", () => {
    expect(calculateWeightedEffort(3, 1.0, 1.0)).toBe(3)
    expect(calculateWeightedEffort(6, 1.5, 1.25)).toBe(11.25)
    expect(calculateWeightedEffort(10, 0.7, 1.5)).toBe(10.5)
  })

  it("handles fractional multipliers without floating-point noise", () => {
    // 3 × 0.4 × 1.25 = 1.5 (not 1.4999999...)
    expect(calculateWeightedEffort(3, 0.4, 1.25)).toBe(1.5)
  })

  it("returns 0 when effortScore is 0", () => {
    expect(calculateWeightedEffort(0, 1.5, 1.5)).toBe(0)
  })

  it("URGENCY_MULTIPLIERS values match expected constants", () => {
    expect(URGENCY_MULTIPLIERS.NORMAL).toBe(1.0)
    expect(URGENCY_MULTIPLIERS.PRIORITY).toBe(1.25)
    expect(URGENCY_MULTIPLIERS.URGENT).toBe(1.5)
  })

  it("EFFORT_SCORES values are consistent with spec", () => {
    expect(EFFORT_SCORES.LOW).toBe(1)
    expect(EFFORT_SCORES.MEDIUM).toBe(3)
    expect(EFFORT_SCORES.HIGH).toBe(6)
    expect(EFFORT_SCORES.STRATEGIC).toBe(10)
  })
})

describe("calculateCostToServe", () => {
  const base = {
    totalWeightedUnits: 10,
    monthlyFee: 5000,
    blendedCostPerUnit: 100,
    adminUpliftPct: 10,
    overheadPct: 5,
    directCosts: 0,
  }

  it("calculates labour cost as units × cost-per-unit", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    expect(result.labourCost).toBe(1000)
  })

  it("calculates admin uplift as % of labour cost", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    expect(result.adminUplift).toBe(100) // 10% of 1000
  })

  it("calculates overhead as % of monthly fee", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    expect(result.overheadCost).toBe(250) // 5% of 5000
  })

  it("sums to correct total cost-to-serve", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    // 1000 + 100 + 250 + 0 = 1350
    expect(result.totalCostToServe).toBe(1350)
  })

  it("calculates direct margin (fee − labour − direct costs)", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    expect(result.directMargin).toBe(4000) // 5000 - 1000
  })

  it("calculates fully-loaded margin (fee − total cost-to-serve)", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    expect(result.fullyLoadedMargin).toBe(3650) // 5000 - 1350
  })

  it("calculates margin percentages correctly", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5)
    expect(result.directMarginPct).toBe(80) // 4000/5000
    expect(result.fullyLoadedMarginPct).toBe(73) // 3650/5000
  })

  it("includes direct costs in total and lowers direct margin", () => {
    const result = calculateCostToServe(10, 5000, 100, 10, 5, 200)
    expect(result.directCosts).toBe(200)
    expect(result.totalCostToServe).toBe(1550) // 1350 + 200
    expect(result.directMargin).toBe(3800) // 5000 - 1000 - 200
  })

  it("returns 0 margins when monthly fee is 0", () => {
    const result = calculateCostToServe(10, 0, 100, 10, 5)
    expect(result.directMarginPct).toBe(0)
    expect(result.fullyLoadedMarginPct).toBe(0)
  })

  it("rounds all money values to 2 decimal places", () => {
    // 7 units × 33 cost = 231, 15% uplift = 34.65, 7% overhead of 1000 = 70
    const result = calculateCostToServe(7, 1000, 33, 15, 7)
    expect(result.labourCost).toBe(231)
    expect(result.adminUplift).toBe(34.65)
    expect(result.overheadCost).toBe(70)
  })
})

describe("calculateUtilisation", () => {
  it("returns percentage of total units used vs capacity", () => {
    expect(calculateUtilisation(5, 5, 20)).toBe(50) // 10/20
  })

  it("can exceed 100% when over capacity", () => {
    expect(calculateUtilisation(15, 10, 20)).toBe(125) // 25/20
  })

  it("returns 0 when capacity is 0", () => {
    expect(calculateUtilisation(10, 5, 0)).toBe(0)
  })

  it("returns 0 when both unit totals are 0", () => {
    expect(calculateUtilisation(0, 0, 20)).toBe(0)
  })

  it("rounds to 1 decimal place", () => {
    // 1/3 = 33.333... → 33.3
    expect(calculateUtilisation(1, 0, 3)).toBe(33.3)
  })
})

describe("isOverCapacity", () => {
  it("returns true when assigned units exceed capacity", () => {
    expect(isOverCapacity(21, 20)).toBe(true)
  })

  it("returns false when assigned units equal capacity", () => {
    expect(isOverCapacity(20, 20)).toBe(false)
  })

  it("returns false when assigned units are below capacity", () => {
    expect(isOverCapacity(5, 20)).toBe(false)
  })
})
