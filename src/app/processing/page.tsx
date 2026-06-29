"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Brain, Scan, FileText, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Shield, Zap, Loader2, XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DocumentAnalysisResult } from "@/lib/document-ai"
import { DOCUMENT_LABELS } from "@/lib/document-ai/types"

interface StoredAnalysis {
  fileId: string
  documentId: string
  result: DocumentAnalysisResult
  analyzedAt: string
}

interface ProcessingStep {
  id: string
  label: string
  description: string
  status: "pending" | "processing" | "complete" | "error"
  icon: typeof Brain
}

const PROCESSING_STEPS: ProcessingStep[] = [
  {
    id: "scan",
    label: "Scanning Documents",
    description: "Reading document contents and structure",
    status: "pending",
    icon: Scan,
  },
  {
    id: "verify",
    label: "Verifying Authenticity",
    description: "Checking document validity and classification",
    status: "pending",
    icon: Shield,
  },
  {
    id: "extract",
    label: "Extracting Information",
    description: "Extracting key details from each document",
    status: "pending",
    icon: FileText,
  },
  {
    id: "analyze",
    label: "AI Analysis",
    description: "Running validation and confidence scoring",
    status: "pending",
    icon: Brain,
  },
  {
    id: "generate",
    label: "Generating Report",
    description: "Building your comprehensive verification report",
    status: "pending",
    icon: Sparkles,
  },
]

