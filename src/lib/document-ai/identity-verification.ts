/**
 * ApplySure AI - Cross-Document Identity Verification Engine
 *
 * After all documents are processed, compare names, father names, and DOBs
 * across all uploaded documents to ensure they belong to the same person.
 *
 * SPECIAL RULES:
 * - Income Certificate may belong to parent/guardian → don't fail on name mismatch
 * - All other documents must share the same name
 * - If identity mismatch → block scholarship matching, show validation error
 */

import type {
  DocumentType,
  IdentityVerificationResult,
  IdentityDocumentResult,
  IdentityMismatch,
  VerificationStatus,
} from "./types"

export interface DocumentExtractSummary {
  documentId: string
  documentType: DocumentType
  name: string | null
  fatherName: string | null
  dob: string | null
}

const INCOME_CERTIFICATE_TYPE = "income_certificate" as DocumentType

/**
 * Commonly confused words in OCR that should be treated as equivalent.
 * e.g., "Kumar" vs "Kumari" are different names but OCR often confuses them.
 */
const NAME_SIMILARITY_MAP: Record<string, string[]> = {
  "kumar": ["kumari", "kumār", "kumaar"],
  "kumari": ["kumar", "kumār", "kmaari"],
  "prasad": ["prasad", "prasād", "prashaad"],
  "singh": ["sing", "sinh", "siṅgh"],
  "sharma": ["sharm", "śarma", "sarma"],
  "ram": ["raam", "rām"],
  "devi": ["devi", "devī", "devy"],
  "lal": ["lal", "lāl", "laal"],
  "das": ["das", "dās", "daas"],
  "gupta": ["gupta", "guptā"],
}

/**
 * Check if two word forms are similar (accounting for OCR and transliteration variations)
 */
function wordsAreSimilar(w1: string, w2: string): boolean {
  if (w1 === w2) return true
  // Check the similarity map
  const mapEntry = NAME_SIMILARITY_MAP[w1]
  if (mapEntry && mapEntry.includes(w2)) return true
  const mapEntry2 = NAME_SIMILARITY_MAP[w2]
  if (mapEntry2 && mapEntry2.includes(w1)) return true
  // Levenshtein distance for OCR typos (up to 1 character difference)
  if (Math.abs(w1.length - w2.length) <= 1) {
    let diffCount = 0
    const maxLen = Math.max(w1.length, w2.length)
    const minLen = Math.min(w1.length, w2.length)
    for (let i = 0; i < minLen; i++) {
      if (w1[i] !== w2[i]) diffCount++
      if (diffCount > 1) break
    }
    // Account for extra character
    diffCount += maxLen - minLen
    if (diffCount <= 1) return true
  }
  return false
}

/**
 * Normalize a name for comparison: lowercase, remove extra spaces, remove punctuation
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Check if two names are similar (tolerant of minor variations)
 * Uses a 3-tier check: exact match → word-by-word similarity → first-name match
 */
function namesMatch(name1: string, name2: string): boolean {
  const a = normalizeName(name1)
  const b = normalizeName(name2)

  // Tier 1: Exact match (after normalization)
  if (a === b) return true

  // Tier 2: One contains the other (e.g., "Rajat Kumar" vs "Rajat")
  if (a.includes(b) || b.includes(a)) return true

  // Tier 3: Word-by-word similarity (handles OCR variations like "Kumar" vs "Kumari")
  const aParts = a.split(/\s+/).filter(Boolean)
  const bParts = b.split(/\s+/).filter(Boolean)

  // If both have same number of words, compare each word with OCR tolerance
  if (aParts.length === bParts.length && aParts.length > 0) {
    const allMatch = aParts.every((word, i) => wordsAreSimilar(word, bParts[i]))
    if (allMatch) return true
  }

  // Tier 4: First name match (most Indian names share first name across docs)
  if (aParts.length > 0 && bParts.length > 0) {
    if (wordsAreSimilar(aParts[0], bParts[0])) return true
  }

  // Tier 5: Last name match (family name should be the same)
  const aLast = aParts[aParts.length - 1]
  const bLast = bParts[bParts.length - 1]
  if (aLast && bLast && wordsAreSimilar(aLast, bLast)) return true

  return false
}

