/**
 * ApplySure AI - Eligibility Explanation Engine
 *
 * Generates transparent, detailed eligibility breakdowns for
 * every scholarship recommendation so students always understand
 * WHY they scored a certain percentage.
 *
 * This module is a pure enhancement layer — it does NOT modify
 * the matching logic in src/lib/scholarship/matcher.ts.
 */

import type { StudentProfile, Scholarship } from "@/lib/scholarship/types"
import type { CriterionDetail, EligibilityBreakdown, EligibilityInsights } from "./types"

/**
 * Generate a detailed eligibility breakdown for a single scholarship
 * against a student's profile.
 */
export function generateBreakdown(
  student: StudentProfile,
  scholarship: Scholarship,
): EligibilityBreakdown {
  const criteria: CriterionDetail[] = []

  // ─── 1. INCOME CHECK ────────────────────────────────────────────
  if (scholarship.incomeLimit > 0) {
    criteria.push({
      label: "Income Requirement",
      met: student.income <= scholarship.incomeLimit,
      details: student.income <= scholarship.incomeLimit
        ? `Your annual income (₹${student.income.toLocaleString("en-IN")}) is within the limit of ₹${scholarship.incomeLimit.toLocaleString("en-IN")}.`
        : `Your annual income (₹${student.income.toLocaleString("en-IN")}) exceeds the limit of ₹${scholarship.incomeLimit.toLocaleString("en-IN")}.`,
      weight: 3,
    })
  } else {
    criteria.push({
      label: "Income Requirement",
      met: true,
      details: "This scholarship has no income restriction (special scheme for wards of CAPFs/ex-servicemen).",
      weight: 1,
    })
  }

  // ─── 2. CATEGORY CHECK ──────────────────────────────────────────
  const categoryMet = isCategoryEligible(student.category, scholarship.category)
  if (scholarship.category === "All") {
    criteria.push({
      label: "Category Requirement",
      met: true,
      details: `This scholarship is open to all categories. Your category (${student.category}) is eligible.`,
      weight: 2,
    })
  } else if (categoryMet) {
    criteria.push({
      label: "Category Requirement",
      met: true,
      details: `Your category (${student.category}) matches the required category (${scholarship.category}).`,
      weight: 2,
    })
  } else {
    criteria.push({
      label: "Category Requirement",
      met: false,
      details: `Your category (${student.category}) does not match the required category (${scholarship.category}).`,
      weight: 2,
    })
  }

  // ─── 3. STATE CHECK ─────────────────────────────────────────────
  if (scholarship.state === "All India") {
    criteria.push({
      label: "State Requirement",
      met: true,
      details: "This scholarship is open to students from all states in India.",
      weight: 1,
    })
  } else if (student.state === scholarship.state) {
    criteria.push({
      label: "State Requirement",
      met: true,
      details: `Your state (${student.state}) matches the required domicile (${scholarship.state}).`,
      weight: 1,
    })
  } else {
    criteria.push({
      label: "State Requirement",
      met: false,
      details: `This scholarship requires domicile in ${scholarship.state}. Your current state is ${student.state || "not specified"}.`,
      weight: 1,
    })
  }

  // ─── 4. MARKS CHECK ─────────────────────────────────────────────
  criteria.push({
    label: "Marks Requirement",
    met: student.marks >= scholarship.minimumMarks,
    details: student.marks >= scholarship.minimumMarks
      ? `Your marks (${student.marks}%) meet the minimum requirement of ${scholarship.minimumMarks}%.`
      : `You scored ${student.marks}%. Required minimum marks are ${scholarship.minimumMarks}%.`,
    weight: 3,
  })

  // ─── 5. GENDER CHECK ────────────────────────────────────────────
  if (scholarship.gender && scholarship.gender !== "Any") {
    criteria.push({
      label: "Gender Requirement",
      met: student.gender === scholarship.gender,
      details: student.gender === scholarship.gender
        ? `Your gender (${student.gender}) matches the requirement (${scholarship.gender}).`
        : `This scholarship is specifically for ${scholarship.gender} candidates.`,
      weight: 1,
    })
  } else {
    criteria.push({
      label: "Gender Requirement",
      met: true,
      details: "This scholarship is open to all genders.",
      weight: 0.5,
    })
  }

  // ─── 6. DISABILITY CHECK ─────────────────────────────────────────
  if (scholarship.disabilityRequired) {
    criteria.push({
      label: "Disability Requirement",
      met: student.disability === true,
      details: student.disability === true
        ? "You meet the disability requirement for this scholarship."
        : "This scholarship requires a certified disability. Please provide documentation if applicable.",
      weight: 1,
    })
  } else {
    criteria.push({
      label: "Disability Requirement",
      met: true,
      details: "No disability requirement for this scholarship.",
      weight: 0.5,
    })
  }

  // ─── 7. WARD OF EX-SERVICEMAN CHECK ────────────────────────────
  if (scholarship.wardOfExServiceman) {
    criteria.push({
      label: "Ex-Serviceman Ward Requirement",
      met: student.isWardOfExServiceman === true,
      details: student.isWardOfExServiceman === true
        ? "You meet the ward of ex-serviceman requirement."
        : "This scholarship is reserved for wards of ex-servicemen / CAPF personnel only.",
      weight: 1,
    })
  } else {
    criteria.push({
      label: "Ex-Serviceman Ward Requirement",
      met: true,
      details: "No ex-serviceman ward requirement for this scholarship.",
      weight: 0.5,
    })
  }

  // ─── 8. FIELD OF STUDY CHECK ────────────────────────────────────
  if (scholarship.pursuing && scholarship.pursuing.length > 0) {
    const fieldMatch = student.pursuing
      ? scholarship.pursuing.some((p) =>
          student.pursuing?.toLowerCase().includes(p.toLowerCase()) ?? false,
        )
      : false
    criteria.push({
      label: "Field of Study Requirement",
      met: fieldMatch,
      details: fieldMatch
        ? `Your field of study (${student.pursuing}) is covered by this scholarship (${scholarship.pursuing.join(" / ")}).`
        : `This scholarship is for ${scholarship.pursuing.join(" / ")}. Your field (${student.pursuing || "not specified"}) does not match.`,
      weight: 1,
    })
  } else {
    criteria.push({
      label: "Field of Study Requirement",
      met: true,
      details: "This scholarship is open to all fields of study.",
      weight: 0.5,
    })
  }

  // ─── CALCULATE SCORE ────────────────────────────────────────────
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  const earnedWeight = criteria
    .filter((c) => c.met)
    .reduce((sum, c) => sum + c.weight, 0)

  let score = totalWeight > 0
    ? Math.round((earnedWeight / totalWeight) * 100)
    : 0

  // Apply core criteria hard gate (same logic as matcher)
  const coreCriteria = criteria.filter((c) =>
    ["Income Requirement", "Category Requirement", "Marks Requirement"].includes(c.label),
  )
  const coreFailed = coreCriteria.filter((c) => !c.met).length

  if (coreFailed >= 3) {
    score = Math.min(score, 20)
  } else if (coreFailed >= 2) {
    score = Math.min(score, 35)
  } else if (coreFailed >= 1) {
    score = Math.min(score, 75)
  }

  score = Math.min(score, 100)

  // ─── BUILD REASON ───────────────────────────────────────────────
  const matched = criteria.filter((c) => c.met)
  const failed = criteria.filter((c) => !c.met)

  const reason = buildExplanation(scholarship, matched, failed, score)

  // ─── BUILD RECOMMENDATIONS ──────────────────────────────────────
  const recommendations = buildRecommendations(student, scholarship, failed)

  return {
    score,
    criteria,
    matchedCriteria: matched,
    failedCriteria: failed,
    reason,
    recommendations,
  }
}

