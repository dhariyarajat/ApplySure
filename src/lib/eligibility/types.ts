/**
 * ApplySure AI - Eligibility Explanation Engine Types
 *
 * Provides detailed, transparent eligibility breakdowns
 * for every scholarship recommendation.
 */

/** Detailed information about a single eligibility criterion */
export interface CriterionDetail {
  /** Short label, e.g. "Income Requirement", "Marks Requirement" */
  label: string
  /** Whether the student meets this criterion */
  met: boolean
  /** Human-readable detail explaining WHY, e.g. "Student income: ₹1,80,000. Limit: ₹2,50,000." */
  details: string
  /** Weight of this criterion in the overall calculation (0-10) */
  weight: number
}

/** Full eligibility breakdown for a single scholarship */
export interface EligibilityBreakdown {
  /** Overall eligibility score 0-100 */
  score: number
  /** Detailed breakdown of all evaluated criteria */
  criteria: CriterionDetail[]
  /** All criteria the student meets */
  matchedCriteria: CriterionDetail[]
  /** All criteria the student fails */
  failedCriteria: CriterionDetail[]
  /** Human-readable reason summary */
  reason: string
  /** Personalized recommendations to improve eligibility */
  recommendations: string[]
}

/** Eligibility insights aggregated across all scholarships */
export interface EligibilityInsights {
  /** Areas where the student consistently meets criteria */
  strongAreas: string[]
  /** Areas where the student consistently falls short */
  weakAreas: string[]
  /** Top actionable recommendations to improve overall eligibility */
  recommendations: string[]
  /** Number of scholarships the student is fully eligible for */
  fullyEligibleCount: number
  /** Number of scholarships partially eligible */
  partiallyEligibleCount: number
  /** Average eligibility score across all matches */
  averageScore: number
}
