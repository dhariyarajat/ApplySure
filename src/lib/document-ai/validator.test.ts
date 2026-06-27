import { describe, it, expect } from "vitest"
import { validateExtractedData, isDataValidForSubmission, getValidationSummary } from "./validator"
import type { ExtractedData } from "./types"

function makeExtractedData(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    documentType: "aadhaar",
    name: "Ravi Kumar",
    fatherName: "Rajesh Kumar",
    dob: "15/08/1990",
    income: null,
    category: null,
    marks: null,
    bankAccount: null,
    ifsc: null,
    confidence: 90,
    rawText: "Sample text",
    extractedFields: {
      name: { value: "Ravi Kumar", confidence: 90, source: "ocr_match" },
      fatherName: { value: "Rajesh Kumar", confidence: 85, source: "ocr_match" },
      dob: { value: "15/08/1990", confidence: 88, source: "ocr_match" },
    },
    ...overrides,
  }
}

describe("validateExtractedData", () => {
  it("validates Aadhaar requires name and DOB", () => {
    const result = validateExtractedData({
      documentType: "aadhaar",
      extractedData: makeExtractedData(),
    })

    const nameValidation = result.find((v) => v.field === "name")
    const dobValidation = result.find((v) => v.field === "dob")

    expect(nameValidation?.status).toBe("present")
    expect(dobValidation?.status).toBe("present")
  })

  it("reports missing required fields", () => {
    const result = validateExtractedData({
      documentType: "aadhaar",
      extractedData: makeExtractedData({ name: null }),
    })

    const nameValidation = result.find((v) => v.field === "name")
    expect(nameValidation?.status).toBe("missing")
  })

  it("reports unclear fields when confidence is low", () => {
    const result = validateExtractedData({
      documentType: "aadhaar",
      extractedData: makeExtractedData({
        extractedFields: {
          name: { value: "Ravi Kumar", confidence: 45, source: "ocr_match" },
          fatherName: { value: "Rajesh Kumar", confidence: 85, source: "ocr_match" },
          dob: { value: "15/08/1990", confidence: 88, source: "ocr_match" },
        },
      }),
    })

    const nameValidation = result.find((v) => v.field === "name")
    expect(nameValidation?.status).toBe("unclear")
  })

  it("handles unknown document types", () => {
    const result = validateExtractedData({
      documentType: "unknown",
      extractedData: makeExtractedData({ documentType: "unknown" }),
    })

    expect(result.some((v) => v.field === "documentType")).toBe(true)
    expect(result.find((v) => v.field === "documentType")?.status).toBe("missing")
  })

  it("validates IFSC format", () => {
    const result = validateExtractedData({
      documentType: "bank_passbook",
      extractedData: makeExtractedData({
        documentType: "bank_passbook",
        bankAccount: "12345678901",
        ifsc: "INVALID",
      }),
    })

    const ifscValidation = result.find((v) => v.field === "ifsc_format")
    expect(ifscValidation?.status).toBe("unclear")
  })

  it("validates income reasonableness", () => {
    const result = validateExtractedData({
      documentType: "income_certificate",
      extractedData: makeExtractedData({
        documentType: "income_certificate",
        income: "99999999",
      }),
    })

    const incomeValidation = result.find((v) => v.field === "income_high")
    expect(incomeValidation?.status).toBe("unclear")
  })
})

describe("isDataValidForSubmission", () => {
  it("returns true when all required fields present", () => {
    const validations = [
      { field: "name", status: "present" as const, expected: true },
      { field: "dob", status: "present" as const, expected: true },
    ]
    expect(isDataValidForSubmission(validations)).toBe(true)
  })

  it("returns false when required fields missing", () => {
    const validations = [
      { field: "name", status: "missing" as const, expected: true },
      { field: "dob", status: "present" as const, expected: true },
    ]
    expect(isDataValidForSubmission(validations)).toBe(false)
  })

  it("allows unclear but non-missing fields", () => {
    const validations = [
      { field: "name", status: "unclear" as const, expected: true },
      { field: "dob", status: "present" as const, expected: true },
    ]
    expect(isDataValidForSubmission(validations)).toBe(true)
  })
})

describe("getValidationSummary", () => {
  it("counts validation statuses correctly", () => {
    const validations = [
      { field: "name", status: "present" as const, expected: true },
      { field: "dob", status: "present" as const, expected: true },
      { field: "income", status: "missing" as const, expected: true },
    ]

    const summary = getValidationSummary(validations)
    expect(summary.present).toBe(2)
    expect(summary.missing).toBe(1)
    expect(summary.unclear).toBe(0)
    expect(summary.total).toBe(3)
  })
})