/**
 * Aggregate eligibility insights across all matched scholarships.
 */
export function generateInsights(
  breakdowns: { scholarship: Scholarship; breakdown: EligibilityBreakdown }[],
): EligibilityInsights {
  const strongAreas = new Set<string>()
  const weakAreas = new Set<string>()
  const allRecommendations = new Map<string, number>()
  let fullyEligibleCount = 0
  let partiallyEligibleCount = 0
  let totalScore = 0

  for (const { scholarship, breakdown } of breakdowns) {
    totalScore += breakdown.score

    if (breakdown.score >= 80) fullyEligibleCount++
    else if (breakdown.score >= 50) partiallyEligibleCount++

    // Track which criteria consistently pass/fail
    for (const criterion of breakdown.criteria) {
      const label = criterion.label.replace(" Requirement", "")
      if (criterion.met) {
        strongAreas.add(label)
      } else {
        weakAreas.add(label)
      }
    }

    // Aggregate recommendations with frequency count
    for (const rec of breakdown.recommendations) {
      allRecommendations.set(rec, (allRecommendations.get(rec) || 0) + 1)
    }
  }

  const count = breakdowns.length || 1

  return {
    strongAreas: Array.from(strongAreas).sort(),
    weakAreas: Array.from(weakAreas).sort(),
    recommendations: Array.from(allRecommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rec]) => rec),
    fullyEligibleCount,
    partiallyEligibleCount,
    averageScore: Math.round(totalScore / count),
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────

