/**
 * ApplySure AI - Scholarship Matching Engine
 *
 * Compares a student profile against the scholarship database
 * and returns categorized match results with eligibility percentages.
 *
 * Matching Logic:
 * 1. Category check (SC/ST/OBC/General/Minority)
 * 2. Income limit check
 * 3. Minimum marks/percentage check
 * 4. State residency check
 * 5. Gender check (if applicable)
 * 6. Disability check (if applicable)
 * 7. Ward of ex-serviceman check (if applicable)
 */

import type { StudentProfile, Scholarship, MatchResult, MatchingResults } from "./types"
import { SCHOLARSHIP_DATABASE } from "./database"
import { PERCENTAGE_THRESHOLDS } from "./types"

export function matchScholarships(student: StudentProfile): MatchingResults {
  const eligibleScholarships: MatchResult[] = []
  const partiallyEligible: MatchResult[] = []
  const notEligible: MatchResult[] = []

  for (const scholarship of SCHOLARSHIP_DATABASE) {
    const result = evaluateScholarship(student, scholarship)

    if (result.eligibilityPercentage >= PERCENTAGE_THRESHOLDS.FULLY_ELIGIBLE) {
      eligibleScholarships.push(result)
    } else if (result.eligibilityPercentage >= PERCENTAGE_THRESHOLDS.PARTIALLY_ELIGIBLE) {
      partiallyEligible.push(result)
    } else {
      notEligible.push(result)
    }
  }

  // Sort by eligibility percentage descending
  eligibleScholarships.sort((a, b) => b.eligibilityPercentage - a.eligibilityPercentage)
  partiallyEligible.sort((a, b) => b.eligibilityPercentage - a.eligibilityPercentage)
  notEligible.sort((a, b) => b.eligibilityPercentage - a.eligibilityPercentage)

  return { eligibleScholarships, partiallyEligible, notEligible }
}