/**
 * Parse a date string into year, month, day components for structured comparison
 */
function parseDate(dateStr: string): { year: string | null; month: string | null; day: string | null } {
  const cleaned = dateStr.replace(/[\s-]/g, "").toLowerCase()

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/.]?(\d{1,2})[\/.]?(\d{2,4})$/)
  if (dmyMatch) {
    return { day: dmyMatch[1], month: dmyMatch[2], year: dmyMatch[3].padStart(4, dmyMatch[3].length === 2 ? "20" : "") }
  }

  // Try DD Month YYYY
  const textMatch = dateStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (textMatch) {
    return { day: textMatch[1], month: textMatch[2], year: textMatch[3] }
  }

  // Try just year
  const yearMatch = dateStr.match(/(\d{4})/)
  if (yearMatch) {
    return { year: yearMatch[1], month: null, day: null }
  }

  return { year: null, month: null, day: null }
}

/**
 * Check if two date strings represent the same date (tolerant of format variations)
 */
function datesMatch(dob1: string, dob2: string): boolean {
  const a = dob1.replace(/[\s-]/g, "").toLowerCase()
  const b = dob2.replace(/[\s-]/g, "").toLowerCase()

  // Tier 1: Exact match after normalization
  if (a === b) return true

  // Tier 2: Structured comparison (year + month + day)
  const parsed1 = parseDate(dob1)
  const parsed2 = parseDate(dob2)

  // If both have full dates (year + month + day), compare all components
  if (parsed1.year && parsed2.year) {
    // Year must match
    if (parsed1.year !== parsed2.year) return false

    // If both have month and day, compare those too
    if (parsed1.month && parsed2.month && parsed1.day && parsed2.day) {
      return parsed1.month === parsed2.month && parsed1.day === parsed2.day
    }

    // Year-only match is acceptable
    return true
  }

  // Tier 3: Extract year only (most reliable fallback)
  const yearA = dob1.match(/(\d{4})/)
  const yearB = dob2.match(/(\d{4})/)
  if (yearA && yearB && yearA[1] === yearB[1]) return true

  return false
}

/**
 * Determine the primary (most common) name across documents.
 * Income certificates are excluded from the primary name vote
 * since they may belong to a parent/guardian.
 */
function determinePrimaryName(
  documents: DocumentExtractSummary[]
): string | null {
  const nameVotes = new Map<string, number>()

  for (const doc of documents) {
    // Skip income certificates for primary name determination
    if (doc.documentType === INCOME_CERTIFICATE_TYPE) continue
    if (!doc.name) continue

    const normalized = normalizeName(doc.name)
    nameVotes.set(normalized, (nameVotes.get(normalized) || 0) + 1)
  }

  if (nameVotes.size === 0) {
    // Fall back to include income certificates if nothing else has names
    for (const doc of documents) {
      if (!doc.name) continue
      const normalized = normalizeName(doc.name)
      nameVotes.set(normalized, (nameVotes.get(normalized) || 0) + 1)
    }
  }

  if (nameVotes.size === 0) return null

  // Return the most common name
  let maxVotes = 0
  let primaryName = ""
  for (const [name, votes] of nameVotes.entries()) {
    if (votes > maxVotes) {
      maxVotes = votes
      primaryName = name
    }
  }

  return primaryName
}

/**
 * Determine the primary (most common) DOB across documents.
 */
function determinePrimaryDob(documents: DocumentExtractSummary[]): string | null {
  const dobVotes = new Map<string, number>()

  for (const doc of documents) {
    if (!doc.dob) continue
    const normalized = doc.dob.replace(/[\s-]/g, "").toLowerCase()
    dobVotes.set(normalized, (dobVotes.get(normalized) || 0) + 1)
  }

  if (dobVotes.size === 0) return null

  let maxVotes = 0
  let primaryDob = ""
  for (const [dob, votes] of dobVotes.entries()) {
    if (votes > maxVotes) {
      maxVotes = votes
      primaryDob = dob
    }
  }

  return primaryDob
}

