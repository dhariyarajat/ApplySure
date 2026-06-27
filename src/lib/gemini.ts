/**
 * ApplySure AI - Google Gemini 2.5 Flash Vision Service
 *
 * Dedicated service using the official Google Generative AI SDK.
 * Handles document classification and structured data extraction
 * directly from uploaded images and PDFs.
 *
 * STRICT NO-HALLUCINATION POLICY:
 * - Only extracts information explicitly visible in the document
 * - Returns null for any field that is not clearly visible
 * - Never guesses, infers, or generates values
 * - Fields below 70 confidence are discarded
 */

import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai"

// ─── Constants ────────────────────────────────────────────────────

const MAX_RETRIES = 2
const INITIAL_RETRY_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 55_000 // Slightly under Vercel's 60s limit

/** Error types that should trigger a retry */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("timeout") ||
      message.includes("rate_limit") ||
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("429") ||
      message.includes("5") || // 5xx server errors
      message.includes("unavailable") ||
      message.includes("internal") ||
      message.includes("deadline") ||
      message.includes("reset") ||
      message.includes("connection") ||
      message.includes("network") ||
      message.includes("eof") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("socket") ||
      message.includes("abort")
    )
  }
  return false
}

/** Wait for a given duration (ms) */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Types ─────────────────────────────────────────────────────────

export interface GeminiClassificationResult {
  isValidDocument: boolean
  documentType: string
  confidence: number
  reason?: string
}

export interface GeminiExtractionResult {
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
  /** Raw fields returned by Gemini, keyed by the document-specific field names */
  rawFields: Record<string, unknown>
}

export interface GeminiAnalysisResult {
  classification: GeminiClassificationResult
  extraction: GeminiExtractionResult
  rawResponse: string
  processingTimeMs: number
}

// ─── Logger ────────────────────────────────────────────────────────

const logPrefix = "[Gemini Service]"

function logRequest(fileName: string, fileSize: number, mimeType: string): void {
  console.log(`${logPrefix} REQUEST: file=${fileName}, size=${fileSize}, type=${mimeType}`)
}

function logResponse(rawText: string): void {
  const preview = rawText.slice(0, 800)
  console.log(`${logPrefix} RAW RESPONSE: ${preview}`)
}

function logParsedJson(parsed: Record<string, unknown>): void {
  console.log(`${logPrefix} PARSED JSON:`, JSON.stringify(parsed, null, 2))
}

function logValidationResult(
  documentType: string,
  isValid: boolean,
  extra?: Record<string, unknown>
): void {
  console.log(`${logPrefix} VALIDATION: type=${documentType}, isValid=${isValid}`, extra ?? "")
}

function logParseError(rawText: string, error: unknown): void {
  console.error(`${logPrefix} PARSE ERROR:`, error)
  console.error(`${logPrefix} RAW RESPONSE (2000 chars):`, rawText.slice(0, 2000))
}

function logInfo(message: string): void {
  console.log(`${logPrefix} ${message}`)
}

// ─── Gemini Client ────────────────────────────────────────────────

const MODEL_NAME = "gemini-2.5-flash"

let modelInstance: GenerativeModel | null = null

function getModel(): GenerativeModel {
  if (!modelInstance) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured")
    }
    const genAI = new GoogleGenerativeAI(apiKey)
    modelInstance = genAI.getGenerativeModel({ model: MODEL_NAME })
    logInfo(`Initialized Gemini model: ${MODEL_NAME}`)
  }
  return modelInstance
}

// ─── System Prompt ────────────────────────────────────────────────
// Strict document-specific prompt — each document type returns its own schema.
// No guessing, no hallucination, no inference.

