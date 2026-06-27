/**
 * ApplySure AI - Document Extraction Service
 *
 * STEP 3: Strict field extraction from recognized documents.
 *
 * STRICT RULES:
 * 1. Never infer values
 * 2. Never estimate values
 * 3. Never create values
 * 4. Never complete missing text
 * 5. Never use placeholders
 * 6. If field not visible → null
 * 7. If text unclear → null
 * 8. If confidence below 70 → field should be null
 */

import type { DocumentType, ExtractedData, ExtractedField } from "./types"
import { calculateFieldConfidence, shouldAcceptField } from "./confidence"

export interface ExtractionInput {
  rawText: string
  ocrConfidence: number
  documentType: DocumentType
  imageQuality: "clear" | "partial" | "blurry" | "unreadable"
}

// Whitespace helper: horizontal whitespace only (no newlines)
const H = "[\\t ]"

// Pattern definitions for each document type
// IMPORTANT: Use H for horizontal whitespace to prevent matching across newlines
const FIELD_PATTERNS: Record<string, RegExp[]> = {
  name: [
    new RegExp(`name${H}*[:.\\-]${H}*([^\\n,]+)`, "i"),
    new RegExp(`नाम${H}*[:.\\-]${H}*([^\\n,]+)`),
    new RegExp(`student${H}+name${H}*[:.\\-]${H}*([^\\n,]+)`, "i"),
    new RegExp(`applicant${H}+name${H}*[:.\\-]${H}*([^\\n,]+)`, "i"),
    new RegExp(`candidate${H}+name${H}*[:.\\-]${H}*([^\\n,]+)`, "i"),
  ],
  fatherName: [
    new RegExp(`father(?:'s?${H}+name)?${H}*[:.\\-]${H}*([^\\n,]+)`, "i"),
    new RegExp(`पिता${H}*[:.\\-]${H}*([^\\n,]+)`),
    new RegExp(`(?:s/o|d/o)${H}*[:.\\-]${H}*([A-Za-z]+(?:${H}+[A-Za-z]+)*)`, "i"),
  ],
  dob: [
    new RegExp(`(?:date${H}+of${H}+birth|dob|birth${H}+date)${H}*[:.\\-]${H}*(\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})`, "i"),
    new RegExp(`(?:date${H}+of${H}+birth|dob|birth${H}+date)${H}*[:.\\-]${H}*(\\d{2}${H}*[A-Za-z]+${H}*\\d{4})`, "i"),
    new RegExp(`जन्म${H}*(?:तिथि|दिनांक)${H}*[:.\\-]${H}*([^\\n,]+)`),
    new RegExp(`yob${H}*[:.\\-]${H}*(\\d{4})`, "i"),
    new RegExp(`year${H}+of${H}+birth${H}*[:.\\-]${H}*(\\d{4})`, "i"),
    new RegExp(`birth${H}*[:.\\-]${H}*(\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})`, "i"),
    /(\d{2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4})/i,
  ],
  income: [
    new RegExp(`(?:annual|yearly|family|total)?${H}*income${H}*[:.\\-]${H}*(?:Rs\\.?|₹|INR)?${H}*([\\d,]+)`, "i"),
    new RegExp(`(?:annual|yearly|family|total)?${H}*income${H}*[:.\\-]${H}*([\\d,]+)`, "i"),
    new RegExp(`आय${H}*[:.\\-]${H}*(?:Rs\\.?|₹)?${H}*([\\d,]+)`),
    new RegExp(`राशि${H}*[:.\\-]${H}*(?:Rs\\.?|₹)?${H}*([\\d,]+)`),
    new RegExp(`([\\d,]+)${H}*(?:per${H}+annum|\\/yr|\\/year|annually)`, "i"),
  ],
  category: [
    new RegExp(`(?:caste|category|community)${H}*[:.\\-]${H}*([A-Za-z]+(?:${H}*[A-Za-z]+)*)`, "i"),
    new RegExp(`जाति${H}*[:.\\-]${H}*([^\\n,]+)`),
    new RegExp(`वर्ग${H}*[:.\\-]${H}*([^\\n,]+)`),
    /(?:sc|st|obc|general|ews|nt|vj|dt|open)\b/i,
    /scheduled\s*(?:caste|tribe)/i,
    /other\s*backward\s*(?:class|caste)/i,
  ],
  marks: [
    // X/Y format: captures "450/500" as single group
    new RegExp(`(?:marks|percentage)${H}*(?:obtained|secured|scored)?${H}*[:.\\-]${H}*(\\d{1,3}(?:\\.\\d{1,2})?${H}*\\/${H}*\\d{1,3})`, "i"),
    // Percentage with %
    new RegExp(`(?:marks|percentage)${H}*(?:obtained|secured|scored)?${H}*[:.\\-]${H}*(\\d{1,3}(?:\\.\\d{1,2})?)${H}*%`, "i"),
    // Total marks
    new RegExp(`total${H}*(?:marks|percentage)${H}*[:.\\-]${H}*(\\d{1,3}(?:\\.\\d{1,2})?)`, "i"),
    // Just percentage
    new RegExp(`percentage${H}*[:.\\-]${H}*(\\d{1,3}(?:\\.\\d{1,2})?)`, "i"),
    // Grade
    new RegExp(`grade${H}*[:.\\-]${H}*([A-E][+-]?)`, "i"),
    // CGPA
    new RegExp(`cgpa${H}*[:.\\-]${H}*(\\d{1}\\.\\d{1,2})`, "i"),
    // Hindi marks
    new RegExp(`अंक${H}*[:.\\-]${H}*(\\d{1,3}(?:\\.\\d{1,2})?)`),
    new RegExp(`प्राप्तांक${H}*[:.\\-]${H}*(\\d{1,3}(?:\\.\\d{1,2})?)`),
    // Percentage after number
    new RegExp(`(\\d{1,3}(?:\\.\\d{1,2})?)${H}*%${H}*(?:marks|obtained)`, "i"),
  ],
  bankAccount: [
    new RegExp(`(?:account|a/c|bank${H}+account)${H}*(?:no|number|#)?${H}*[:.\\-]${H}*(\\d{9,18})`, "i"),
    new RegExp(`(?:account|a/c|bank${H}+account)${H}*(?:no|number|#)?${H}*[:.\\-]${H}*([\\d${H}-]{9,18})`, "i"),
    new RegExp(`खाता${H}*(?:संख्या|नंबर)${H}*[:.\\-]${H}*([\\d${H}-]+)`),
    /(\d{9,18})\s*(?:\n|$)/,
  ],
  ifsc: [
    new RegExp(`ifsc${H}*(?:code|no|number|#)?${H}*[:.\\-]${H}*([A-Z]{4}[0][A-Z0-9]{6})`, "i"),
    new RegExp(`ifsc${H}*(?:code|no|number|#)?${H}*[:.\\-]${H}*([A-Za-z]{4}\\d{7})`, "i"),
    /([A-Z]{4}[0][A-Z0-9]{6})/,
    /([A-Za-z]{4}\d{7})/,
  ],
}