/**
 * Determine the primary (most common) fatherName across non-income documents.
 * Income certificates are excluded because they may belong to a parent/guardian.
 */
function determinePrimaryFatherName(
  documents: DocumentExtractSummary[]
): string | null {
  const nameVotes = new Map<string, number>()

  for (const doc of documents) {
    // Skip income certificates for primary fatherName determination
    if (doc.documentType === INCOME_CERTIFICATE_TYPE) continue
    if (!doc.fatherName) continue

    const normalized = normalizeName(doc.fatherName)
    nameVotes.set(normalized, (nameVotes.get(normalized) || 0) + 1)
  }

  if (nameVotes.size === 0) return null

  // Return the most common fatherName
  let maxVotes = 0
  let primaryName = ""
  for (const [name, votes] of nameVotes.entries()) {
    if (votes > maxVotes) {
      maxVotes = votes
      primaryName = name
    }
  }

  return primaryName
}

/**
 * Verify identity across all uploaded documents.
 *
 * @param documents Array of document extraction summaries (one per uploaded document)
 * @returns IdentityVerificationResult with status and detailed comparison
 */
export function verifyIdentity(
  documents: DocumentExtractSummary[]
): IdentityVerificationResult {
  // Filter to only valid documents that were successfully analyzed
  const validDocs = documents.filter((d) => d.name !== null)

  if (validDocs.length === 0) {
    return {
      status: "unsupported_document",
      primaryName: null,
      primaryDob: null,
      documents: documents.map((d) => ({
        documentId: d.documentId,
        documentType: d.documentType,
        name: d.name,
        fatherName: d.fatherName,
        dob: d.dob,
        status: "insufficient_data",
      })),
      mismatches: [],
      parentIncomeDetected: false,
      summary: "No valid data extracted from documents. Unable to verify identity.",
    }
  }

  // Determine the primary reference identity
  const primaryName = determinePrimaryName(validDocs)
  const primaryDob = determinePrimaryDob(validDocs)
  const primaryFatherName = determinePrimaryFatherName(validDocs)

  const docResults: IdentityDocumentResult[] = []
  const mismatches: IdentityMismatch[] = []
  let parentIncomeDetected = false

  for (const doc of validDocs) {
    const isIncomeCert = doc.documentType === INCOME_CERTIFICATE_TYPE

    if (!doc.name) {
      docResults.push({
        documentId: doc.documentId,
        documentType: doc.documentType,
        name: null,
        fatherName: doc.fatherName,
        dob: doc.dob,
        status: "insufficient_data",
      })
      continue
    }

    if (!primaryName) {
      docResults.push({
        documentId: doc.documentId,
        documentType: doc.documentType,
        name: doc.name,
        fatherName: doc.fatherName,
        dob: doc.dob,
        status: "insufficient_data",
      })
      continue
    }

    const nameMatches = namesMatch(doc.name, primaryName)

    // Special rule: Income Certificate can belong to parent/guardian
    if (isIncomeCert && !nameMatches) {
      parentIncomeDetected = true
      docResults.push({
        documentId: doc.documentId,
        documentType: doc.documentType,
        name: doc.name,
        fatherName: doc.fatherName,
        dob: doc.dob,
        status: "parent_income",
        mismatchReason: `Income Certificate belongs to ${doc.name} (parent/guardian). Primary applicant name is "${primaryName}".`,
      })
      continue
    }

    if (nameMatches) {
      docResults.push({
        documentId: doc.documentId,
        documentType: doc.documentType,
        name: doc.name,
        fatherName: doc.fatherName,
        dob: doc.dob,
        status: "match",
      })
    } else {
      const mismatch: IdentityMismatch = {
        documentType: doc.documentType,
        field: "name",
        expected: primaryName,
        actual: doc.name,
      }
      mismatches.push(mismatch)

      docResults.push({
        documentId: doc.documentId,
        documentType: doc.documentType,
        name: doc.name,
        fatherName: doc.fatherName,
        dob: doc.dob,
        status: "mismatch",
        mismatchReason: `"${doc.name}" does not match primary applicant name "${primaryName}"`,
      })
    }

    // ── Cross-document Father Name Comparison ────────────────
    // Only compare fatherName on non-income documents that have it
    if (!isIncomeCert && doc.fatherName && primaryFatherName) {
      const fatherNameMatches = namesMatch(doc.fatherName, primaryFatherName)
      if (!fatherNameMatches) {
        // Check if this fatherName mismatch was already reported for this document
        const alreadyReported = mismatches.some(
          (m) => m.documentType === doc.documentType && m.field === "fatherName"
        )
        if (!alreadyReported) {
          mismatches.push({
            documentType: doc.documentType,
            field: "fatherName",
            expected: primaryFatherName,
            actual: doc.fatherName,
          })
          // Update the document result status to reflect the mismatch
          const lastResult = docResults[docResults.length - 1]
          if (lastResult && lastResult.status === "match") {
            lastResult.status = "mismatch"
            lastResult.mismatchReason = `Father's Name "${doc.fatherName}" does not match primary father's name "${primaryFatherName}"`
          }
        }
      }
    }

    // ── Cross-document DOB Comparison ────────────────────────
    if (doc.dob && primaryDob) {
      const dobMatches = datesMatch(doc.dob, primaryDob)
      if (!dobMatches) {
        const alreadyReported = mismatches.some(
          (m) => m.documentType === doc.documentType && m.field === "dob"
        )
        if (!alreadyReported) {
          mismatches.push({
            documentType: doc.documentType,
            field: "dob",
            expected: primaryDob,
            actual: doc.dob,
          })
          // Update the document result status to reflect the mismatch
          const lastResult = docResults[docResults.length - 1]
          if (lastResult && lastResult.status === "match") {
            lastResult.status = "mismatch"
            lastResult.mismatchReason = `Date of Birth "${doc.dob}" does not match primary DOB "${primaryDob}"`
          }
        }
      }
    }
  }

  // Determine overall status
  const status = determineVerificationStatus(docResults, mismatches.length, parentIncomeDetected)

  // Build summary
  const summary = buildVerificationSummary(status, primaryName, mismatches, parentIncomeDetected)

  return {
    status,
    primaryName: primaryName
      ? validDocs.find((d) => {
          const normalized = normalizeName(d.name ?? "")
          return normalized === primaryName
        })?.name ?? primaryName
      : null,
    primaryDob,
    documents: docResults,
    mismatches,
    parentIncomeDetected,
    summary,
  }
}