const SYSTEM_INSTRUCTION = `You are an expert government document verification officer for Indian scholarship applications.

Analyze the uploaded document image and extract information following these steps:

STEP 1 - CLASSIFY:
Identify which of these 5 supported document types the image contains:
* Aadhaar Card
* Income Certificate  
* Marksheet
* Caste Certificate
* Bank Passbook

If it is clearly none of these types, return ONLY:
{"documentType":"unknown","confidence":0}
(No additional text, no explanation.)

STEP 2 - EXTRACT:
Extract ONLY text that is clearly and unambiguously visible in the image.

HARD RULES:
- NEVER guess, hallucinate, infer, or fabricate any value
- If a field is not clearly readable → set it to null
- If overall confidence < 70 → set ALL fields to null
- Return valid JSON only — no markdown, no code fences, no explanations, no commentary
- The JSON must be parseable by JSON.parse()

STEP 3 - OUTPUT SCHEMA:
Pick EXACTLY ONE schema below based on the document type, and fill in the fields:

--- Aadhaar Card ---
{"documentType":"aadhaar","name":null,"dob":null,"gender":null,"aadhaarNumber":null,"confidence":0}

--- Income Certificate ---
{"documentType":"income_certificate","name":null,"fatherName":null,"annualIncome":null,"certificateDate":null,"confidence":0}

--- Marksheet ---
{"documentType":"marksheet","studentName":null,"fatherName":null,"rollNumber":null,"board":null,"year":null,"percentage":null,"marksObtained":null,"maximumMarks":null,"confidence":0}

--- Caste Certificate ---
{"documentType":"caste_certificate","name":null,"fatherName":null,"casteCategory":null,"certificateNumber":null,"issuingAuthority":null,"confidence":0}

--- Bank Passbook ---
{"documentType":"bank_passbook","accountHolderName":null,"accountNumber":null,"ifscCode":null,"bankName":null,"branch":null,"confidence":0}

CONFIDENCE SCORING:
- 95-100: All text clearly visible and readable
- 70-94: Mostly readable with minor issues
- Below 70: Unreliable — set all extracted fields to null

REMEMBER: Return ONLY a single JSON object, nothing else.`

// ─── Main Analysis Function ───────────────────────────────────────

export async function analyzeDocument(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<GeminiAnalysisResult> {
  const startTime = Date.now()
  const fileSize = fileBuffer.length

  // ── Log: Uploaded file type ───────────────────────────────────
  logRequest(fileName, fileSize, mimeType)
  logInfo(`Payload: bufferSize=${fileSize}, mimeType=${mimeType}`)

  try {
    const model = getModel()

    // Convert buffer to base64
    const base64Data = fileBuffer.toString("base64")

    // ── Log: Gemini request payload (metadata, not full base64) ──
    logInfo(`Gemini request: model=${MODEL_NAME}, imageBase64Length=${base64Data.length}, mimeType=${mimeType}`)

    // ── Execute with retry logic ────────────────────────────────
    const rawText = await executeWithRetry(async () => {
      // Use Promise.race to implement timeout without relying on SDK signal support
      // Use a token to prevent the timeout rejection from triggering after resolution
      let settled = false

      const apiPromise = model.generateContent({
        systemInstruction: { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 16,
          maxOutputTokens: 2048,
        },
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (!settled) {
            reject(new Error(`Gemini request timed out after ${REQUEST_TIMEOUT_MS}ms`))
          }
        }, REQUEST_TIMEOUT_MS)
      })

      const result = await Promise.race([apiPromise, timeoutPromise])
      settled = true
      return result.response.text()
    })

    // ── Log: Raw Gemini response ────────────────────────────────
    logResponse(rawText)

    // Parse the JSON response
    const parsed = parseGeminiResponse(rawText)

    // ── Log: Parsed JSON ────────────────────────────────────────
    logParsedJson(parsed)

    // Validate the parsed response
    if (!parsed || typeof parsed !== "object") {
      logParseError(rawText, new Error("Response is not a valid object"))
      throw new Error("Gemini returned an invalid response format")
    }

    logInfo("Parsed response successfully")

    // Build typed results
    const classification = buildClassification(parsed)
    logInfo(`Classification: isValidDocument=${classification.isValidDocument}, type=${classification.documentType}, confidence=${classification.confidence}`)

    const extraction = buildExtraction(parsed)
    logInfo(`Extraction: confidence=${extraction.confidence}, nonNullFields=${Object.entries(extraction).filter(([k, v]) => k !== "documentType" && k !== "confidence" && k !== "rawFields" && v !== null).length}`)

    // ── Server-side Confidence Enforcement ─────────────────────
    // Even if Gemini returns fields, if overall confidence < 70, null them out.
    // This is a safety net in case Gemini ignores the prompt instructions.
    if (extraction.confidence < 70) {
      logInfo(`Confidence ${extraction.confidence} < 70 — nullifying all fields`)
      extraction.name = null
      extraction.fatherName = null
      extraction.dob = null
      extraction.income = null
      extraction.category = null
      extraction.marks = null
      extraction.bankAccount = null
      extraction.ifsc = null
    }

    // ── Validation Layer ────────────────────────────────────────
    // Rule: If marksheet and all fields are null → extraction_failed
    if (extraction.documentType === "marksheet") {
      const marksheetFields = [
        extraction.name,
        extraction.fatherName,
        extraction.marks,
      ]
      const allNull = marksheetFields.every((f) => f === null)
      if (allNull) {
        logValidationResult("marksheet", false, { reason: "extraction_failed", detail: "All marksheet fields are null" })
        return {
          classification: {
            isValidDocument: false,
            documentType: "marksheet",
            confidence: 0,
            reason: "extraction_failed",
          },
          extraction,
          rawResponse: rawText,
          processingTimeMs: Date.now() - startTime,
        }
      }
    }

    // Rule: If caste_certificate and all fields are null → extraction_failed
    if (extraction.documentType === "caste_certificate") {
      const casteFields = [
        extraction.name,
        extraction.fatherName,
        extraction.category,
      ]
      const allNull = casteFields.every((f) => f === null)
      if (allNull) {
        logValidationResult("caste_certificate", false, { reason: "extraction_failed", detail: "All caste certificate fields are null" })
        return {
          classification: {
            isValidDocument: false,
            documentType: "caste_certificate",
            confidence: 0,
            reason: "extraction_failed",
          },
          extraction,
          rawResponse: rawText,
          processingTimeMs: Date.now() - startTime,
        }
      }
    }

    // Rule: If documentType is unknown → unsupported_document
    if (extraction.documentType === "unknown") {
      logValidationResult("unknown", false, { reason: "unsupported_document" })
      return {
        classification: {
          isValidDocument: false,
          documentType: "unknown",
          confidence: 0,
          reason: "unsupported_document",
        },
        extraction,
        rawResponse: rawText,
        processingTimeMs: Date.now() - startTime,
      }
    }

    // ── Log: Validation result ──────────────────────────────────
    logValidationResult(extraction.documentType, true, {
      confidence: extraction.confidence,
    })

    return {
      classification,
      extraction,
      rawResponse: rawText,
      processingTimeMs: Date.now() - startTime,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error(`${logPrefix} ERROR: ${message}`)
    if (error instanceof Error && error.stack) {
      console.error(`${logPrefix} STACK: ${error.stack}`)
    }

    throw error
  }
}