function extractField(rawText: string, fieldName: string, ocrConfidence: number): ExtractedField {
  const patterns = FIELD_PATTERNS[fieldName]
  if (!patterns) {
    return { value: null, confidence: 0, source: "no_patterns" }
  }

  for (const pattern of patterns) {
    const match = pattern.exec(rawText)
    if (match) {
      const matchedValue = match[1]?.trim()
      if (matchedValue && matchedValue.length > 0) {
        // Calculate match quality based on pattern specificity
        const patternMatchScore = Math.min(100, Math.round((pattern.source.length / 25) * 100))
        const fieldConfidence = calculateFieldConfidence(ocrConfidence, matchedValue.length, true, patternMatchScore)

        // STRICT: Don't accept if confidence is below 70
        if (!shouldAcceptField(fieldConfidence)) {
          return { value: null, confidence: fieldConfidence, source: "low_confidence" }
        }

        // Additional validation for specific field types
        const validated = validateFieldValue(fieldName, matchedValue)
        if (!validated.isValid) {
          return { value: null, confidence: fieldConfidence, source: `validation_failed: ${validated.reason}` }
        }

        return { value: validated.value, confidence: fieldConfidence, source: "ocr_match" }
      }
    }
  }

  return { value: null, confidence: 0, source: "not_found" }
}

interface FieldValidationResult {
  isValid: boolean
  value: string | null
  reason?: string
}

