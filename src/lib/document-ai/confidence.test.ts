import { describe, it, expect } from "vitest"
import {
  assessImageQuality,
  calculateFieldConfidence,
  calculateOverallConfidence,
  shouldAcceptField,
  getFieldConfidenceLabel,
  CONFIDENCE_THRESHOLDS,
} from "./confidence"

describe("assessImageQuality", () => {
  it("returns 'clear' for high confidence and long text", () => {
    expect(assessImageQuality(200, 95, 95)).toBe("clear")
  })

  it("returns 'partial' for moderate confidence and medium text", () => {
    expect(assessImageQuality(60, 75, 75)).toBe("partial")
  })

  it("returns 'blurry' for low confidence", () => {
    expect(assessImageQuality(30, 50, 50)).toBe("blurry")
  })

  it("returns 'unreadable' for very low confidence", () => {
    expect(assessImageQuality(5, 20, 20)).toBe("unreadable")
  })

  it("returns 'blurry' for empty text with moderate ocr confidence", () => {
    expect(assessImageQuality(0, 50, 45)).toBe("blurry")
  })
})

describe("calculateFieldConfidence", () => {
  it("returns 0 when field is not found", () => {
    expect(calculateFieldConfidence(90, 100, false, 80)).toBe(0)
  })

  it("calculates high confidence for clear OCR match", () => {
    const confidence = calculateFieldConfidence(95, 150, true, 90)
    expect(confidence).toBeGreaterThanOrEqual(80)
    expect(confidence).toBeLessThanOrEqual(100)
  })

  it("returns moderate confidence for partial match", () => {
    const confidence = calculateFieldConfidence(70, 30, true, 60)
    expect(confidence).toBeGreaterThanOrEqual(30)
    expect(confidence).toBeLessThanOrEqual(90)
  })

  it("returns lower confidence for poor OCR quality", () => {
    const confidence = calculateFieldConfidence(40, 10, true, 30)
    expect(confidence).toBeLessThan(70)
  })

  it("is deterministic (same inputs produce same output)", () => {
    const result1 = calculateFieldConfidence(85, 100, true, 80)
    const result2 = calculateFieldConfidence(85, 100, true, 80)
    expect(result1).toBe(result2)
  })
})

describe("calculateOverallConfidence", () => {
  it("returns quality baseline when no fields", () => {
    const clear = calculateOverallConfidence({}, "clear")
    expect(clear).toBeGreaterThanOrEqual(95)

    const unreadable = calculateOverallConfidence({}, "unreadable")
    expect(unreadable).toBeLessThanOrEqual(39)
  })

  it("combines field confidences with quality baseline", () => {
    const fields = { name: 95, dob: 90 }
    const score = calculateOverallConfidence(fields, "clear")
    expect(score).toBeGreaterThanOrEqual(90)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("handles mixed field qualities", () => {
    const fields = { name: 95, income: 45 }
    const score = calculateOverallConfidence(fields, "partial")
    expect(score).toBeGreaterThanOrEqual(50)
  })
})

describe("shouldAcceptField", () => {
  it("accepts fields with confidence >= 70", () => {
    expect(shouldAcceptField(70)).toBe(true)
    expect(shouldAcceptField(85)).toBe(true)
    expect(shouldAcceptField(100)).toBe(true)
  })

  it("rejects fields with confidence < 70", () => {
    expect(shouldAcceptField(69)).toBe(false)
    expect(shouldAcceptField(50)).toBe(false)
    expect(shouldAcceptField(0)).toBe(false)
  })
})

describe("getFieldConfidenceLabel", () => {
  it("returns correct labels for each range", () => {
    expect(getFieldConfidenceLabel(98)).toBe("Excellent")
    expect(getFieldConfidenceLabel(88)).toBe("High")
    expect(getFieldConfidenceLabel(72)).toBe("Good")
    expect(getFieldConfidenceLabel(50)).toBe("Low")
    expect(getFieldConfidenceLabel(20)).toBe("Unreliable")
  })
})

describe("CONFIDENCE_THRESHOLDS", () => {
  it("has correct minimum field confidence", () => {
    expect(CONFIDENCE_THRESHOLDS.MINIMUM_FIELD_CONFIDENCE).toBe(70)
  })

  it("has quality ranges that cover 0-100", () => {
    const allMins = Object.values(CONFIDENCE_THRESHOLDS.QUALITY_RANGES).map((r) => r.min)
    const allMaxs = Object.values(CONFIDENCE_THRESHOLDS.QUALITY_RANGES).map((r) => r.max)
    expect(Math.min(...allMins)).toBe(0)
    expect(Math.max(...allMaxs)).toBe(100)
  })
})