// ─── Response Parsing ─────────────────────────────────────────────

function parseGeminiResponse(text: string): Record<string, unknown> {
  let cleaned = text.trim()

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
  cleaned = cleaned.trim()

  // Try direct JSON parse first
  try {
    return JSON.parse(cleaned)
  } catch {
    logParseError(cleaned, new Error("Direct JSON parse failed"))
  }

  // Try extracting from markdown code blocks (```json ... ```)
  try {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1].trim())
      logInfo("Parsed JSON from markdown code block")
      return parsed
    }
  } catch {
    logParseError(cleaned, new Error("Markdown code block parse failed"))
  }

  // Try finding any JSON-like object in the text
  try {
    const objectMatch = cleaned.match(/{[\s\S]*?}(?=\s*$|\s*\n|\s*,)/)
    if (objectMatch) {
      const parsed = JSON.parse(objectMatch[0])
      logInfo("Parsed JSON by extracting object from text")
      return parsed
    }
  } catch {
    logParseError(cleaned, new Error("Object extraction parse failed"))
  }

  // Last resort: try to find any valid JSON object by scanning character by character
  try {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1)
      const parsed = JSON.parse(candidate)
      logInfo("Parsed JSON via character-range extraction")
      return parsed
    }
  } catch {
    logParseError(cleaned, new Error("Character-range extraction parse failed"))
  }

  // If the text looks roughly like JSON but with trailing text, try stripping trailing content
  try {
    const trimmedToBrace = cleaned.replace(/}[^}]*$/, "}")
    const parsed = JSON.parse(trimmedToBrace)
    logInfo("Parsed JSON by stripping trailing content")
    return parsed
  } catch {
    logParseError(cleaned, new Error("Trailing content strip parse failed"))
  }

  throw new Error("Failed to parse Gemini response as JSON")
}

/**
 * Execute an async function with retry logic (exponential backoff).
 * Only retries on retryable errors (timeouts, rate limits, 5xx, network issues).
 */
async function executeWithRetry<T>(fn: () => Promise<T>, retries: number = MAX_RETRIES): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < retries && isRetryableError(error)) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
        logInfo(`Retry ${attempt + 1}/${retries} after ${delayMs}ms delay`)
        await delay(delayMs)
        continue
      }

      // Non-retryable or exhausted retries
      throw error
    }
  }

  throw lastError
}

// ─── Response Builders ────────────────────────────────────────────

