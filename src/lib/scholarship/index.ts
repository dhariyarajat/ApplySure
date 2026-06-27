/**
 * ApplySure AI - Scholarship Matching Engine
 *
 * Entry point for all scholarship-related services.
 * Usage:
 *   import { matchScholarships } from "@/lib/scholarship"
 *
 *   const results = matchScholarships({
 *     name: "Rajat Kumar",
 *     income: 180000,
 *     category: "OBC",
 *     marks: 87,
 *     state: "Uttar Pradesh",
 *     student: true,
 *   })
 *
 *   console.log(results.eligibleScholarships)
 *   console.log(results.partiallyEligible)
 *   console.log(results.notEligible)
 */

export { matchScholarships } from "./matcher"
export { SCHOLARSHIP_DATABASE, getScholarshipById, getScholarshipsByCategory, getScholarshipsByState } from "./database"
export type {
  StudentProfile,
  Scholarship,
  MatchResult,
  MatchingResults,
} from "./types"