function evaluateScholarship(student: StudentProfile, scholarship: Scholarship): MatchResult {
  const matchedCriteria: string[] = []
  const unmatchedCriteria: string[] = []
  let totalChecks = 0
  let passedChecks = 0

  // Helper to evaluate a single criterion
  const check = (label: string, passed: boolean, weight: number = 1) => {
    totalChecks += weight
    if (passed) {
      passedChecks += weight
      matchedCriteria.push(label)
    } else {
      unmatchedCriteria.push(label)
    }
  }

  // ─── 1. CATEGORY CHECK ───────────────────────────────────────────
  check(
    "Category eligibility",
    isCategoryEligible(student.category, scholarship.category),
    2
  )

  // ─── 2. INCOME LIMIT CHECK ────────────────────────────────────────
  if (scholarship.incomeLimit > 0) {
    check(
      `Income within limit (₹${scholarship.incomeLimit.toLocaleString("en-IN")})`,
      student.income <= scholarship.incomeLimit,
      2
    )
  } else {
    // No income limit or special scheme
    check("No income restriction", true, 1)
  }

  // ─── 3. MARKS CHECK ──────────────────────────────────────────────
  check(
    `Minimum marks (${scholarship.minimumMarks}%)`,
    student.marks >= scholarship.minimumMarks,
    2
  )

  // ─── 4. STATE CHECK ──────────────────────────────────────────────
  check(
    scholarship.state === "All India" ? "Open to all states" : `State: ${scholarship.state}`,
    scholarship.state === "All India" || student.state === scholarship.state,
    1
  )

  // ─── 5. GENDER CHECK ────────────────────────────────────────────
  if (scholarship.gender && scholarship.gender !== "Any") {
    check(
      `Gender: ${scholarship.gender}`,
      student.gender === scholarship.gender,
      1
    )
  } else {
    check("Open to all genders", true, 0.5)
  }

  // ─── 6. DISABILITY CHECK ─────────────────────────────────────────
  if (scholarship.disabilityRequired) {
    check(
      "Disability required",
      student.disability === true,
      1
    )
  } else {
    check("No disability requirement", true, 0.5)
  }

  // ─── 7. WARD OF EX-SERVICEMAN CHECK ─────────────────────────────
  if (scholarship.wardOfExServiceman) {
    check(
      "Ward of ex-serviceman required",
      student.isWardOfExServiceman === true,
      1
    )
  } else {
    check("No ex-serviceman requirement", true, 0.5)
  }

  // ─── 8. PURSUING CHECK ────────────────────────────────────────────
  if (scholarship.pursuing && scholarship.pursuing.length > 0) {
    check(
      `Field of study: ${scholarship.pursuing.join(" / ")}`,
      student.pursuing ? scholarship.pursuing.some((p) =>
        student.pursuing?.toLowerCase().includes(p.toLowerCase()) ?? false
      ) : false,
      1
    )
  } else {
    check("Open to all fields of study", true, 0.5)
  }

  // ─── CORE CRITERIA HARD GATE ─────────────────────────────────────
  // Category, income, and marks are core criteria. If any fail,
  // cap the percentage to prevent misleading "fully eligible" results.
  let eligibilityPercentage = totalChecks > 0
    ? Math.round((passedChecks / totalChecks) * 100)
    : 0

  // Check which core criteria failed
  const coreFailed = [
    !isCategoryEligible(student.category, scholarship.category),
    scholarship.incomeLimit > 0 && student.income > scholarship.incomeLimit,
    student.marks < scholarship.minimumMarks,
  ].filter(Boolean).length

  // Hard gate: if ALL core criteria fail, not eligible at all
  if (coreFailed >= 3) {
    eligibilityPercentage = Math.min(eligibilityPercentage, 20)
  } else if (coreFailed >= 2) {
    eligibilityPercentage = Math.min(eligibilityPercentage, 35)
  } else if (coreFailed >= 1) {
    // If any single core criterion fails, cap at partially eligible
    eligibilityPercentage = Math.min(eligibilityPercentage, 75)
  }

  // ─── BUILD REASON ────────────────────────────────────────────────
  const reason = buildReason(scholarship, matchedCriteria, unmatchedCriteria, eligibilityPercentage)

  // ─── RETURN RESULT ───────────────────────────────────────────────
  return {
    scholarship,
    eligibilityPercentage: Math.min(eligibilityPercentage, 100),
    reason,
    benefits: scholarship.benefits,
    applyLink: scholarship.applicationLink,
    matchedCriteria,
    unmatchedCriteria,
  }
}

function isCategoryEligible(studentCategory: string, scholarshipCategory: string): boolean {
  // "All" means open to all
  if (scholarshipCategory === "All") return true

  // Direct match
  if (studentCategory.toUpperCase() === scholarshipCategory.toUpperCase()) return true

  // Map student category to broader group
  const upper = studentCategory.toUpperCase()
  if (upper === "SC" || upper === "ST") {
    return scholarshipCategory === "SC" || scholarshipCategory === "ST" || scholarshipCategory === "SC/ST"
  }

  return false
}

function buildReason(
  scholarship: Scholarship,
  matched: string[],
  unmatched: string[],
  percentage: number
): string {
  const parts: string[] = []

  if (percentage >= 80) {
    parts.push(`You meet most criteria for ${scholarship.name}`)
  } else if (percentage >= 50) {
    parts.push(`You partially qualify for ${scholarship.name}`)
  } else {
    parts.push(`You do not qualify for ${scholarship.name}`)
  }

  if (matched.length > 0) {
    parts.push(`✅ Matched: ${matched.slice(0, 3).join(", ")}${matched.length > 3 ? ` +${matched.length - 3} more` : ""}`)
  }

  if (unmatched.length > 0) {
    const criticalUnmatched = unmatched.slice(0, 2)
    parts.push(`❌ Unmet: ${criticalUnmatched.join(", ")}`)
  }

  return parts.join(". ")
}