/**
 * Build classification result.
 * In the new prompt, Gemini does not return "isValidDocument".
 * We infer it: if documentType is one of the 5 supported types → valid.
 * "unknown" → invalid.
 */
function buildClassification(parsed: Record<string, unknown>): GeminiClassificationResult {
  const documentType = typeof parsed.documentType === "string"
    ? parsed.documentType.toLowerCase().trim()
    : "unknown"

  const validTypes = ["aadhaar", "income_certificate", "marksheet", "caste_certificate", "bank_passbook"]

  const isValid = validTypes.includes(documentType)
  const confidence = clampNumber(parsed.confidence ?? 0, 0, 100)

  if (!isValid) {
    return {
      isValidDocument: false,
      documentType: "unknown",
      confidence: 0,
      reason: "unsupported_document",
    }
  }

  return {
    isValidDocument: true,
    documentType,
    confidence,
    reason: `document_${documentType}`,
  }
}

/**
 * Build extraction result by mapping document-type-specific fields
 * to the unified GeminiExtractionResult model.
 */
function buildExtraction(parsed: Record<string, unknown>): GeminiExtractionResult {
  const documentType = typeof parsed.documentType === "string"
    ? parsed.documentType.toLowerCase().trim()
    : "unknown"

  const validTypes = ["aadhaar", "income_certificate", "marksheet", "caste_certificate", "bank_passbook", "unknown"]
  const validType = validTypes.includes(documentType) ? documentType : "unknown"

  const confidence = clampNumber(parsed.confidence ?? 0, 0, 100)

  // Default all fields to null
  let name: string | null = null
  let fatherName: string | null = null
  let dob: string | null = null
  let income: string | null = null
  let category: string | null = null
  let marks: string | null = null
  let bankAccount: string | null = null
  let ifsc: string | null = null

  // Map document-specific fields to the unified model
  switch (validType) {
    case "aadhaar": {
      name = sanitizeString(parsed.name)
      dob = sanitizeString(parsed.dob)
      break
    }

    case "income_certificate": {
      name = sanitizeString(parsed.name)
      fatherName = sanitizeString(parsed.fatherName)
      income = sanitizeString(parsed.annualIncome)
      break
    }

    case "marksheet": {
      name = sanitizeString(parsed.studentName) ?? sanitizeString(parsed.name)
      fatherName = sanitizeString(parsed.fatherName)
      // Prefer percentage if available, else combine marksObtained/maximumMarks
      const percentage = sanitizeString(parsed.percentage)
      const marksObtained = sanitizeString(parsed.marksObtained)
      const maximumMarks = sanitizeString(parsed.maximumMarks)
      if (percentage) {
        marks = percentage
      } else if (marksObtained && maximumMarks) {
        marks = `${marksObtained}/${maximumMarks}`
      } else if (marksObtained) {
        marks = marksObtained
      }
      break
    }

    case "caste_certificate": {
      name = sanitizeString(parsed.name)
      fatherName = sanitizeString(parsed.fatherName)
      category = sanitizeString(parsed.casteCategory) ?? sanitizeString(parsed.category)
      break
    }

    case "bank_passbook": {
      name = sanitizeString(parsed.accountHolderName) ?? sanitizeString(parsed.name)
      bankAccount = sanitizeString(parsed.accountNumber)
      ifsc = sanitizeString(parsed.ifscCode)
      break
    }
  }

  // Store all raw fields for reference
  const rawFields: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (key !== "documentType" && key !== "confidence") {
      rawFields[key] = value
    }
  }

  return {
    documentType: validType,
    name,
    fatherName,
    dob,
    income,
    category,
    marks,
    bankAccount,
    ifsc,
    confidence,
    rawFields,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function sanitizeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim()
    const lower = trimmed.toLowerCase()
    // Reject obviously fake or placeholder values
    if (
      lower === "null" ||
      lower === "none" ||
      lower === "n/a" ||
      lower === "na" ||
      lower === "-" ||
      lower === "--" ||
      lower === "..." ||
      lower === "not available" ||
      lower === "not provided" ||
      lower === "unknown" ||
      lower === "test" ||
      lower === "sample" ||
      (lower === "true" || lower === "false") ||
      (/^\d+$/.test(lower) && lower.length < 3) // single/two digit numbers are not names
    ) {
      return null
    }
    return trimmed
  }
  return null
}

function clampNumber(value: unknown, min: number, max: number): number {
  if (typeof value === "number" && !isNaN(value)) {
    return Math.min(Math.max(Math.round(value), min), max)
  }
  return 0
}

// ─── Health Check ─────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY
}
