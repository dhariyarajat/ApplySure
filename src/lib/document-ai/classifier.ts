/**
 * ApplySure AI - Document Classifier Service
 *
 * STEP 1: Determine if uploaded file is a valid document.
 * STEP 2: Identify document type if valid.
 *
 * STRICT RULES:
 * - Selfies, person photos, animal photos, nature photos,
 *   screenshots, memes → REJECT immediately
 * - Only classify known document types
 * - Never guess or hallucinate document types
 */

import type { ClassificationResult, DocumentType } from "./types"
import { REJECTION_REASONS, SUPPORTED_DOCUMENT_TYPES, DOCUMENT_LABELS } from "./types"
import { assessImageQuality } from "./confidence"

export interface ClassificationInput {
  rawText: string
  ocrConfidence: number
  imageDimensions?: { width: number; height: number }
  fileSizeBytes?: number
  fileName?: string
}

const DOCUMENT_TEXT_PATTERNS: Record<DocumentType, RegExp[]> = {
  aadhaar: [
    /aadhaar/i,
    /uidai/i,
    /\d{4}\s*\d{4}\s*\d{4}/,
    /government of india/i,
    /भारत सरकार/i,
    /आधार/i,
    /enrollment/i,
    /enrolment/i,
    /yob|year of birth/i,
    /male|female|transgender/i,
  ],
  income_certificate: [
    /income/i,
    /आय/i,
    /प्रमाण/i,
    /certificate/i,
    /annual income/i,
    /family income/i,
    /yearly income/i,
    /राशि/i,
    /tehsil/i,
    /tahsildar/i,
    /revenue/i,
  ],
  marksheet: [
    /marksheet|marks\s*heet/i,
    /अंक/i,
    /पत्र/i,
    /marks obtained/i,
    /total marks/i,
    /percentage/i,
    /grade/i,
    /semester/i,
    /examination/i,
    /roll\s*no/i,
    /result/i,
  ],
  caste_certificate: [
    /caste/i,
    /जाति/i,
    /प्रमाण/i,
    /certificate/i,
    /category/i,
    /scheduled caste|scheduled tribe|other backward/i,
    /sc|st|obc/i,
    /community/i,
    /वर्ग/i,
  ],
  bank_passbook: [
    /bank/i,
    /passbook/i,
    /account/i,
    /बैंक/i,
    /ifsc/i,
    /branch/i,
    /savings/i,
    /deposit/i,
    /statement/i,
    /transaction/i,
    /balance/i,
  ],
  unknown: [],
}

const DOCUMENT_ENROLLMENT_ID_PATTERNS = [
  /\d{4}\s*\d{4}\s*\d{4}/, // Aadhaar format
  /[A-Z]{4}\d{7}/, // IFSC pattern
  /\d{9,18}/, // Bank account
  /[A-Z0-9]{6,}/, // General IDs
]

function detectNonDocumentContent(rawText: string): { isNonDocument: boolean; reason: string | null } {
  const lowerText = rawText.toLowerCase().trim()

  // Check for very short text indicative of non-documents
  if (lowerText.length < 10) {
    return { isNonDocument: true, reason: "No content detected in the image" }
  }

  // Check for selfie/person indicators
  const selfiePatterns = /\b(selfie|portrait|my photo|group photo|party|celebration|wedding|birthday)\b/i
  if (selfiePatterns.test(lowerText)) {
    return { isNonDocument: true, reason: REJECTION_REASONS.selfie }
  }

  // Check for animal indicators
  const animalPatterns = /\b(dog|cat|pet|animal|puppy|kitten|bird|fish|horse|cow)\b/i
  if (animalPatterns.test(lowerText)) {
    return { isNonDocument: true, reason: REJECTION_REASONS.animal }
  }

  // Check for nature/landscape indicators
  const naturePatterns = /\b(nature|landscape|scenery|sunset|sunrise|beach|mountain|forest|river|lake|ocean)\b/i
  if (naturePatterns.test(lowerText)) {
    return { isNonDocument: true, reason: REJECTION_REASONS.nature }
  }

  // Check for screenshot/meme indicators
  const screenshotPatterns = /\b(screenshot|screen.?shot|meme|funny|repost|share this)\b/i
  if (screenshotPatterns.test(lowerText)) {
    return { isNonDocument: true, reason: REJECTION_REASONS.screenshot }
  }

  return { isNonDocument: false, reason: null }
}

function validateDocumentTextPresence(rawText: string): boolean {
  // A valid document should have some structured text
  const lines = rawText.split("\n").filter((l) => l.trim().length > 0)

  // Need at least some content
  if (lines.length < 2) return false

  // Check if there are any recognizable document patterns
  for (const patterns of Object.values(DOCUMENT_TEXT_PATTERNS)) {
    const matchCount = patterns.filter((p) => p.test(rawText)).length
    if (matchCount >= 2) return true
  }

  // Check for ID/enrollment number patterns
  for (const pattern of DOCUMENT_ENROLLMENT_ID_PATTERNS) {
    if (pattern.test(rawText)) return true
  }

  return false
}

function detectDocumentType(rawText: string): { type: DocumentType; confidence: number; matchScore: number } {
  let bestType: DocumentType = "unknown"
  let bestScore = 0

  for (const type of SUPPORTED_DOCUMENT_TYPES) {
    const patterns = DOCUMENT_TEXT_PATTERNS[type]
    let score = 0
    const totalPatterns = patterns.length

    for (const pattern of patterns) {
      if (pattern.test(rawText)) {
        score += 100 / totalPatterns
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }

  // Scale confidence based on match score (deterministic - no random values)
  let confidence = 0
  if (bestScore >= 70) confidence = 95
  else if (bestScore >= 50) confidence = 82
  else if (bestScore >= 30) confidence = 68
  else if (bestScore >= 15) confidence = 48
  else confidence = 28

  return { type: bestType, confidence, matchScore: Math.round(bestScore) }
}

export function classifyDocument(input: ClassificationInput): ClassificationResult {
  const { rawText, ocrConfidence } = input

  // Step 1: Check for non-document content
  const nonDocCheck = detectNonDocumentContent(rawText)
  if (nonDocCheck.isNonDocument) {
    return {
      isValidDocument: false,
      documentType: "unknown",
      reason: nonDocCheck.reason!,
      confidence: 0,
    }
  }

  // Step 2: Check if the image quality is sufficient
  const imageQuality = assessImageQuality(rawText.length, ocrConfidence, ocrConfidence)
  if (imageQuality === "unreadable") {
    return {
      isValidDocument: false,
      documentType: "unknown",
      reason: REJECTION_REASONS.blurry,
      confidence: Math.round(ocrConfidence),
    }
  }

  // Step 3: Validate document text presence
  const hasDocumentText = validateDocumentTextPresence(rawText)
  if (!hasDocumentText) {
    return {
      isValidDocument: false,
      documentType: "unknown",
      reason: REJECTION_REASONS.unknown,
      confidence: Math.round(ocrConfidence * 0.3),
    }
  }

  // Step 4: Detect document type
  const detection = detectDocumentType(rawText)

  if (detection.type === "unknown" || detection.confidence < 40) {
    return {
      isValidDocument: false,
      documentType: "unknown",
      reason: REJECTION_REASONS.unknown,
      confidence: detection.confidence,
    }
  }

  return {
    isValidDocument: true,
    documentType: detection.type,
    reason: `${DOCUMENT_LABELS[detection.type] ?? detection.type} detected successfully`,
    confidence: detection.confidence,
  }
}