export default function ProcessingPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([])
  const [steps, setSteps] = useState<ProcessingStep[]>(PROCESSING_STEPS)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [hasErrors, setHasErrors] = useState(false)
  const [particles, setParticles] = useState<Array<{ left: string; top: string; duration: string; delay: string }>>([])
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Load analysis results from localStorage (persists across refreshes)
    const stored = localStorage.getItem("applysure_analyses") || sessionStorage.getItem("applysure_analyses")
    if (stored) {
      try {
        const parsed: StoredAnalysis[] = JSON.parse(stored)
        setAnalyses(parsed)
        const hasAnyErrors = parsed.some((a) => !a.result.classification.isValidDocument)
        setHasErrors(hasAnyErrors)
      } catch {
        // If no stored data, proceed with empty analyses
      }
    }
  }, [])

  useEffect(() => {
    if (isComplete) return
    if (analyses.length === 0) return

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= PROCESSING_STEPS.length - 1) {
          clearInterval(stepTimer)
          return prev
        }
        return prev + 1
      })
    }, 1500)

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer)
          clearInterval(stepTimer)
          completionTimeoutRef.current = setTimeout(() => {
            setIsComplete(true)
            setShowParticles(true)
            // Generate stable particle positions after mount to avoid hydration mismatch
            setParticles(
              Array.from({ length: 30 }).map(() => ({
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                duration: `${2 + Math.random() * 3}s`,
                delay: `${Math.random() * 2}s`,
              }))
            )
          }, 500)
          return 100
        }
        return prev + 5
      })
    }, 150)

    return () => {
      clearInterval(stepTimer)
      clearInterval(progressTimer)
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
      }
    }
  }, [isComplete, analyses.length])

  useEffect(() => {
    setSteps((prev) =>
      prev.map((step, index) => {
        if (isComplete) {
          return { ...step, status: "complete" as const }
        }
        if (index < currentStep) {
          return { ...step, status: "complete" as const }
        }
        if (index === currentStep) {
          return { ...step, status: "processing" as const }
        }
        return { ...step, status: "pending" as const }
      })
    )
  }, [currentStep, isComplete])

  const averageConfidence = analyses.length > 0
    ? Math.round(analyses.reduce((acc, a) => acc + a.result.overallConfidence, 0) / analyses.length)
    : 0

  const verifiedCount = analyses.filter((a) => a.result.classification.isValidDocument).length
  const totalIssues = analyses.reduce((acc, a) => {
    return acc + a.result.validations.filter((v) => v.status !== "present").length
  }, 0)

  const totalProcessingTime = analyses.reduce((acc, a) => acc + a.result.processingTimeMs, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      {/* Success Particles */}
      {showParticles && !hasErrors && particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {particles.map((p, i) => (
            <div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{
                left: p.left,
                top: p.top,
                animation: `float ${p.duration} ease-in-out infinite`,
                animationDelay: p.delay,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10 animate-fade-in">
          <div
            className={cn(
              "inline-flex rounded-2xl bg-gradient-to-br p-3 sm:p-4 shadow-xl mb-4 sm:mb-6",
              isComplete && !hasErrors
                ? "from-emerald-600 to-teal-600 shadow-emerald-500/25"
                : isComplete && hasErrors
                ? "from-amber-500 to-orange-500 shadow-amber-500/25"
                : "from-violet-600 to-indigo-600 shadow-violet-500/25"
            )}
          >
            {isComplete && !hasErrors ? (
              <CheckCircle2 className="h-10 w-10 text-white" />
            ) : isComplete && hasErrors ? (
              <AlertCircle className="h-10 w-10 text-white" />
            ) : (
              <Brain className="h-10 w-10 text-white animate-pulse" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {isComplete && !hasErrors
              ? "Processing Complete!"
              : isComplete && hasErrors
              ? "Processing Completed with Issues"
              : "AI Processing Your Documents"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            {isComplete
              ? hasErrors
                ? "Some documents require attention. Review the issues below."
                : "All documents have been verified and analyzed successfully."
              : `Analyzing ${analyses.length} documents using AI verification pipeline.`}
          </p>
        </div>

        {/* Progress Card */}
        <Card className="animate-slide-up shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Processing Progress</CardTitle>
              {!isComplete && (
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              )}
            </div>
            <CardDescription>
              Analyzing {analyses.length} document{analyses.length !== 1 ? "s" : ""} for completeness and validity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    isComplete && !hasErrors && "text-emerald-600 dark:text-emerald-400",
                    isComplete && hasErrors && "text-amber-600 dark:text-amber-400",
                    !isComplete && "text-violet-600 dark:text-violet-400"
                  )}
                >
                  {progress}%
                </span>
              </div>
              <Progress
                value={progress}
                className={cn(
                  "h-3",
                  isComplete && !hasErrors && "[&>div]:bg-emerald-500",
                  isComplete && hasErrors && "[&>div]:bg-amber-500"
                )}
              />
            </div>

            {/* Processing Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border p-4 transition-all duration-500",
                    step.status === "complete" &&
                      "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
                    step.status === "processing" &&
                      "border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20 ring-2 ring-violet-500/20",
                    step.status === "pending" && "opacity-50",
                    "animate-slide-up"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-500",
                      step.status === "complete" && "bg-emerald-100 dark:bg-emerald-900/40",
                      step.status === "processing" && "bg-violet-100 dark:bg-violet-900/40",
                      step.status === "pending" && "bg-muted"
                    )}
                  >
                    {step.status === "complete" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : step.status === "processing" ? (
                      <Loader2 className="h-5 w-5 text-violet-600 dark:text-violet-400 animate-spin" />
                    ) : (
                      <step.icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-medium text-sm",
                          step.status === "processing" && "text-violet-700 dark:text-violet-300",
                          step.status === "complete" && "text-emerald-700 dark:text-emerald-300"
                        )}
                      >
                        {step.label}
                      </span>
                      {step.status === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-400">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          In Progress
                        </span>
                      )}
                      {step.status === "complete" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>

                  {step.status === "complete" && (
                    <div className="shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results Summary */}
        {isComplete && analyses.length > 0 && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 animate-slide-up">
            {/* Results Summary */}
            <Card
              className={cn(
                hasErrors
                  ? "border-amber-200 dark:border-amber-800"
                  : "border-emerald-200 dark:border-emerald-800"
              )}
            >
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Analysis Results</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      AI verification results for {analyses.length} document{analyses.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">                      <div className="text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-bold text-violet-600 dark:text-violet-400">{averageConfidence}%</div>
                      <div className="text-[10px] sm:text-xs text-foreground/60">avg. confidence</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 mb-4 sm:mb-6">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{verifiedCount}</div>
                    <div className="text-xs text-foreground/60">Verified</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                    <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalIssues}</div>
                    <div className="text-xs text-foreground/60">Issues</div>
                  </div>
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 p-4 text-center">
                    <Zap className="h-6 w-6 text-violet-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{(totalProcessingTime / 1000).toFixed(1)}s</div>
                    <div className="text-xs text-foreground/60">Processing Time</div>
                  </div>
                </div>

                {/* Document Results */}
                <div className="space-y-3">
                  {analyses.map((analysis, index) => {
                    const docLabel = DOCUMENT_LABELS[analysis.result.classification.documentType] ?? analysis.documentId
                    const isValid = analysis.result.classification.isValidDocument
                    return (
                      <div
                        key={analysis.fileId}
                        className={cn(
                          "flex items-start gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4",
                          isValid
                            ? "border-emerald-200 dark:border-emerald-800"
                            : "border-red-200 dark:border-red-800"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg",
                            isValid
                              ? "bg-emerald-100 dark:bg-emerald-900/40"
                              : "bg-red-100 dark:bg-red-900/40"
                          )}
                        >
                          {isValid ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm capitalize">
                              {docLabel}
                            </h4>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                                isValid
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              )}
                            >
                              {isValid ? `${analysis.result.overallConfidence}% confidence` : "Rejected"}
                            </span>
                          </div>
                          {!isValid && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {analysis.result.classification.reason}
                            </p>
                          )}
                          {isValid && analysis.result.extraction && (
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {analysis.result.extraction.name && (
                                <span>Name: {analysis.result.extraction.name}</span>
                              )}
                              {analysis.result.extraction.dob && (
                                <span>DOB: {analysis.result.extraction.dob}</span>
                              )}
                              {analysis.result.extraction.income && (
                                <span>Income: ₹{analysis.result.extraction.income}</span>
                              )}
                              {analysis.result.extraction.category && (
                                <span>Category: {analysis.result.extraction.category}</span>
                              )}
                              {analysis.result.extraction.marks && (
                                <span>Marks: {analysis.result.extraction.marks}</span>
                              )}
                              {analysis.result.extraction.bankAccount && (
                                <span>Account: {analysis.result.extraction.bankAccount}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Button */}
            <div className="text-center">
              {hasErrors ? (
                <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                      <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 shrink-0" />
                      <div className="text-center sm:text-left">
                        <h3 className="font-semibold text-base sm:text-lg text-amber-800 dark:text-amber-300">
                          Some Documents Need Attention
                        </h3>
                        <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                          Please replace rejected documents and try again.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-12 px-8"
                        onClick={() => router.push("/upload")}
                      >
                        Back to Upload
                      </Button>
                      <Button
                        size="lg"
                        className="h-12 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
                        onClick={() => router.push("/dashboard")}
                      >
                        <ArrowRight className="h-5 w-5 mr-2" />
                        View Dashboard Anyway
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                      <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 shrink-0" />
                      <div className="text-center sm:text-left">
                        <h3 className="font-semibold text-base sm:text-lg text-emerald-800 dark:text-emerald-300">
                          Verification Complete
                        </h3>
                        <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                          All documents verified. View your comprehensive report.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="h-12 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg text-base gap-2"
                      onClick={() => router.push("/dashboard")}
                    >
                      <ArrowRight className="h-5 w-5" />
                      View Results Dashboard
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* No analyses fallback */}
        {isComplete && analyses.length === 0 && (
          <div className="mt-8 text-center animate-slide-up">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">No analysis data found. Please upload documents first.</p>
                <Button
                  onClick={() => router.push("/upload")}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600"
                >
                  Go to Upload
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
