/**
 * ApplySure AI - Document Classification & Extraction Types
 *
 * STRICT RULES:
 * - NEVER guess information
 * - NEVER hallucinate
 * - NEVER generate fictional data
 * - If information is not clearly visible, return null
 * - If confidence below 70, field should be null
 */

export type DocumentType =
  | "aadhaar"
  | "income_certificate"
  | "marksheet"
  | "caste_certificate"
  | "bank_passbook"
  | "unknown"

export type ValidationStatus = "present" | "missing" | "unclear"

export interface ClassificationResult {
  isValidDocument: boolean
  documentType: DocumentType
  reason: string
  confidence: number
}

export interface ExtractedField {
  value: string | null
  confidence: number
  source: string
}

export interface ExtractedData {
  documentType: DocumentType
  name: string | null
  fatherName: string | null
  dob: string | null
  income: string | null
  category: string | null
  marks: string | null
  bankAccount: string | null
  ifsc: string | null
  confidence: number
  rawText: string
  extractedFields: Record<string, ExtractedField>
}

export interface ValidationResult {
  field: string
  status: ValidationStatus
  expected: boolean
  message?: string
}

export interface DocumentAnalysisResult {
  classification: ClassificationResult
  extraction: ExtractedData | null
  validations: ValidationResult[]
  overallConfidence: number
  processingTimeMs: number
  errors: string[]
}

export type ProcessingStage =
  | "classifying"
  | "extracting"
  | "validating"
  | "scoring"
  | "complete"
  | "error"

export interface ProcessingProgress {
  stage: ProcessingStage
  progress: number
  message: string
}

export const SUPPORTED_DOCUMENT_TYPES: DocumentType[] = [
  "aadhaar",
  "income_certificate",
  "marksheet",
  "caste_certificate",
  "bank_passbook",
]

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  aadhaar: "Aadhaar Card",
  income_certificate: "Income Certificate",
  marksheet: "Academic Marksheet",
  caste_certificate: "Caste Certificate",
  bank_passbook: "Bank Passbook",
  unknown: "Unknown Document",
}

export const DOCUMENT_REQUIRED_FIELDS: Record<DocumentType, string[]> = {
  aadhaar: ["name", "dob"],
  income_certificate: ["name", "income"],
  marksheet: ["name", "marks"],
  caste_certificate: ["name", "category"],
  bank_passbook: ["name", "bankAccount"],
  unknown: [],
}

export const NON_DOCUMENT_PATTERNS = [
  "selfie",
  "portrait",
  "photo of",
  "my photo",
  "camera",
  "instagram",
  "screenshot",
  "meme",
  "funny",
  "animal",
  "dog",
  "cat",
  "pet",
  "nature",
  "landscape",
  "scenery",
  "sunset",
  "sunrise",
  "beach",
  "mountain",
  "food",
  "self",
  "group",
  "party",
  "event",
  "celebration",
]

export const REJECTION_REASONS: Record<string, string> = {
  selfie: "Human photo detected - not a valid document",
  person: "Human photo detected - not a valid document",
  animal: "Animal photo detected - not a valid document",
  nature: "Nature/landscape image detected - not a valid document",
  screenshot: "Screenshot detected - not a valid document",
  meme: "Meme or non-document image detected - not a valid document",
  unknown: "No supported document detected",
  blurry: "Image is too blurry to process",
  empty: "No content detected in the image",
}
