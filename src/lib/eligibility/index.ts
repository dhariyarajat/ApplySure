/**
 * ApplySure AI - Eligibility Explanation Engine
 *
 * Entry point for eligibility breakdown, insights, and recommendations.
 *
 * Usage:
 *   import { generateBreakdown, generateInsights } from "@/lib/eligibility"
 *
 *   const breakdown = generateBreakdown(student, scholarship)
 *   console.log(breakdown.score, breakdown.recommendations)
 */

export { generateBreakdown, generateInsights } from "./engine"
export type {
  CriterionDetail,
  EligibilityBreakdown,
  EligibilityInsights,
} from "./types"