function validateFieldValue(fieldName: string, value: string): FieldValidationResult {
  switch (fieldName) {
    case "dob": {
      const datePatterns = [
        /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/,
        /^\d{2}\s+[A-Za-z]+\s+\d{4}$/,
        /^\d{4}$/,
      ]
      const isValid = datePatterns.some((p) => p.test(value.trim()))
      if (!isValid) return { isValid: false, value: null, reason: "invalid_date_format" }
      return { isValid: true, value: value.trim() }
    }

    case "income": {
      const cleaned = value.replace(/,/g, "")
      const num = parseInt(cleaned, 10)
      if (isNaN(num) || num <= 0) return { isValid: false, value: null, reason: "invalid_income_value" }
      return { isValid: true, value: cleaned }
    }

    case "marks": {
      const trimmed = value.trim()

      // Check if it's X/Y format (e.g., "450/500")
      const ratioMatch = trimmed.match(/^(\d{1,3}(?:\.\d{1,2})?)\s*\/\s*(\d{1,3})$/)
      if (ratioMatch) {
        const obtained = parseFloat(ratioMatch[1])
        const total = parseFloat(ratioMatch[2])
        if (!isNaN(obtained) && !isNaN(total) && total > 0) {
          return { isValid: true, value: trimmed }
        }
        return { isValid: false, value: null, reason: "invalid_marks_ratio" }
      }

      // Check if it's a percentage number
      const cleaned = trimmed.replace(/%/g, "").trim()
      const num = parseFloat(cleaned)
      if (!isNaN(num) && num >= 0 && num <= 100) {
        return { isValid: true, value: cleaned }
      }

      return { isValid: false, value: null, reason: "invalid_marks_value" }
    }

    case "ifsc": {
      const ifscClean = value.toUpperCase().replace(/\s/g, "")
      if (!/^[A-Z]{4}[0][A-Z0-9]{6}$/.test(ifscClean)) {
        return { isValid: false, value: null, reason: "invalid_ifsc_format" }
      }
      return { isValid: true, value: ifscClean }
    }

    case "bankAccount": {
      const cleaned = value.replace(/[\s-]/g, "")
      if (!/^\d{9,18}$/.test(cleaned)) {
        return { isValid: false, value: null, reason: "invalid_account_number" }
      }
      return { isValid: true, value: cleaned }
    }

    case "category": {
      const validCategories = ["sc", "st", "obc", "general", "ews", "nt", "vj", "dt", "open"]
      const lower = value.toLowerCase().trim()
      const knownMatch = validCategories.find((c) => lower === c || lower.startsWith(c))
      if (knownMatch) return { isValid: true, value: knownMatch.toUpperCase() }
      if (value.length > 50) return { isValid: false, value: null, reason: "category_too_long" }
      return { isValid: true, value: value.trim() }
    }

    default:
      if (value.length < 2 || value.length > 100) {
        return { isValid: false, value: null, reason: "invalid_length" }
      }
      return { isValid: true, value: value.trim() }
  }
}

export function extractDocumentData(input: ExtractionInput): ExtractedData {
  const { rawText, ocrConfidence, documentType } = input

  if (documentType === "unknown") {
    return {
      documentType: "unknown",
      name: null,
      fatherName: null,
      dob: null,
      income: null,
      category: null,
      marks: null,
      bankAccount: null,
      ifsc: null,
      confidence: 0,
      rawText,
      extractedFields: {},
    }
  }

  const fieldsToExtract = getFieldsForDocumentType(documentType)
  const extractedFields: Record<string, ExtractedField> = {}
  const fieldConfidences: Record<string, number> = {}

  for (const field of fieldsToExtract) {
    const result = extractField(rawText, field, ocrConfidence)
    extractedFields[field] = result
    fieldConfidences[field] = result.confidence
  }

  const data: ExtractedData = {
    documentType,
    name: extractedFields["name"]?.value ?? null,
    fatherName: extractedFields["fatherName"]?.value ?? null,
    dob: extractedFields["dob"]?.value ?? null,
    income: extractedFields["income"]?.value ?? null,
    category: extractedFields["category"]?.value ?? null,
    marks: extractedFields["marks"]?.value ?? null,
    bankAccount: extractedFields["bankAccount"]?.value ?? null,
    ifsc: extractedFields["ifsc"]?.value ?? null,
    confidence: Math.round(
      Object.values(fieldConfidences).reduce((a, b) => a + b, 0) /
        Math.max(Object.values(fieldConfidences).filter((c) => c > 0).length, 1)
    ),
    rawText,
    extractedFields,
  }

  // Apply strict rules: nullify low confidence fields
  for (const key of ["name", "fatherName", "dob", "income", "category", "marks", "bankAccount", "ifsc"] as const) {
    const field = extractedFields[key]
    if (field && !shouldAcceptField(field.confidence)) {
      ;(data as Record<string, unknown>)[key] = null
    }
  }

  return data
}

function getFieldsForDocumentType(type: DocumentType): string[] {
  switch (type) {
    case "aadhaar":
      return ["name", "fatherName", "dob"]
    case "income_certificate":
      return ["name", "fatherName", "income"]
    case "marksheet":
      return ["name", "fatherName", "marks", "dob"]
    case "caste_certificate":
      return ["name", "fatherName", "category"]
    case "bank_passbook":
      return ["name", "bankAccount", "ifsc"]
    default:
      return []
  }
}
