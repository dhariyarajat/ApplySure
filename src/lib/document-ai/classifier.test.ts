import { describe, it, expect } from "vitest"
import { classifyDocument } from "./classifier"

describe("classifyDocument", () => {
  describe("non-document rejection", () => {
    it("rejects selfie images", () => {
      const result = classifyDocument({
        rawText: "My selfie portrait taken today",
        ocrConfidence: 30,
        fileName: "selfie.jpg",
      })
      expect(result.isValidDocument).toBe(false)
      expect(result.documentType).toBe("unknown")
    })

    it("rejects animal photos", () => {
      const result = classifyDocument({
        rawText: "My cute dog playing in the park",
        ocrConfidence: 20,
        fileName: "dog.jpg",
      })
      expect(result.isValidDocument).toBe(false)
      expect(result.reason).toContain("Animal")
    })

    it("rejects nature images", () => {
      const result = classifyDocument({
        rawText: "Beautiful sunset at the beach nature landscape",
        ocrConfidence: 25,
        fileName: "sunset.jpg",
      })
      expect(result.isValidDocument).toBe(false)
    })

    it("rejects screenshots", () => {
      const result = classifyDocument({
        rawText: "Screenshot of my conversation",
        ocrConfidence: 85,
        fileName: "screenshot.png",
      })
      expect(result.isValidDocument).toBe(false)
    })

    it("rejects meme images", () => {
      const result = classifyDocument({
        rawText: "Funny meme share this with friends",
        ocrConfidence: 30,
        fileName: "meme.jpg",
      })
      expect(result.isValidDocument).toBe(false)
    })

    it("rejects empty content", () => {
      const result = classifyDocument({
        rawText: "",
        ocrConfidence: 0,
      })
      expect(result.isValidDocument).toBe(false)
      expect(result.reason).toContain("No content")
    })
  })

  describe("Aadhaar detection", () => {
    it("detects Aadhaar card from text patterns", () => {
      const result = classifyDocument({
        rawText: `Government of India
Unique Identification Authority of India
Aadhaar Card
Name: Ravi Kumar
1234 5678 9012
Male
Year of Birth: 1990`,
        ocrConfidence: 92,
      })
      expect(result.isValidDocument).toBe(true)
      expect(result.documentType).toBe("aadhaar")
    })

    it("detects Aadhaar with Hindi text", () => {
      const result = classifyDocument({
        rawText: `भारत सरकार
आधार
Name: Priya Sharma
2345 6789 0123`,
        ocrConfidence: 88,
      })
      expect(result.isValidDocument).toBe(true)
      expect(result.documentType).toBe("aadhaar")
    })

    it("returns higher confidence for more pattern matches", () => {
      const low = classifyDocument({
        rawText: "Some text with aadhaar mentioned",
        ocrConfidence: 50,
      })
      const high = classifyDocument({
        rawText: `Government of India
UIDAI
Aadhaar Card
Name: Test User
1234 5678 9012
Male
Year of Birth: 1995
Enrollment Number: 1234/56789`,
        ocrConfidence: 95,
      })
      expect(high.confidence).toBeGreaterThanOrEqual(low.confidence)
    })
  })

  describe("Income Certificate detection", () => {
    it("detects income certificate from text patterns", () => {
      const result = classifyDocument({
        rawText: `Income Certificate
Government of India
Annual Income: Rs. 2,50,000
Name: Sunita Devi
Tehsil: Office of Tahsildar`,
        ocrConfidence: 85,
      })
      expect(result.isValidDocument).toBe(true)
      expect(result.documentType).toBe("income_certificate")
    })
  })

  describe("Marksheet detection", () => {
    it("detects marksheet from text patterns", () => {
      const result = classifyDocument({
        rawText: `Board of Secondary Education
Marksheet
Roll No: 123456
Name: Amit Singh
Total Marks: 450/500
Percentage: 90%`,
        ocrConfidence: 90,
      })
      expect(result.isValidDocument).toBe(true)
      expect(result.documentType).toBe("marksheet")
    })
  })

  describe("Caste Certificate detection", () => {
    it("detects caste certificate from text patterns", () => {
      const result = classifyDocument({
        rawText: `Caste Certificate
Government of India
Category: Scheduled Caste (SC)
Name: Rajesh Kumar
Community Certificate`,
        ocrConfidence: 85,
      })
      expect(result.isValidDocument).toBe(true)
      expect(result.documentType).toBe("caste_certificate")
    })
  })

  describe("Bank Passbook detection", () => {
    it("detects bank passbook from text patterns", () => {
      const result = classifyDocument({
        rawText: `State Bank of India
Passbook
Account No: 12345678901
IFSC: SBIN0001234
Branch: Main Branch
Name: Meena Sharma`,
        ocrConfidence: 88,
      })
      expect(result.isValidDocument).toBe(true)
      expect(result.documentType).toBe("bank_passbook")
    })
  })

  describe("determinism", () => {
    it("produces deterministic results (no randomness)", () => {
      const input = {
        rawText: `Government of India
Aadhaar Card
Name: Test User
1234 5678 9012`,
        ocrConfidence: 90,
      }

      const result1 = classifyDocument(input)
      const result2 = classifyDocument(input)
      expect(result1.confidence).toBe(result2.confidence)
      expect(result1.documentType).toBe(result2.documentType)
    })
  })
})
