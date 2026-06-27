/**
 * ApplySure AI - Validation Service
 *
 * STEP 4: After extraction, validate that required fields are present.
 *
 * STRICT RULES:
 * - Each document type has required fields (e.g., Aadhaar needs name + DOB)
 * - If required fields are missing, report them
 * - Validate data formats
 * - Check for data consistency
 */

import type { DocumentType, ValidationResult, ExtractedData } from "./types"
import { DOCUMENT_REQUIRED_FIELDS } from "./types"

export interface ValidationInput {
  documentType: DocumentType
  extractedData: ExtractedData
}

export function validateExtractedData(input: ValidationInput): ValidationResult[] {
  const { documentType, extractedData } = input
  const results: ValidationResult[] = []

  if (documentType === "unknown") {
    results.push({
      field: "documentType",
      status: "missing",
      expected: true,
      message: "Document type could not be identified",
    })
    return results
  }

  // Check required fields for this document type
  const requiredFields = DOCUMENT_REQUIRED_FIELDS[documentType] ?? []

  for (const field of requiredFields) {
    const value = (extractedData as Record<string, unknown>)[field]
    const extractedField = extractedData.extractedFields[field]

    if (!value || value === null) {
      results.push({
        field,
        status: "missing",
        expected: true,
        message: getMissingFieldMessage(field, documentType),
      })
    } else if (extractedField && extractedField.confidence < 70) {
      results.push({
        field,
        status: "unclear",
        expected: true,
        message: `${getFieldLabel(field)} detected but with low confidence (${extractedField.confidence}%)`,
      })
    } else {
      results.push({
        field,
        status: "present",
        expected: true,
        message: `${getFieldLabel(field)} extracted successfully`,
      })
    }
  }

  // Additional format validations
  results.push(...validateFieldFormats(extractedData, documentType))

  // Data consistency checks
  results.push(...checkDataConsistency(extractedData, documentType))

  return results
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: "Full Name",
    fatherName: "Father's Name",
    dob: "Date of Birth",
    income: "Annual Income",
    category: "Category/Caste",
    marks: "Marks/Percentage",
    bankAccount: "Bank Account Number",
    ifsc: "IFSC Code",
  }
  return labels[field] ?? field
}

function getMissingFieldMessage(field: string, documentType: DocumentType): string {
  const docLabel = documentType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const fieldLabel = getFieldLabel(field)
  return `${fieldLabel} is required for ${docLabel} but was not found in the document`
}

function validateFieldFormats(data: ExtractedData, documentType: DocumentType): ValidationResult[] {
  const results: ValidationResult[] = []

  // Validate DOB format if present
  if (data.dob) {
    const dateRegex = /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$|^\d{2}\s+[A-Za-z]+\s+\d{4}$|^\d{4}$/
    if (!dateRegex.test(data.dob.trim())) {
      results.push({
        field: "dob_format",
        status: "unclear",
        expected: true,
        message: "Date of Birth format is not standard - please verify manually",
      })
    }
  }

  // Validate IFSC format if present
  if (data.ifsc) {
    const ifscClean = data.ifsc.toUpperCase().replace(/\s/g, "")
    if (!/^[A-Z]{4}[0][A-Z0-9]{6}$/.test(ifscClean)) {
      results.push({
        field: "ifsc_format",
        status: "unclear",
        expected: true,
        message: "IFSC code format appears incorrect",
      })
    }
  }

  // Validate bank account if present
  if (data.bankAccount) {
    const cleaned = data.bankAccount.replace(/[\s-]/g, "")
    if (!/^\d{9,18}$/.test(cleaned)) {
      results.push({
        field: "bankAccount_format",
        status: "unclear",
        expected: true,
        message: "Bank account number length seems unusual",
      })
    }
  }

  // Validate income if present
  if (data.income) {
    const cleaned = data.income.replace(/,/g, "")
    const incomeNum = parseInt(cleaned, 10)
    if (isNaN(incomeNum) || incomeNum <= 0) {
      results.push({
        field: "income_format",
        status: "unclear",
        expected: true,
        message: "Income value format is unclear",
      })
    } else if (incomeNum > 10000000) {
      // Income > 1 crore might be suspicious for scholarship
      results.push({
        field: "income_high",
        status: "unclear",
        expected: true,
        message: "Reported income is unusually high for a scholarship application",
      })
    }
  }

  // Validate marks if present
  if (data.marks) {
    const percentageMatch = data.marks.match(/(\d{1,3}(?:\.\d{1,2})?)/)
    if (percentageMatch) {
      const marksNum = parseFloat(percentageMatch[1])
      if (marksNum > 100) {
        // Could be like 450/500 format
        const ratioMatch = data.marks.match(/(\d+)\s*\/\s*(\d+)/)
        if (ratioMatch) {
          const obtained = parseInt(ratioMatch[1], 10)
          const total = parseInt(ratioMatch[2], 10)
          if (total > 0 && obtained > total) {
            results.push({
              field: "marks_exceed_total",
              status: "unclear",
              expected: true,
              message: "Obtained marks exceed total marks - possible error",
            })
          }
        }
      }
    }
  }

  return results
}

function checkDataConsistency(data: ExtractedData, documentType: DocumentType): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check if fatherName exists when it's needed for the document
  if (data.name && data.fatherName) {
    // Ensure they're not identical
    if (data.name.toLowerCase() === data.fatherName.toLowerCase()) {
      results.push({
        field: "name_consistency",
        status: "unclear",
        expected: true,
        message: "Name and Father's Name appear identical - please verify",
      })
    }
  }

  // Document-specific consistency checks
  if (documentType === "income_certificate" && data.income && data.name) {
    // Basic check: income certificate should have income
    results.push({
      field: "income_present",
      status: data.income ? "present" : "missing",
      expected: true,
      message: data.income
        ? `Income of ₹${parseInt(data.income.replace(/,/g, "")).toLocaleString("en-IN")} recorded`
        : "Income value is missing",
    })
  }

  // Bank passbook should have account number
  if (documentType === "bank_passbook") {
    if (!data.bankAccount) {
      results.push({
        field: "bankAccount_required",
        status: "missing",
        expected: true,
        message: "Bank account number is required for bank passbook verification",
      })
    }
    if (!data.ifsc) {
      results.push({
        field: "ifsc_optional",
        status: "missing",
        expected: false,
        message: "IFSC code not detected - this is optional but recommended",
      })
    }
  }

  return results
}

export function isDataValidForSubmission(validations: ValidationResult[]): boolean {
  const requiredMissing = validations.filter(
    (v) => v.status === "missing" && v.expected
  )
  // Allow some unclear fields but not missing required ones
  return requiredMissing.length === 0
}

export function getValidationSummary(validations: ValidationResult[]): {
  present: number
  missing: number
  unclear: number
  total: number
} {
  return {
    present: validations.filter((v) => v.status === "present").length,
    missing: validations.filter((v) => v.status === "missing").length,
    unclear: validations.filter((v) => v.status === "unclear").length,
    total: validations.length,
  }
}
