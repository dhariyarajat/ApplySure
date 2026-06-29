"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Trash2, RefreshCw, Scan, Shield, Brain, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScholarshipPackage, type DocumentItem, type DocumentStatus } from "@/components/scholarship-package"
import { DocumentClassificationResult } from "@/components/document-classification-result"
import { ImagePreview } from "@/components/image-preview"
import { ConfidenceBreakdown } from "@/components/confidence-breakdown"
import { analyzeDocument, type DocumentAnalysisResult } from "@/lib/document-ai"

const REQUIRED_DOCUMENTS: { id: string; label: string; description: string; icon: string }[] = [
  { id: "aadhaar", label: "Aadhaar Card", description: "Government-issued identity proof", icon: "🪪" },
  { id: "income", label: "Income Certificate", description: "Annual family income proof", icon: "💰" },
  { id: "marksheet", label: "Marksheet", description: "Academic performance records", icon: "📄" },
  { id: "caste", label: "Caste Certificate", description: "Community/category certificate", icon: "📋" },
  { id: "bank", label: "Bank Passbook", description: "Bank account details for disbursement", icon: "🏦" },
]

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  documentId: string
  uploadedAt: Date
  file: File
}

interface DocumentAnalysis {
  fileId: string
  documentId: string
  result: DocumentAnalysisResult
  analyzedAt: Date
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

type DocState = "idle" | "uploading" | "analyzing" | "success" | "rejected"

export default function UploadPage() {
  const router = useRouter()
  const [path, setPath] = useState<"choosing" | "upload">("choosing")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [documentAnalyses, setDocumentAnalyses] = useState<Record<string, DocumentAnalysis>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [docStates, setDocStates] = useState<Record<string, DocState>>({})
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({})
  const analyzingRef = useRef<Record<string, boolean>>({})

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const getDocumentStatus = useCallback((docId: string): DocumentStatus => {
    const analysis = documentAnalyses[docId]
    if (analysis?.result.classification.isValidDocument) return "uploaded"
    if (uploadedFiles.some((f) => f.documentId === docId)) return "uploaded"
    return "missing"
  }, [uploadedFiles, documentAnalyses])

  const documents: DocumentItem[] = REQUIRED_DOCUMENTS.map((doc) => ({
    ...doc,
    status: getDocumentStatus(doc.id),
  }))

  const setDocState = (docId: string, state: DocState) => {
    setDocStates((prev) => ({ ...prev, [docId]: state }))
    analyzingRef.current[docId] = state === "analyzing"
  }

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".webp"]
    if (!allowed.includes(ext)) {
      return "Invalid file type. Accepted: PDF, JPG, PNG, WebP"
    }
    if (file.size > 10 * 1024 * 1024) {
      return "File too large. Maximum size is 10MB"
    }
    return null
  }

  const handleFileSelected = useCallback(async (docId: string, file: File) => {
    // Prevent double-upload while analyzing (using ref to avoid stale closure)
    if (analyzingRef.current[docId]) return

    const validationError = validateFile(file)
    if (validationError) {
      setFileErrors((prev) => ({ ...prev, [docId]: validationError }))
      setTimeout(() => setFileErrors((prev) => {
        const next = { ...prev }
        delete next[docId]
        return next
      }), 4000)
      return
    }
    setFileErrors((prev) => {
      const next = { ...prev }
      delete next[docId]
      return next
    })

    const newFile: UploadedFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      documentId: docId,
      uploadedAt: new Date(),
      file,
    }

    // Remove old file for same doc
    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.documentId !== docId)
      return [...filtered, newFile]
    })

    // Start analysis
    setDocState(docId, "analyzing")
    try {
      const result = await analyzeDocument(file)
      setDocumentAnalyses((prev) => ({
        ...prev,
        [docId]: {
          fileId: newFile.id,
          documentId: docId,
          result,
          analyzedAt: new Date(),
        },
      }))
      // Show rate-limit errors with a friendly message instead of "rejected"
      if (!result.classification.isValidDocument && result.errors.length > 0) {
        const errMsg = result.errors[0].toLowerCase()
        if (errMsg.includes("busy") || errMsg.includes("rate limit") || errMsg.includes("429") || errMsg.includes("too many requests")) {
          setFileErrors((prev) => ({ ...prev, [docId]: "Our AI service is temporarily busy. Please wait 30 seconds and try again." }))
          setTimeout(() => setFileErrors((prev) => {
            const next = { ...prev }
            delete next[docId]
            return next
          }), 8000)
          setDocState(docId, "idle")
          return
        }
      }
      setDocState(docId, result.classification.isValidDocument ? "success" : "rejected")
    } catch (error) {
      console.error("Document analysis failed:", error)
      const errMsg = error instanceof Error ? error.message.toLowerCase() : ""
      if (errMsg.includes("busy") || errMsg.includes("rate limit") || errMsg.includes("429") || errMsg.includes("too many requests")) {
        setFileErrors((prev) => ({ ...prev, [docId]: "Our AI service is temporarily busy. Please wait 30 seconds and try again." }))
        setTimeout(() => setFileErrors((prev) => {
          const next = { ...prev }
          delete next[docId]
          return next
        }), 8000)
      } else {
        setFileErrors((prev) => ({ ...prev, [docId]: "Analysis failed. Please try again." }))
        setTimeout(() => setFileErrors((prev) => {
          const next = { ...prev }
          delete next[docId]
          return next
        }), 4000)
      }
      setDocState(docId, "idle")
    }
  }, [])

  const handleRemoveFile = useCallback((docId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.documentId !== docId))
    setDocumentAnalyses((prev) => {
      const next = { ...prev }
      delete next[docId]
      return next
    })
    setDocState(docId, "idle")
    // Reset file input safely
    const input = fileInputRefs.current[docId]
    if (input) input.value = ""
  }, [])

  const triggerFileInput = (docId: string) => {
    fileInputRefs.current[docId]?.click()
  }

  const getFileForDocument = useCallback((docId: string) => {
    return uploadedFiles.find((f) => f.documentId === docId)
  }, [uploadedFiles])

  const getAnalysisForDocument = useCallback((docId: string) => {
    return documentAnalyses[docId] ?? null
  }, [documentAnalyses])

  const allUploaded = uploadedFiles.length === REQUIRED_DOCUMENTS.length
  const allValidated = Object.values(documentAnalyses).every(
    (a) => a.result.classification.isValidDocument
  )

  const uploadedCount = uploadedFiles.length
  const totalCount = REQUIRED_DOCUMENTS.length

  const canProcess = allUploaded && allValidated

  const handleProcess = () => {
    if (!canProcess) return
    setIsProcessing(true)
    const data = JSON.stringify(Object.values(documentAnalyses))
    localStorage.setItem("applysure_analyses", data)
    sessionStorage.setItem("applysure_analyses", data)
    setTimeout(() => {
      router.push("/processing")
    }, 500)
  }

  // Show two-option selection when no path chosen
  if (path === "choosing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
              <Upload className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight sm:text-5xl">
              Start Your{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Scholarship Application
              </span>
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto">
              Choose how you'd like to get started. Upload your documents for AI-powered extraction, or enter your details manually.
            </p>
          </div>

          {/* Two Option Cards */}
          <div className="grid gap-4 sm:gap-8 md:grid-cols-2">
            {/* Card 1: Upload Documents */}
            <div
              className="group relative rounded-2xl border-2 border-violet-200/50 bg-card p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 cursor-pointer animate-slide-up"
              onClick={() => {
                // Clear old data when starting a new upload flow
                localStorage.removeItem("applysure_analyses")
                localStorage.removeItem("manual_results")
                localStorage.removeItem("manual_profile")
                sessionStorage.removeItem("applysure_analyses")
                sessionStorage.removeItem("manual_results")
                sessionStorage.removeItem("manual_profile")
                setPath("upload")
              }}
              style={{ animationDelay: "0.1s" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-inner group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Upload Documents</h2>
              <p className="text-sm sm:text-base text-card-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                Upload Aadhaar, Income Certificate, Marksheet and other documents. AI will automatically extract your information and match you with eligible scholarships.
              </p>
              <ul className="space-y-2 mb-6 text-sm text-card-foreground/80">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  AI-powered document verification
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  Automatic data extraction
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  Smart scholarship matching
                </li>
              </ul>
              <div className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 sm:px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all group-hover:shadow-xl group-hover:shadow-violet-500/30 group-hover:scale-105 w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </div>
            </div>

            {/* Card 2: Fill Details Manually */}
            <div
              className="group relative rounded-2xl border-2 border-indigo-200/50 bg-card p-6 sm:p-8 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 cursor-pointer animate-slide-up"
              onClick={() => {
                // Clear old data when starting a new manual entry
                localStorage.removeItem("applysure_analyses")
                localStorage.removeItem("manual_results")
                localStorage.removeItem("manual_profile")
                sessionStorage.removeItem("applysure_analyses")
                sessionStorage.removeItem("manual_results")
                sessionStorage.removeItem("manual_profile")
                router.push("/manual-entry")
              }}
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 shadow-inner group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">Fill Details Manually</h2>
              <p className="text-sm sm:text-base text-card-foreground/80 mb-4 sm:mb-6 leading-relaxed">
                Don&apos;t want to upload documents? Enter your academic and personal details manually and get matched with relevant scholarships instantly.
              </p>
              <ul className="space-y-2 mb-6 text-sm text-card-foreground/80">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Quick form-based entry
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  No documents required
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Instant eligibility check
                </li>
              </ul>
              <div className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 sm:px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/30 group-hover:scale-105 w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" />
                Enter Details
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-8 sm:mt-12 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        {/* Back to options */}
        <div className="mb-3 sm:mb-4">
          <button
            onClick={() => setPath("choosing")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to options
          </button>
        </div>

        {/* Page Header */}
        <div className="mb-5 sm:mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25 shrink-0">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload Documents</h1>
              <p className="text-sm sm:text-base text-foreground/70 mt-0.5 sm:mt-1">
                Upload all required documents to build your scholarship package
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Upload Area - each doc has its own section */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Progress Summary Banner */}
            <Card className="animate-slide-up bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-violet-200/50 dark:border-violet-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
                      <Scan className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        Upload Progress
                      </p>
                      <p className="text-xs text-card-foreground/70">
                        {uploadedCount === 0
                          ? "No documents uploaded yet"
                          : uploadedCount === totalCount
                          ? allValidated
                            ? "All documents uploaded & verified!"
                            : "All documents uploaded - some need review"
                          : `${uploadedCount} of ${totalCount} documents uploaded`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-violet-600 tabular-nums">
                      {Math.round((uploadedCount / totalCount) * 100)}%
                    </div>
                    <div className="text-[10px] text-card-foreground/70">complete</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Document Sections */}
            {REQUIRED_DOCUMENTS.map((doc, index) => {
              const file = getFileForDocument(doc.id)
              const analysis = getAnalysisForDocument(doc.id)
              const state = docStates[doc.id] ?? "idle"
              const isValid = analysis?.result.classification.isValidDocument

              return (
                <div
                  key={doc.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      state === "success" && "border-emerald-200 dark:border-emerald-800 shadow-md shadow-emerald-500/5",
                      state === "rejected" && "border-red-200 dark:border-red-800",
                      state === "analyzing" && "border-violet-200 dark:border-violet-800"
                    )}
                  >
                    {/* Card Header with status */}
                    <CardHeader className={cn(
                      "pb-4 border-b",
                      state === "success" && "bg-emerald-50/50 dark:bg-emerald-950/20",
                      state === "rejected" && "bg-red-50/50 dark:bg-red-950/20",
                      state === "analyzing" && "bg-violet-50/50 dark:bg-violet-950/20"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl text-xl",
                            state === "success" && "bg-emerald-100 dark:bg-emerald-900/40",
                            state === "rejected" && "bg-red-100 dark:bg-red-900/40",
                            state === "analyzing" && "bg-violet-100 dark:bg-violet-900/40",
                            state === "idle" && "bg-muted"
                          )}>
                            {state === "success" ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            ) : state === "rejected" ? (
                              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            ) : state === "analyzing" ? (
                              <Loader2 className="h-6 w-6 text-violet-600 dark:text-violet-400 animate-spin" />
                            ) : (
                              <span>{doc.icon}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{doc.label}</CardTitle>
                              {state === "success" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verified ({analysis!.result.overallConfidence}%)
                                </span>
                              )}
                              {state === "rejected" && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                                  Rejected
                                </span>
                              )}
                              {state === "analyzing" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  AI Analyzing...
                                </span>
                              )}
                            </div>
                            <CardDescription>{doc.description}</CardDescription>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2">
                          {file && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveFile(doc.id)}
                              title="Remove file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4">
                      {/* Hidden file input */}
                      <input
                        ref={(el) => { fileInputRefs.current[doc.id] = el }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileSelected(doc.id, f)
                          if (e.target) e.target.value = ""
                        }}
                      />

                      {/* File validation error */}
                      {fileErrors[doc.id] && (
                        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2 text-xs text-red-600 dark:text-red-400 animate-slide-up">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {fileErrors[doc.id]}
                        </div>
                      )}

                      {/* State: No file uploaded - show upload area */}
                      {state === "idle" && !file && (                          <div
                            onClick={() => triggerFileInput(doc.id)}
                            className="group cursor-pointer rounded-xl border-2 border-dashed border-muted-foreground/25 p-4 sm:p-8 text-center transition-all duration-300 hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/20"
                          >
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted transition-all duration-300 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40">
                            <Upload className="h-7 w-7 text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
                          </div>
                          <p className="font-medium text-sm mb-1">Upload {doc.label}</p>
                          <p className="text-xs text-foreground/60 mb-3">
                            Drag & drop or click to browse
                          </p>
                          <div className="inline-flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
                            <Shield className="h-3 w-3" />
                            PDF, JPG, PNG up to 10MB
                          </div>
                          <p className="mt-3 text-[10px] text-foreground/50 flex items-center justify-center gap-1">
                            <Brain className="h-3 w-3" />
                            AI will classify & verify automatically
                          </p>
                        </div>
                      )}

                      {/* State: Uploading/Analyzing */}
                      {state === "analyzing" && (
                        <div className="flex flex-col items-center justify-center py-6 gap-3">
                          <div className="relative">
                            <div className="absolute inset-0 animate-pulse rounded-full bg-violet-200 dark:bg-violet-800" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30">
                              <Scan className="h-6 w-6 text-violet-600 dark:text-violet-400 animate-pulse" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium">AI is analyzing your document...</p>
                            <p className="text-xs text-foreground/60 mt-0.5">
                              Running OCR, classification, and extraction
                            </p>
                          </div>
                          {file && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span>{file.name}</span>
                              <span>({formatFileSize(file.size)})</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* State: File uploaded - show preview + results */}
                      {file && state !== "analyzing" && (
                        <div className="space-y-4">
                          {/* Image Preview */}
                          <ImagePreview
                            file={file.file}
                            analysisResult={analysis?.result ?? null}
                            onRemove={() => handleRemoveFile(doc.id)}
                          />

                          {/* Analysis Results */}
                          {analysis && (
                            <div className="space-y-4">
                              {/* Classification Result */}
                              <DocumentClassificationResult
                                result={analysis.result}
                                isLoading={false}
                              />

                              {/* Confidence Breakdown (only for valid docs) */}
                              {isValid && (
                                <ConfidenceBreakdown result={analysis.result} />
                              )}

                              {/* Replace button */}
                              <div className="flex justify-center pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => triggerFileInput(doc.id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Replace with another file
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>

          {/* Sidebar - Scholarship Package */}
          <div className="space-y-4 sm:space-y-6">
            <div className="lg:sticky lg:top-24 space-y-4 sm:space-y-6">
              {/* Package Progress */}
              <ScholarshipPackage documents={documents} />

              {/* AI Verification Summary */}
              {Object.keys(documentAnalyses).length > 0 && (
                <Card className="animate-slide-up">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-violet-500" />
                      AI Verification Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(documentAnalyses).map(([docId, analysis]) => {
                        const doc = REQUIRED_DOCUMENTS.find((d) => d.id === docId)
                        return (
                          <div
                            key={docId}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
                              analysis.result.classification.isValidDocument
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                                : "bg-red-50/50 dark:bg-red-950/20"
                            )}
                          >
                            {analysis.result.classification.isValidDocument ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                            )}
                            <span className="flex-1 truncate">{doc?.label}</span>
                            <span
                              className={cn(
                                "font-medium",
                                analysis.result.classification.isValidDocument
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              )}
                            >
                              {analysis.result.overallConfidence}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Button */}
              <div className="space-y-3 sm:space-y-4">
                {allUploaded && !allValidated && (
                  <div className="rounded-lg border bg-red-50/50 dark:bg-red-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          Some documents failed verification
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Replace the rejected documents with valid copies
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {canProcess ? (
                  <>
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all duration-300 text-base gap-2"
                      onClick={handleProcess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Scan className="h-5 w-5" />
                          Process All with AI
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-foreground/60">
                      All documents verified. Proceed to detailed analysis.
                    </p>
                  </>
                ) : uploadedCount > 0 ? (
                  <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          AI is analyzing documents...
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {totalCount - uploadedCount} more to upload
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {totalCount - uploadedCount} document{totalCount - uploadedCount > 1 ? "s" : ""} remaining
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Upload all required documents to enable AI processing
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tips */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-violet-500" />
                      Tips for best results
                    </h4>
                    <ul className="space-y-1 text-[11px] text-muted-foreground">
                      <li className="flex items-start gap-1.5">
                        <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                        Use well-lit, clear images
                      </li>
                      <li className="flex items-start gap-1.5">
                        <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                        Ensure all text is readable
                      </li>
                      <li className="flex items-start gap-1.5">
                        <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                        Avoid folded or creased documents
                      </li>
                      <li className="flex items-start gap-1.5">
                        <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                        PDF scans work best for OCR
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
