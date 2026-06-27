/**
 * API Route: /api/analyze-document
 *
 * Accepts uploaded documents, sends to Google Gemini 2.5 Flash Vision
 * via the official SDK, and returns structured classification + extraction results.
 *
 * Flow: User Upload → API Route → Gemini SDK → Structured JSON → Client
 *
 * Supported inputs: JPG, JPEG, PNG, PDF
 */

import { NextRequest, NextResponse } from "next/server"
import { analyzeDocument, isConfigured } from "@/lib/gemini"

const logPrefix = "[API /analyze-document]"

export const maxDuration = 60 // 60 seconds for large PDFs

/**
 * POST /api/analyze-document
 * Accepts FormData with an "image" field containing the uploaded file.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log(`${logPrefix} POST request received`)

  try {
    // Check if Gemini is configured
    if (!isConfigured()) {
      console.error(`${logPrefix} GEMINI_API_KEY not configured`)
      return NextResponse.json(
        {
          success: false,
          error: "Gemini API key not configured",
          hint: "Set GEMINI_API_KEY in your .env.local file. Get a key at https://aistudio.google.com/app/apikey",
        },
        { status: 503 }
      )
    }

    // Parse the uploaded file
    const formData = await request.formData()
    const file = formData.get("image") as File | null

    if (!file) {
      console.error(`${logPrefix} No file provided in request`)
      return NextResponse.json(
        { success: false, error: "No image file provided" },
        { status: 400 }
      )
    }

    console.log(`${logPrefix} File received: name=${file.name}, size=${file.size}, type=${file.type}`)

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error(`${logPrefix} File too large: ${file.size}`)
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    const allowedExtensions = /\.(jpg|jpeg|png|webp|pdf)$/i
    const hasValidMime = allowedMimeTypes.includes(file.type)
    const hasValidExt = allowedExtensions.test(file.name)

    if (!hasValidMime && !hasValidExt) {
      console.error(`${logPrefix} Unsupported file type: ${file.type}, extension: ${file.name.split(".").pop()}`)
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Accepted: JPG, JPEG, PNG, PDF",
        },
        { status: 400 }
      )
    }

    // Determine mime type for Gemini
    // PDF files sometimes have empty file.type in browsers - detect by extension
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf"
    const mimeType = isPdf ? "application/pdf" : (file.type || "image/jpeg")

    console.log(`${logPrefix} Sending to Gemini: mimeType=${mimeType}, fileSize=${file.size}`)

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // ── Log: Request payload detail ────────────────────────────────
    console.log(`${logPrefix} REQUEST PAYLOAD: fileName=${file.name}, fileSize=${file.size}, mimeType=${mimeType}, bufferSize=${buffer.length}`)

    // Call Gemini service
    const geminiResult = await analyzeDocument(buffer, mimeType, file.name)

    const totalTime = Date.now() - startTime
    console.log(`${logPrefix} Analysis complete: processingTime=${totalTime}ms`)
    console.log(`${logPrefix} Classification: isValid=${geminiResult.classification.isValidDocument}, type=${geminiResult.classification.documentType}, confidence=${geminiResult.classification.confidence}, reason=${geminiResult.classification.reason ?? "none"}`)
    console.log(`${logPrefix} Extraction: confidence=${geminiResult.extraction.confidence}, rawFields=${Object.keys(geminiResult.extraction.rawFields ?? {}).join(",")}`)

    // ── Log: Validation result (from Gemini service) ───────────────
    if (!geminiResult.classification.isValidDocument) {
      console.log(`${logPrefix} VALIDATION: Document rejected — type=${geminiResult.classification.documentType}, reason=${geminiResult.classification.reason ?? "unsupported"}`)
    } else {
      const nonNullFields = Object.entries(geminiResult.extraction).filter(
        ([k, v]) => k !== "documentType" && k !== "confidence" && k !== "rawFields" && v !== null
      ).map(([k]) => k)
      console.log(`${logPrefix} VALIDATION: Document accepted — confidence=${geminiResult.extraction.confidence}, extractedFields=[${nonNullFields.join(",")}]`)
    }

    // Return structured response
    return NextResponse.json({
      success: true,
      data: {
        classification: geminiResult.classification,
        extraction: geminiResult.extraction,
        processingTimeMs: totalTime,
      },
      processingTimeMs: totalTime,
      provider: "gemini-2.5-flash",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const stack = error instanceof Error ? error.stack : ""

    console.error(`${logPrefix} ERROR: ${message}`)
    if (stack) console.error(`${logPrefix} STACK: ${stack}`)

    const totalTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: message,
        processingTimeMs: totalTime,
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/analyze-document
 * Health check to verify the API is configured and functional.
 */
export async function OPTIONS() {
  const configured = isConfigured()
  console.log(`${logPrefix} OPTIONS check: configured=${configured}`)

  if (!configured) {
    return NextResponse.json(
      {
        available: false,
        configured: false,
        error: "GEMINI_API_KEY not set",
        hint: "Set GEMINI_API_KEY in your .env.local file",
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    available: true,
    configured: true,
    provider: "gemini-2.5-flash",
  })
}
