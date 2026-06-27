/**
 * ApplySure AI - Document Analysis Orchestrator
 *
 * Orchestrates document analysis by calling the Gemini Vision API route.
 * All classification and extraction is done by Google Gemini 2.5 Flash
 * via the official @google/generative-ai SDK.
 *
 * No regex guessing, no mock data, no hardcoded values.
 * Only information explicitly visible in the document is extracted.
 *
 * Flow: Client → analyzeDocument() → /api/analyze-document → Gemini SDK → Structured JSON
 */

import type { DocumentAnalysisResult, DocumentType, ExtractedData, ExtractedField } from "./types"
import { DOCUMENT_LABELS } from "./types"
import { validateExtractedData, isDataValidForSubmission, getValidationSummary } from "./validator"

export type { DocumentAnalysisResult, DocumentType }
export { isDataValidForSubmission, getValidationSummary }
export { validateExtractedData } from "./validator"

// Legacy re-exports (retained for test compatibility)
export { classifyDocument } from "./classifier"
export { extractDocumentData } from "./extractor"

// ─── Gemini API Response Types ────────────────────────────────────

interface GeminiApiClassification {
  isValidDocument: boolean
  documentType: string
  confidence: number
}

interface GeminiApiExtraction {
  documentType: string
  name: string | null
  fatherName: string | null
  dob: string | null
  income: string | null
  category: string | null
  marks: string | null
  bankAccount: string | null
  ifsc: string | null
  confidence: number
}

interface GeminiApiResponse {
  success: boolean
  data: {
    classification: GeminiApiClassification
    extraction: GeminiApiExtraction
    processingTimeMs: number
  }
  error?: string
}

// ─── API Client ───────────────────────────────────────────────────

async function callAnalyzeApi(imageFile: File): Promise<GeminiApiResponse> {
  const formData = new FormData()
  formData.append("image", imageFile)

  const response = await fetch("/api/analyze-document", {
    method: "POST",
    body: formData,
  })

  const json: GeminiApiResponse = await response.json()

  if (!response.ok || !json.success) {
    throw new Error(json.error || `Analysis API returned ${response.status}`)
  }

  return json
}

function buildExtractedFields(extraction: GeminiApiExtraction): Record<string, ExtractedField> {
  const fields: Record<string, ExtractedField> = {}
  const fieldKeys: (keyof GeminiApiExtraction)[] = [
    "name", "fatherName", "dob", "income", "category", "marks", "bankAccount", "ifsc",
  ]

  for (const key of fieldKeys) {
    const value = extraction[key]
    fields[key] = {
      value: typeof value === "string" ? value : null,
      confidence: typeof value === "string" && value.length > 0 ? extraction.confidence : 0,
      source: typeof value === "string" && value.length > 0 ? "gemini_extraction" : "not_found",
    }
  }

  return fields
}

// ─── Main Orchestrator ────────────────────────────────────────────

export async function analyzeDocument(
  imageFile: File,
  onProgress?: (progress: { stage: string; progress: number; message: string }) => void
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf)$/i
    if (!allowedExtensions.test(imageFile.name)) {
      return {
        classification: {
          isValidDocument: false,
          documentType: "unknown",
          reason: "Unsupported file format. Accepted: JPG, JPEG, PNG, PDF",
          confidence: 0,
        },
        extraction: null,
        validations: [],
        overallConfidence: 0,
        processingTimeMs: Date.now() - startTime,
        errors: ["Unsupported file format"],
      }
    }

    if (imageFile.size > 20 * 1024 * 1024) {
      return {
        classification: {
          isValidDocument: false,
          documentType: "unknown",
          reason: "File too large. Maximum size is 20MB",
          confidence: 0,
        },
        extraction: null,
        validations: [],
        overallConfidence: 0,
        processingTimeMs: Date.now() - startTime,
        errors: ["File exceeds 20MB limit"],
      }
    }

    // Stage 1: Send to Gemini for classification + extraction
    onProgress?.({ stage: "classifying", progress: 10, message: "Sending document to Gemini Vision AI..." })

    const apiResult = await callAnalyzeApi(imageFile)
    const { classification: geminiClassification, extraction: geminiExtraction } = apiResult.data

    // Build classification result
    const classification = {
      isValidDocument: geminiClassification.isValidDocument,
      documentType: geminiClassification.isValidDocument
        ? (geminiClassification.documentType as DocumentType)
        : "unknown",
      reason: geminiClassification.isValidDocument
        ? `${DOCUMENT_LABELS[geminiClassification.documentType as DocumentType] ?? geminiClassification.documentType} detected successfully`
        : "Unsupported document",
      confidence: geminiClassification.isValidDocument ? geminiClassification.confidence : 0,
    }

    if (!classification.isValidDocument) {
      return {
        classification,
        extraction: null,
        validations: [{
          field: "documentType",
          status: "missing",
          expected: true,
          message: classification.reason,
        }],
        overallConfidence: 0,
        processingTimeMs: Date.now() - startTime,
        errors: [classification.reason],
      }
    }

    // Stage 2: Build extracted data directly from Gemini response
    onProgress?.({
      stage: "extracting",
      progress: 50,
      message: `Extracting data from ${classification.documentType}...`,
    })

    const extraction: ExtractedData = {
      documentType: classification.documentType,
      name: geminiExtraction.name ?? null,
      fatherName: geminiExtraction.fatherName ?? null,
      dob: geminiExtraction.dob ?? null,
      income: geminiExtraction.income ?? null,
      category: geminiExtraction.category ?? null,
      marks: geminiExtraction.marks ?? null,
      bankAccount: geminiExtraction.bankAccount ?? null,
      ifsc: geminiExtraction.ifsc ?? null,
      confidence: geminiExtraction.confidence,
      rawText: "", // Gemini handles OCR internally; raw text is not exposed
      extractedFields: buildExtractedFields(geminiExtraction),
    }

    // Stage 3: Validate extracted data
    onProgress?.({ stage: "validating", progress: 70, message: "Validating extracted data..." })
    const validations = validateExtractedData({
      documentType: classification.documentType,
      extractedData: extraction,
    })

    // Stage 4: Use Gemini's confidence as overall score
    onProgress?.({ stage: "scoring", progress: 85, message: "Calculating confidence scores..." })
    const overallConfidence = geminiExtraction.confidence

    onProgress?.({ stage: "complete", progress: 100, message: "Analysis complete!" })

    return {
      classification,
      extraction,
      validations,
      overallConfidence,
      processingTimeMs: Date.now() - startTime,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error during document analysis"
    errors.push(errorMessage)
    console.error("[analyzeDocument] Error:", errorMessage)

    return {
      classification: {
        isValidDocument: false,
        documentType: "unknown",
        reason: "Processing error occurred",
        confidence: 0,
      },
      extraction: null,
      validations: [],
      overallConfidence: 0,
      processingTimeMs: Date.now() - startTime,
      errors: [errorMessage],
    }
  }
}