function isCategoryEligible(studentCategory: string, scholarshipCategory: string): boolean {
  if (scholarshipCategory === "All") return true
  if (studentCategory.toUpperCase() === scholarshipCategory.toUpperCase()) return true

  const upper = studentCategory.toUpperCase()
  if (upper === "SC" || upper === "ST") {
    return scholarshipCategory === "SC" || scholarshipCategory === "ST" || scholarshipCategory === "SC/ST"
  }

  return false
}

function buildExplanation(
  scholarship: Scholarship,
  matched: CriterionDetail[],
  failed: CriterionDetail[],
  score: number,
): string {
  const parts: string[] = []

  if (score >= 80) {
    parts.push(`You meet most criteria for ${scholarship.name}.`)
  } else if (score >= 50) {
    parts.push(`You partially qualify for ${scholarship.name}.`)
  } else {
    parts.push(`You do not fully qualify for ${scholarship.name}.`)
  }

  if (matched.length > 0) {
    const matchedLabels = matched.map((c) => c.label.replace(" Requirement", ""))
    parts.push(
      `Matched: ${matchedLabels.slice(0, 4).join(", ")}${matchedLabels.length > 4 ? ` +${matchedLabels.length - 4} more` : ""}.`,
    )
  }

  if (failed.length > 0) {
    const failedLabels = failed.map((c) => c.label.replace(" Requirement", ""))
    parts.push(
      `Not met: ${failedLabels.slice(0, 3).join(", ")}.`,
    )
  }

  return parts.join(" ")
}

function buildRecommendations(
  student: StudentProfile,
  scholarship: Scholarship,
  failed: CriterionDetail[],
): string[] {
  const recommendations: string[] = []

  for (const criterion of failed) {
    switch (criterion.label) {
      case "Income Requirement":
        recommendations.push(
          `Your income (₹${student.income.toLocaleString("en-IN")}) exceeds the limit (₹${scholarship.incomeLimit.toLocaleString("en-IN")}). Consider applying for scholarships without income restrictions.`,
        )
        break
      case "Category Requirement":
        recommendations.push(
          `This scholarship requires ${scholarship.category} category. Look for scholarships open to ${student.category} candidates.`,
        )
        break
      case "State Requirement":
        recommendations.push(
          `This scholarship requires ${scholarship.state} domicile. Check if you can obtain a domicile certificate or look for all-India scholarships.`,
        )
        break
      case "Marks Requirement":
        recommendations.push(
          `Improve marks to ${scholarship.minimumMarks}% or above to become fully eligible. You currently have ${student.marks}%.`,
        )
        break
      case "Gender Requirement":
        recommendations.push(
          `This scholarship is specifically for ${scholarship.gender} candidates. Explore scholarships open to all genders.`,
        )
        break
      case "Disability Requirement":
        recommendations.push(
          `Upload a valid disability certificate to qualify for this scholarship.`,
        )
        break
      case "Ex-Serviceman Ward Requirement":
        recommendations.push(
          `This scholarship requires a valid ex-serviceman/CAPF ward certificate. Submit supporting documents if applicable.`,
        )
        break
      case "Field of Study Requirement":
        recommendations.push(
          `This scholarship is for ${scholarship.pursuing?.join(" / ")}. Your current field (${student.pursuing || "not specified"}) doesn't match.`,
        )
        break
    }
  }

  // Add general recommendations based on missing data
  if (!student.income) {
    recommendations.push("Upload income certificate to verify your financial status.")
  }
  if (!student.category || student.category === "General") {
    recommendations.push("Verify category document to potentially qualify for reserved scholarships.")
  }
  if (!student.marks) {
    recommendations.push("Update your marksheet to enable academic eligibility checks.")
  }

  return recommendations.slice(0, 5)
}
