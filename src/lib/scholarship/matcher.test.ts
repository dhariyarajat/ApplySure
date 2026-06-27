import { describe, it, expect } from "vitest"
import { matchScholarships } from "./matcher"
import type { StudentProfile } from "./types"
import { SCHOLARSHIP_DATABASE } from "./database"

const OBC_STUDENT_UP: StudentProfile = {
  name: "Rajat Kumar",
  income: 180000,
  category: "OBC",
  marks: 87,
  state: "Uttar Pradesh",
  student: true,
}

const GENERAL_STUDENT: StudentProfile = {
  name: "Arun Sharma",
  income: 500000,
  category: "General",
  marks: 92,
  state: "All India",
  student: true,
}

const LOW_INCOME_SC_STUDENT: StudentProfile = {
  name: "Priya Devi",
  income: 50000,
  category: "SC",
  marks: 72,
  state: "Bihar",
  student: true,
}

const HIGH_INCOME_STUDENT: StudentProfile = {
  name: "Vikram Singh",
  income: 900000,
  category: "General",
  marks: 85,
  state: "Maharashtra",
  student: true,
}

const LOW_MARKS_STUDENT: StudentProfile = {
  name: "Suman Yadav",
  income: 150000,
  category: "OBC",
  marks: 35,
  state: "Uttar Pradesh",
  student: true,
}

const MINORITY_STUDENT: StudentProfile = {
  name: "Fatima Khan",
  income: 150000,
  category: "Minority",
  marks: 78,
  state: "Uttar Pradesh",
  student: true,
}

describe("matchScholarships", () => {
  it("returns all three categories (eligible, partial, not eligible)", () => {
    const result = matchScholarships(OBC_STUDENT_UP)
    expect(result).toHaveProperty("eligibleScholarships")
    expect(result).toHaveProperty("partiallyEligible")
    expect(result).toHaveProperty("notEligible")
    expect(Array.isArray(result.eligibleScholarships)).toBe(true)
    expect(Array.isArray(result.partiallyEligible)).toBe(true)
    expect(Array.isArray(result.notEligible)).toBe(true)
  })

  it("returns scholarships sorted by eligibility descending", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    for (let i = 1; i < result.eligibleScholarships.length; i++) {
      expect(result.eligibleScholarships[i - 1].eligibilityPercentage)
        .toBeGreaterThanOrEqual(result.eligibleScholarships[i].eligibilityPercentage)
    }
  })

  it("returns MatchResult with all required fields", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    for (const match of [
      ...result.eligibleScholarships,
      ...result.partiallyEligible,
      ...result.notEligible,
    ]) {
      expect(match).toHaveProperty("scholarship")
      expect(match).toHaveProperty("eligibilityPercentage")
      expect(match).toHaveProperty("reason")
      expect(match).toHaveProperty("benefits")
      expect(match).toHaveProperty("applyLink")
      expect(match).toHaveProperty("matchedCriteria")
      expect(match).toHaveProperty("unmatchedCriteria")
      expect(typeof match.eligibilityPercentage).toBe("number")
      expect(match.eligibilityPercentage).toBeGreaterThanOrEqual(0)
      expect(match.eligibilityPercentage).toBeLessThanOrEqual(100)
      expect(Array.isArray(match.matchedCriteria)).toBe(true)
      expect(Array.isArray(match.unmatchedCriteria)).toBe(true)
    }
  })

  it("identifies OBC student from UP as eligible for UP OBC scholarships", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    const postMatricOBC = result.eligibleScholarships.find(
      (m) => m.scholarship.id === "postmatric-obc"
    )
    expect(postMatricOBC).toBeDefined()
    expect(postMatricOBC!.eligibilityPercentage).toBeGreaterThanOrEqual(80)
    expect(postMatricOBC!.matchedCriteria).toContain("Category eligibility")
    expect(postMatricOBC!.matchedCriteria).toContain(
      `Income within limit (₹2,50,000)`
    )
  })

  it("identifies UP-specific scholarships for UP students", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    const upPostMatric = result.eligibleScholarships.find(
      (m) => m.scholarship.id === "up-postmatric"
    )
    expect(upPostMatric).toBeDefined()
    expect(upPostMatric!.eligibilityPercentage).toBeGreaterThanOrEqual(70)
  })

  it("marks high-income students as partially/not eligible for income-limited scholarships", () => {
    const result = matchScholarships(HIGH_INCOME_STUDENT)

    // CSSS should appear in partiallyEligible or notEligible due to income limit (90k > 4.5L)
    const csss = [...result.partiallyEligible, ...result.notEligible].find(
      (m) => m.scholarship.id === "csss-ug"
    )
    expect(csss).toBeDefined()
    expect(csss!.eligibilityPercentage).toBeLessThan(80)
    expect(csss!.unmatchedCriteria.some((c) => c.toLowerCase().includes("income"))).toBe(true)
  })

  it("correctly handles low-marks students", () => {
    const result = matchScholarships(LOW_MARKS_STUDENT)

    // Should have many not-eligible due to marks
    const marksRelatedUnmatched = result.notEligible.filter((m) =>
      m.unmatchedCriteria.some((c) => c.toLowerCase().includes("marks"))
    )
    expect(marksRelatedUnmatched.length).toBeGreaterThan(0)
  })

  it("correctly handles SC/ST students", () => {
    const result = matchScholarships(LOW_INCOME_SC_STUDENT)

    const postMatricSC = result.eligibleScholarships.find(
      (m) => m.scholarship.id === "postmatric-sc"
    )
    expect(postMatricSC).toBeDefined()
    expect(postMatricSC!.eligibilityPercentage).toBeGreaterThanOrEqual(80)
  })

  it("correctly handles minority students", () => {
    const result = matchScholarships(MINORITY_STUDENT)

    const postMatricMinority = result.eligibleScholarships.find(
      (m) => m.scholarship.id === "postmatric-minority"
    )
    expect(postMatricMinority).toBeDefined()
    expect(postMatricMinority!.eligibilityPercentage).toBeGreaterThanOrEqual(70)
  })

  it("returns results for every scholarship in the database", () => {
    const result = matchScholarships(OBC_STUDENT_UP)
    const totalResults =
      result.eligibleScholarships.length +
      result.partiallyEligible.length +
      result.notEligible.length
    expect(totalResults).toBe(SCHOLARSHIP_DATABASE.length)
  })

  it("handles income=0 scholarships (special schemes) correctly", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    // PMSSS requires ward of ex-serviceman, OBC category doesn't match "General" either
    const pmSSS = [...result.partiallyEligible, ...result.notEligible].find(
      (m) => m.scholarship.id === "pmsss-capf"
    )
    expect(pmSSS).toBeDefined()
    expect(pmSSS!.eligibilityPercentage).toBeLessThan(80)
  })

  it("provides meaningful reason text", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    for (const match of result.eligibleScholarships.slice(0, 3)) {
      expect(match.reason.length).toBeGreaterThan(10)
      expect(match.reason).toContain(match.scholarship.name)
    }
  })

  it("provides benefits text", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    for (const match of result.eligibleScholarships.slice(0, 3)) {
      expect(match.benefits.length).toBeGreaterThan(5)
    }
  })

  it("provides apply link", () => {
    const result = matchScholarships(OBC_STUDENT_UP)

    for (const match of result.eligibleScholarships.slice(0, 3)) {
      expect(match.applyLink).toBeTruthy()
      expect(match.applyLink).toMatch(/^https?:\/\//)
    }
  })
})
