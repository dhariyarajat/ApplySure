import { describe, it, expect } from "vitest"
import { extractDocumentData } from "./extractor"

describe("extractDocumentData", () => {
  describe("Aadhaar extraction", () => {
    it("extracts name and DOB from Aadhaar text", () => {
      const result = extractDocumentData({
        rawText: `Government of India
Aadhaar Card
Name: Ravi Kumar
Date of Birth: 15/08/1990
Male
1234 5678 9012`,
        ocrConfidence: 92,
        documentType: "aadhaar",
        imageQuality: "clear",
      })

      expect(result.name).toBe("Ravi Kumar")
      expect(result.dob).toBe("15/08/1990")
      expect(result.documentType).toBe("aadhaar")
      expect(result.confidence).toBeGreaterThanOrEqual(70)
    })

    it("returns null for missing fields", () => {
      const result = extractDocumentData({
        rawText: "Some unclear text without name or dob",
        ocrConfidence: 30,
        documentType: "aadhaar",
        imageQuality: "blurry",
      })

      expect(result.name).toBeNull()
      expect(result.dob).toBeNull()
    })

    it("extracts Hindi name", () => {
      const result = extractDocumentData({
        rawText: `आधार
नाम: सुरेश कुमार
पिता: राम प्रसाद
जन्म तिथि: १५ अगस्त १९९०`,
        ocrConfidence: 80,
        documentType: "aadhaar",
        imageQuality: "clear",
      })

      expect(result.name).toBe("सुरेश कुमार")
    })
  })

  describe("Income Certificate extraction", () => {
    it("extracts income value", () => {
      const result = extractDocumentData({
        rawText: `Income Certificate
Name: Sunita Devi
Annual Income: Rs. 2,50,000
Father's Name: Rajesh Singh`,
        ocrConfidence: 85,
        documentType: "income_certificate",
        imageQuality: "clear",
      })

      expect(result.name).toBe("Sunita Devi")
      expect(result.income).toBe("250000")
      expect(result.fatherName).toBe("Rajesh Singh")
    })
  })

  describe("Marksheet extraction", () => {
    it("extracts marks as percentage", () => {
      const result = extractDocumentData({
        rawText: `Marksheet
Name: Amit Singh
Roll No: 123456
Percentage: 90%
Total Marks: 450`,
        ocrConfidence: 90,
        documentType: "marksheet",
        imageQuality: "clear",
      })

      expect(result.name).toBe("Amit Singh")
      expect(result.marks).toBe("90")
    })

    it("extracts marks in format X/Y", () => {
      const result = extractDocumentData({
        rawText: `Marksheet
Name: Priya Sharma
Marks Obtained: 450/500`,
        ocrConfidence: 88,
        documentType: "marksheet",
        imageQuality: "clear",
      })

      expect(result.name).toBe("Priya Sharma")
      expect(result.marks).toBe("450/500")
    })
  })

  describe("Caste Certificate extraction", () => {
    it("extracts category", () => {
      const result = extractDocumentData({
        rawText: `Caste Certificate
Name: Rajesh Kumar
Category: SC
Father's Name: Ram Singh`,
        ocrConfidence: 85,
        documentType: "caste_certificate",
        imageQuality: "clear",
      })

      expect(result.name).toBe("Rajesh Kumar")
      expect(result.category).toBe("SC")
    })
  })

  describe("Bank Passbook extraction", () => {
    it("extracts bank account and IFSC", () => {
      const result = extractDocumentData({
        rawText: `State Bank of India
Passbook
Account No: 12345678901
IFSC: SBIN0001234
Name: Meena Sharma`,
        ocrConfidence: 88,
        documentType: "bank_passbook",
        imageQuality: "clear",
      })

      expect(result.name).toBe("Meena Sharma")
      expect(result.bankAccount).toBe("12345678901")
      expect(result.ifsc).toBe("SBIN0001234")
    })
  })

  describe("strict rules enforcement", () => {
    it("returns null for unknown document types", () => {
      const result = extractDocumentData({
        rawText: "Some random text",
        ocrConfidence: 50,
        documentType: "unknown",
        imageQuality: "blurry",
      })

      expect(result.name).toBeNull()
      expect(result.confidence).toBe(0)
    })

    it("nullifies low confidence fields (< 70)", () => {
      const result = extractDocumentData({
        rawText: "Name: John", // too short, low confidence
        ocrConfidence: 30,
        documentType: "aadhaar",
        imageQuality: "unreadable",
      })

      // Low OCR confidence means low field confidence -> should be null
      expect(Object.values(result.extractedFields).some((f) => f.value !== null)).toBe(false)
    })
  })
})
