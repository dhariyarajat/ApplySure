/**
 * ApplySure AI - Confidence Scoring Service
 *
 * STRICT RULES:
 * - Clearly visible text: 95-100
 * - Partially visible text: 70-90
 * - Blurry image: 40-70
 * - Unreadable: 0-40
 * - If confidence < 70, field value must be null
 */

export interface ConfidenceScore {
  overall: number
  perField: Record<string, number>
  factors: ConfidenceFactor[]
}

export interface ConfidenceFactor {
  name: string
  score: number
  weight: number
  details: string
}

export type ImageQuality = "clear" | "partial" | "blurry" | "unreadable"

export const CONFIDENCE_THRESHOLDS = {
  MINIMUM_FIELD_CONFIDENCE: 70,
  MINIMUM_OVERALL_CONFIDENCE: 40,
  QUALITY_RANGES: {
    clear: { min: 95, max: 100 },
    partial: { min: 70, max: 90 },
    blurry: { min: 40, max: 69 },
    unreadable: { min: 0, max: 39 },
  } as Record<ImageQuality, { min: number; max: number }>,
}

export function assessImageQuality(textLength: number, textClarity: number, ocrConfidence: number): ImageQuality {
  if (ocrConfidence >= 90 && textClarity >= 90 && textLength > 100) return "clear"
  if (ocrConfidence >= 70 && textClarity >= 70 && textLength > 50) return "partial"
  if (ocrConfidence >= 40 || textClarity >= 40) return "blurry"
  return "unreadable"
}

export function calculateFieldConfidence(
  ocrConfidence: number,
  textLength: number,
  fieldFound: boolean,
  patternMatch: number
): number {
  if (!fieldFound) return 0

  // Pattern specificity: shorter patterns are still valid if they match.
  // A source length of 20+ is considered specific enough.
  const adjustedPatternScore = Math.min(100, Math.round((patternMatch / 100) * 100))
  
  // Text context score: how much text we captured
  const textScore = Math.min(100, Math.round((textLength / 50) * 100))

  // Weight: OCR quality matters most, then pattern specificity, then text length
  const baseConfidence = ocrConfidence * 0.45 + adjustedPatternScore * 0.35 + textScore * 0.2

  return Math.round(Math.min(Math.max(baseConfidence, 0), 100))
}

export function calculateOverallConfidence(
  fieldConfidences: Record<string, number>,
  imageQuality: ImageQuality
): number {
  const values = Object.values(fieldConfidences)
  if (values.length === 0) return CONFIDENCE_THRESHOLDS.QUALITY_RANGES[imageQuality].min

  const avgFieldConfidence = values.reduce((a, b) => a + b, 0) / values.length
  const qualityBase = CONFIDENCE_THRESHOLDS.QUALITY_RANGES[imageQuality].min

  const overall = avgFieldConfidence * 0.7 + qualityBase * 0.3
  return Math.round(Math.min(Math.max(overall, 0), 100))
}

export function getFieldConfidenceLabel(confidence: number): string {
  if (confidence >= 95) return "Excellent"
  if (confidence >= 85) return "High"
  if (confidence >= 70) return "Good"
  if (confidence >= 40) return "Low"
  return "Unreliable"
}

export function shouldAcceptField(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLDS.MINIMUM_FIELD_CONFIDENCE
}

export function buildConfidenceScore(
  fieldConfidences: Record<string, number>,
  imageQuality: ImageQuality
): ConfidenceScore {
  const overall = calculateOverallConfidence(fieldConfidences, imageQuality)

  const factors: ConfidenceFactor[] = [
    {
      name: "Image Quality",
      score: CONFIDENCE_THRESHOLDS.QUALITY_RANGES[imageQuality].min,
      weight: 0.3,
      details: `Image quality assessed as: ${imageQuality}`,
    },
    {
      name: "OCR Accuracy",
      score: fieldConfidences["ocr"] ?? 0,
      weight: 0.3,
      details: "Optical Character Recognition accuracy",
    },
    {
      name: "Field Detection",
      score: overall,
      weight: 0.4,
      details: `Detected ${Object.keys(fieldConfidences).length} fields with valid data`,
    },
  ]

  return {
    overall,
    perField: fieldConfidences,
    factors,
  }
}
