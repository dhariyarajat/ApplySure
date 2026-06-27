/**
 * ApplySure AI - Scholarship Matching Engine Types
 */

export interface StudentProfile {
  name: string
  income: number
  category: "SC" | "ST" | "OBC" | "General" | "EWS" | "Minority" | string
  marks: number
  state: string
  student: boolean
  gender?: "Male" | "Female" | "Other"
  disability?: boolean
  isWardOfExServiceman?: boolean
  pursuing?: string
  yearOfStudy?: number
}

export interface Scholarship {
  id: string
  name: string
  provider: string
  category: string
  incomeLimit: number
  minimumMarks: number
  state: string
  applicationLink: string
  description: string
  benefits: string
  gender?: "Male" | "Female" | "Any"
  disabilityRequired?: boolean
  wardOfExServiceman?: boolean
  pursuing?: string[]
  isCentral?: boolean
  academicLevel?: string
}

export interface MatchResult {
  scholarship: Scholarship
  eligibilityPercentage: number
  reason: string
  benefits: string
  applyLink: string
  matchedCriteria: string[]
  unmatchedCriteria: string[]
}

export interface MatchingResults {
  eligibleScholarships: MatchResult[]
  partiallyEligible: MatchResult[]
  notEligible: MatchResult[]
}

export const PERCENTAGE_THRESHOLDS = {
  FULLY_ELIGIBLE: 80,
  PARTIALLY_ELIGIBLE: 50,
}