/**
 * Determine the verification status based on document comparison results.
 */
function determineVerificationStatus(
  docResults: IdentityDocumentResult[],
  mismatchCount: number,
  parentIncomeDetected: boolean
): VerificationStatus {
  if (mismatchCount > 0) {
    return "identity_mismatch"
  }

  // If all documents match or are parent income, it's verified
  const allMatchedOrParent = docResults.every(
    (d) => d.status === "match" || d.status === "parent_income"
  )

  if (allMatchedOrParent) {
    return "verified"
  }

  // Some documents have insufficient data but no mismatches
  if (mismatchCount === 0 && docResults.some((d) => d.status === "insufficient_data")) {
    return "partially_verified"
  }

  return "verified"
}

/**
 * Build a human-readable summary of the verification result.
 */
function buildVerificationSummary(
  status: VerificationStatus,
  primaryName: string | null,
  mismatches: IdentityMismatch[],
  parentIncomeDetected: boolean
): string {
  switch (status) {
    case "verified": {
      let msg = `✅ Verified — Documents belong to ${primaryName ?? "the applicant"}.`
      if (parentIncomeDetected) {
        msg += " Parent/guardian income certificate detected."
      }
      return msg
    }
    case "partially_verified":
      return "⚠️ Partially Verified — Some documents have insufficient data for cross-verification."
    case "identity_mismatch": {
      const first = mismatches[0]
      if (first) {
        return `❌ Identity Mismatch — ${first.documentType.replace(/_/g, " ")} belongs to "${first.actual}". Expected name: "${first.expected}".`
      }
      return "❌ Identity Mismatch — Documents appear to belong to different individuals."
    }
    case "unsupported_document":
      return "❌ Unsupported Document — No valid documents were recognized."
  }
}
