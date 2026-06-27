"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3, CheckCircle2, AlertCircle, FileText, Download, Share2,
  ArrowLeft, Shield, Brain, Clock, Award, Sparkles,
  RefreshCw, Mail, Printer, GraduationCap, TrendingUp, Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { DOCUMENT_LABELS, type DocumentType } from "@/lib/document-ai/types"
import { matchScholarships } from "@/lib/scholarship"
import type { MatchingResults, MatchResult, StudentProfile } from "@/lib/scholarship/types"
import { generateBreakdown, generateInsights } from "@/lib/eligibility"
import { EligibilityBreakdown } from "@/components/eligibility-breakdown"
import { EligibilityInsights as EligibilityInsightsCard } from "@/components/eligibility-insights"
import type { EligibilityInsights } from "@/lib/eligibility/types"

interface StoredAnalysis {
  fileId: string
  documentId: string
  result: {
    classification: {
      isValidDocument: boolean
      documentType: string
      confidence: number
      reason: string
    }
    extraction: {
      name: string | null
      fatherName: string | null
      dob: string | null
      income: string | null
      category: string | null
      marks: string | null
      bankAccount: string | null
      ifsc: string | null
      confidence: number
    } | null
    validations: Array<{
      field: string
      status: string
      expected: boolean
      message?: string
    }>
    overallConfidence: number
    processingTimeMs: number
    errors: string[]
  }
  analyzedAt: string
}

function generateAppId(): string {
  const now = new Date()
  const seq = String(now.getTime() % 10000).padStart(4, "0")
  return `APS-${now.getFullYear()}-${seq}`
}

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "report" | "scholarships">("overview")
  const [analyses, setAnalyses] = useState<StoredAnalysis[]>([])
  const [matchingResults, setMatchingResults] = useState<MatchingResults | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [appId] = useState(generateAppId)
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)

  // ── Build Student Profile from extracted document data ──────────
  function buildStudentProfile(analysisList: StoredAnalysis[]): StudentProfile | null {
    // Collect all non-null extraction fields across all documents
    let name = ""
    let income = 0
    let category = "General"
    let marks = 0
    let gender: "Male" | "Female" | "Other" | undefined = undefined

    for (const analysis of analysisList) {
      const ext = analysis.result.extraction
      if (!ext) continue

      if (ext.name && !name) name = ext.name
      if (ext.income && !income) {
        const parsed = parseInt(ext.income.replace(/[^\d]/g, ""), 10)
        if (!isNaN(parsed)) income = parsed
      }
      // Take the first non-null, non-default category found across documents
      if (ext.category && category === "General") {
        category = ext.category
      }
      if (ext.marks && !marks) {
        // Try percentage first (e.g., "86.8"), then fraction (e.g., "434/500")
        const percentMatch = ext.marks.match(/(\d+\.?\d*)\s*%?$/)
        if (percentMatch) {
          const parsed = parseFloat(percentMatch[1])
          if (!isNaN(parsed)) marks = parsed
        }
        const fractionMatch = ext.marks.match(/^(\d+)\s*\/\s*(\d+)$/)
        if (!marks && fractionMatch) {
          const obtained = parseInt(fractionMatch[1], 10)
          const max = parseInt(fractionMatch[2], 10)
          if (max > 0) marks = Math.round((obtained / max) * 100)
        }
      }
    }

    if (!name && !income && !marks) return null

    return {
      name: name || "Applicant",
      income,
      category,
      marks,
      state: "",
      student: true,
      gender,
    }
  }

  // ── Load analysis data from storage ──────────
  const loadData = useCallback(() => {
    // Load from localStorage (persists across tab refreshes), fall back to sessionStorage
    const stored = localStorage.getItem("applysure_analyses") || sessionStorage.getItem("applysure_analyses")
    if (stored) {
      try {
        const parsed: StoredAnalysis[] = JSON.parse(stored)
        setAnalyses(parsed)
        setIsLoaded(true)
        return
      } catch {
        // If parsing fails, check for manual entry data
      }
    }

    // If no upload-flow data, check for manual entry data
    const manualResults = localStorage.getItem("manual_results") || sessionStorage.getItem("manual_results")
    const manualProfile = localStorage.getItem("manual_profile") || sessionStorage.getItem("manual_profile")
    if (manualResults && manualProfile) {
      try {
        const results: MatchingResults = JSON.parse(manualResults)
        const profile: StudentProfile = JSON.parse(manualProfile)
        setMatchingResults(results)
        setStudentProfile(profile)
        // Also create a synthetic analysis entry so the dashboard doesn't show empty state
        setAnalyses([{
          fileId: "manual-entry",
          documentId: "manual",
          result: {
            classification: {
              isValidDocument: true,
              documentType: "manual_entry",
              confidence: 100,
              reason: "Manual entry — no documents uploaded",
            },
            extraction: null,
            validations: [],
            overallConfidence: 100,
            processingTimeMs: 0,
            errors: [],
          },
          analyzedAt: new Date().toISOString(),
        }])
      } catch {
        // No valid data from either source
      }
    }
    setIsLoaded(true)
  }, [setIsLoaded])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh when localStorage changes (e.g., new upload in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const relevant = ["applysure_analyses", "manual_results", "manual_profile"]
      if (relevant.includes(e.key || "")) {
        loadData()
      }
    }
    const handleFocus = () => {
      loadData()
    }
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", handleFocus)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [loadData])

  // ── Run scholarship matching when analyses data changes ──────────
  useEffect(() => {
    if (analyses.length === 0) {
      setMatchingResults(null)
      setStudentProfile(null)
      return
    }
    try {
      const profile = buildStudentProfile(analyses)
      if (profile) {
        const results = matchScholarships(profile)
        setMatchingResults(results)
        setStudentProfile(profile)
      }
    } catch (error) {
      console.error("[Dashboard] Scholarship matching error:", error)
      setMatchingResults(null)
      setStudentProfile(null)
    }
    // Note: Student state is not yet extracted from documents.
    // State-specific scholarships may not match until state extraction is added.
  }, [analyses])

  // ── Compute eligibility insights ──────────────────────────────────
  const eligibilityInsights: EligibilityInsights | null = useMemo(() => {
    if (!matchingResults || !studentProfile) return null
    try {
      return generateInsights(
        [...matchingResults.eligibleScholarships, ...matchingResults.partiallyEligible, ...matchingResults.notEligible]
          .map((m) => ({
            scholarship: m.scholarship,
            breakdown: generateBreakdown(studentProfile, m.scholarship),
          }))
      )
    } catch {
      return null
    }
  }, [matchingResults, studentProfile])

  const verifiedCount = analyses.filter((a) => a.result.classification.isValidDocument).length
  const totalIssues = analyses.reduce((acc, a) => {
    return acc + a.result.validations.filter((v) => v.status !== "present").length
  }, 0)
  const averageConfidence = analyses.length > 0
    ? Math.round(analyses.reduce((acc, a) => acc + a.result.overallConfidence, 0) / analyses.length)
    : 0
  const totalProcessingTime = analyses.reduce((acc, a) => acc + a.result.processingTimeMs, 0)

  // Build document results from real analysis data
  const documentResults = analyses.map((analysis) => ({
    id: analysis.documentId,
    label: DOCUMENT_LABELS[analysis.result.classification.documentType as DocumentType] ?? analysis.documentId,
    status: analysis.result.classification.isValidDocument ? "verified" as const : "rejected" as const,
    confidence: analysis.result.overallConfidence,
    issues: analysis.result.validations
      .filter((v) => v.status !== "present")
      .map((v) => v.message ?? `${v.field} has issues`),
    verifiedAt: new Date(analysis.analyzedAt).toLocaleTimeString(),
    extraction: analysis.result.extraction,
  }))

  // Show loading state while reading from storage (prevents empty-state flash)
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
          <h2 className="text-xl font-semibold text-muted-foreground">Loading dashboard...</h2>
        </div>
      </div>
    )
  }

  // If no analyses loaded, show empty state
  if (analyses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Analysis Data</h2>
              <p className="text-muted-foreground mb-6">
                Upload and analyze documents first to see your results dashboard.
              </p>
              <Button
                onClick={() => router.push("/upload")}
                className="bg-gradient-to-r from-violet-600 to-indigo-600"
              >
                Go to Upload
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">Results Dashboard</h1>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {verifiedCount === analyses.length ? "Complete" : `${verifiedCount}/${analyses.length} Verified`}
                  </span>
                </div>
                <p className="text-foreground/70 mt-1">
                  Application #{appId} &middot; {analyses.length} document{analyses.length !== 1 ? "s" : ""} analyzed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => window.print()}>
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'ApplySure Application', url: window.location.href }).catch(() => {})
                }
              }}>
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { label: "Verification Score", value: `${averageConfidence}%`, icon: Brain, gradient: "from-violet-500 to-indigo-500", change: `${verifiedCount}/${analyses.length} passed` },
            { label: "Documents Verified", value: `${verifiedCount}/${analyses.length}`, icon: FileText, gradient: "from-emerald-500 to-teal-500", change: verifiedCount === analyses.length ? "All clear" : `${analyses.length - verifiedCount} need attention` },
            { label: "Issues Found", value: `${totalIssues}`, icon: AlertCircle, gradient: totalIssues > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500", change: totalIssues > 0 ? "Needs attention" : "No issues" },
            { label: "Processing Time", value: `${(totalProcessingTime / 1000).toFixed(1)}s`, icon: Clock, gradient: "from-cyan-500 to-sky-500", change: `${analyses.length} documents` },
          ].map((stat, index) => (
            <Card key={index} className="animate-slide-up overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-card-foreground/70">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-card-foreground/60 mt-1">{stat.change}</p>
                  </div>
                  <div className={cn(
                    "rounded-xl bg-gradient-to-br p-3 text-white shadow-lg",
                    stat.gradient
                  )}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scholarship Stats Cards */}
        {matchingResults && (
          <div className="grid gap-4 sm:grid-cols-3 mb-8 animate-fade-in">
            {[
              {
                label: "Total Matches",
                value: `${matchingResults.eligibleScholarships.length + matchingResults.partiallyEligible.length}`,
                icon: GraduationCap,
                gradient: "from-violet-500 to-indigo-500",
                change: `${matchingResults.eligibleScholarships.length} fully eligible`,
              },
              {
                label: "Highly Eligible",
                value: `${matchingResults.eligibleScholarships.length}`,
                icon: TrendingUp,
                gradient: "from-emerald-500 to-teal-500",
                change: `≥80% eligibility score`,
              },
              {
                label: "Partially Eligible",
                value: `${matchingResults.partiallyEligible.length}`,
                icon: Users,
                gradient: matchingResults.partiallyEligible.length > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500",
                change: `50-79% eligibility score`,
              },
            ].map((stat, index) => (
              <Card key={`scholar-${index}`} className="animate-slide-up overflow-hidden" style={{ animationDelay: `${index * 80}ms` }}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-card-foreground/70">{stat.label}</p>
                      <p className="text-3xl font-bold mt-1">{stat.value}</p>
                      <p className="text-xs text-card-foreground/60 mt-1">{stat.change}</p>
                    </div>
                    <div className={cn(
                      "rounded-xl bg-gradient-to-br p-3 text-white shadow-lg",
                      stat.gradient
                    )}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-lg border bg-muted/50 p-1 overflow-x-auto w-full sm:w-fit">
          {[
            { id: "overview" as const, label: "Overview", icon: BarChart3 },
            { id: "documents" as const, label: "Documents", icon: FileText },
            { id: "report" as const, label: "Detailed Report", icon: Award },
            { id: "scholarships" as const, label: "Scholarships", icon: GraduationCap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                activeTab === tab.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Verification Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="animate-slide-up">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">AI Verification Summary</CardTitle>
                      <CardDescription className="text-card-foreground/70">
                        Comprehensive analysis of your scholarship application
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 px-4 py-2">
                      <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                        Score: {averageConfidence}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score Visualization */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Verification Score</span>
                      <span className="text-sm text-foreground/70">{averageConfidence}%</span>
                    </div>
                    <div className="relative h-4 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500 transition-all duration-1000"
                        style={{ width: `${averageConfidence}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-foreground/60">
                      <span>0%</span>
                      <span>Excellent</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Verification Checks - per document type */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {documentResults.map((doc, index) => (
                      <div key={doc.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{doc.label}</span>
                          <div className="flex items-center gap-1">
                            {doc.status === "verified" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={cn(
                              "text-xs font-medium",
                              doc.status === "verified" ? "text-emerald-600" : "text-red-600"
                            )}>
                              {doc.confidence}%
                            </span>
                          </div>
                        </div>
                        <Progress
                          value={doc.confidence}
                          className={cn(
                            "h-1.5",
                            doc.status === "verified" ? "[&>div]:bg-emerald-500" : "[&>div]:bg-red-500"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Document List */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Verified Documents</CardTitle>
                  <CardDescription>
                    {verifiedCount} of {analyses.length} documents have been verified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documentResults.map((doc, index) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 rounded-lg border p-4 animate-slide-up"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          doc.status === "verified"
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : "bg-red-100 dark:bg-red-900/40"
                        )}>
                          {doc.status === "verified" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{doc.label}</h4>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              doc.status === "verified"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            )}>
                              {doc.confidence}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Verified {doc.verifiedAt}
                            {doc.issues.length > 0 && ` • ${doc.issues[0]}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Application Status */}
              <Card className="animate-slide-up stagger-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Application Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={cn(
                    "flex items-center gap-3 rounded-lg p-3",
                    verifiedCount === analyses.length
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : "bg-amber-50 dark:bg-amber-950/20"
                  )}>
                    <Award className={cn(
                      "h-8 w-8",
                      verifiedCount === analyses.length ? "text-emerald-500" : "text-amber-500"
                    )} />
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        verifiedCount === analyses.length
                          ? "text-emerald-800 dark:text-emerald-300"
                          : "text-amber-800 dark:text-amber-300"
                      )}>
                        {verifiedCount === analyses.length ? "Ready for Submission" : "Incomplete"}
                      </p>
                      <p className={cn(
                        "text-xs",
                        verifiedCount === analyses.length
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}>
                        {verifiedCount === analyses.length ? "All checks passed" : `${analyses.length - verifiedCount} documents need review`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Application ID</span>
                      <span className="font-mono font-medium">{appId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Documents</span>
                      <span className="font-medium">{verifiedCount}/{analyses.length} verified</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing Time</span>
                      <span className="font-medium">{(totalProcessingTime / 1000).toFixed(1)}s</span>
                    </div>
                  </div>

                  <Button className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg" onClick={() => window.print()}>
                    <Mail className="h-4 w-4" />
                    Submit Application
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="animate-slide-up stagger-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { icon: Download, label: "Download Report", description: "PDF format", onClick: () => window.print() },
                    { icon: Printer, label: "Print Summary", description: "One-page overview", onClick: () => window.print() },
                    { icon: RefreshCw, label: "Re-verify", description: "Run AI check again", onClick: () => { loadData() } },
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Eligibility Insights */}
              {eligibilityInsights && (
                <div className="animate-slide-up stagger-4">
                  <EligibilityInsightsCard insights={eligibilityInsights} />
                </div>
              )}

              {/* Top Recommended Scholarships */}
              {matchingResults && (
                <Card className="animate-slide-up">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <CardTitle className="text-base">Top Recommended Scholarships</CardTitle>
                    </div>
                    <CardDescription>
                      Highest eligibility matches from {matchingResults.eligibleScholarships.length + matchingResults.partiallyEligible.length} available
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[...matchingResults.eligibleScholarships, ...matchingResults.partiallyEligible]
                      .slice(0, 5)
                      .map((match, index) => (
                        <div
                          key={match.scholarship.id}
                          className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
                        >
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                            match.eligibilityPercentage >= 80
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          )}>
                            {match.eligibilityPercentage}%
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{match.scholarship.name}</h4>
                            <p className="text-xs text-muted-foreground">{match.scholarship.provider}</p>
                          </div>
                          <a
                            href={match.applyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300"
                          >
                            Apply
                          </a>
                        </div>
                      ))}
                    {(matchingResults.eligibleScholarships.length + matchingResults.partiallyEligible.length) > 5 && (
                      <button
                        onClick={() => setActiveTab("scholarships")}
                        className="w-full text-center text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 py-2 transition-colors"
                      >
                        View all {matchingResults.eligibleScholarships.length + matchingResults.partiallyEligible.length} scholarships
                      </button>
                    )}
                    {(matchingResults.eligibleScholarships.length + matchingResults.partiallyEligible.length) === 0 && (
                      <p className="text-xs text-foreground/60 text-center py-4">
                        No matching scholarships found. Update your student profile to explore options.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Back Button */}
              <Button
                variant="ghost"
                className="w-full gap-2"
                onClick={() => router.push("/upload")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </Button>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Documents</CardTitle>
                <CardDescription>
                  Detailed view of all uploaded and verified documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documentResults.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 rounded-lg border p-4 animate-slide-up"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                        doc.status === "verified" ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-amber-100 dark:bg-amber-900/40"
                      )}>
                        <FileText className={cn(
                          "h-6 w-6",
                          doc.status === "verified" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{doc.label}</h4>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            doc.status === "verified"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          )}>
                            {doc.confidence}% Match
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Verified: {doc.verifiedAt}</span>
                          {doc.issues.length > 0 && (
                            <span className="text-amber-600">Issue: {doc.issues[0]}</span>
                          )}
                        </div>
                        {/* Show extracted fields if available */}
                        {doc.extraction && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            {doc.extraction.name && <span>Name: {doc.extraction.name}</span>}
                            {doc.extraction.dob && <span>DOB: {doc.extraction.dob}</span>}
                            {doc.extraction.income && <span>Income: ₹{doc.extraction.income}</span>}
                            {doc.extraction.category && <span>Category: {doc.extraction.category}</span>}
                            {doc.extraction.marks && <span>Marks: {doc.extraction.marks}</span>}
                            {doc.extraction.bankAccount && <span>Account: {doc.extraction.bankAccount}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scholarships Tab */}
        {activeTab === "scholarships" && matchingResults && (
          <div className="space-y-6 animate-fade-in">
            {/* Student Profile Summary */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Scholarship Recommendations</CardTitle>
                      <CardDescription>
                        AI-matched scholarships based on your extracted documents
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 px-4 py-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                      {matchingResults.eligibleScholarships.length + matchingResults.partiallyEligible.length} matches
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
                    <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-emerald-600">{matchingResults.eligibleScholarships.length}</div>
                    <div className="text-xs text-foreground/70">Highly Eligible (≥80%)</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 text-center">
                    <Users className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-amber-600">{matchingResults.partiallyEligible.length}</div>
                    <div className="text-xs text-foreground/70">Partially Eligible (50-79%)</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950/20 p-4 text-center">
                    <AlertCircle className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-slate-600">{matchingResults.notEligible.length}</div>
                    <div className="text-xs text-foreground/70">Not Eligible (&lt;50%)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highly Eligible */}
            {matchingResults.eligibleScholarships.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-lg">Highly Eligible Scholarships</CardTitle>
                  </div>
                  <CardDescription>
                    You meet most or all criteria for these {matchingResults.eligibleScholarships.length} scholarships
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {matchingResults.eligibleScholarships.map((match, index) => (
                    <ScholarshipMatchCard key={match.scholarship.id} match={match} index={index} profile={studentProfile} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Partially Eligible */}
            {matchingResults.partiallyEligible.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-lg">Partially Eligible Scholarships</CardTitle>
                  </div>
                  <CardDescription>
                    You partially meet criteria for these {matchingResults.partiallyEligible.length} scholarships
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {matchingResults.partiallyEligible.map((match, index) => (
                    <ScholarshipMatchCard key={match.scholarship.id} match={match} index={index} profile={studentProfile} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Not Eligible (collapsible) */}
            {matchingResults.notEligible.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer rounded-lg border p-4 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {matchingResults.notEligible.length}
                    </span>
                    Not Eligible Scholarships (click to expand)
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  {matchingResults.notEligible.map((match, index) => (
                    <ScholarshipMatchCard key={match.scholarship.id} match={match} index={index} profile={studentProfile} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Report Tab */}
        {activeTab === "report" && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Detailed Verification Report</CardTitle>
                    <CardDescription>
                      AI-generated comprehensive report for Application #{appId}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                    <Download className="h-4 w-4" />
                    Download Full Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-6">
                  <h3 className="font-semibold mb-2">Executive Summary</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Your scholarship application package has been thoroughly analyzed by our AI system. 
                    {verifiedCount} of {analyses.length} required documents have been verified with an overall confidence score of {averageConfidence}%. 
                    {totalIssues > 0 
                      ? ` ${totalIssues} issues were detected that may require attention.`
                      : " All documents passed verification checks."
                    }
                  </p>
                </div>

                {/* Detailed Findings */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Document-by-Document Analysis</h3>
                  {documentResults.map((doc, index) => (
                    <div key={doc.id} className="rounded-lg border p-4 animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{doc.label}</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Shield className={cn(
                              "h-4 w-4",
                              doc.status === "verified" ? "text-emerald-500" : "text-red-500"
                            )} />
                            <span className={cn(
                              "text-xs font-medium",
                              doc.status === "verified" ? "text-emerald-600" : "text-red-600"
                            )}>
                              {doc.status === "verified" ? "Authenticity: Verified" : "Authenticity: Failed"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-foreground/60">Quality Score</p>
                          <p className={cn(
                            "text-lg font-bold",
                            doc.status === "verified" ? "text-emerald-600" : "text-red-600"
                          )}>{doc.confidence}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground/60">OCR Accuracy</p>
                          <p className="text-lg font-bold text-violet-600">-</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground/60">Issues</p>
                          <p className="text-lg font-bold">{doc.issues.length > 0 ? doc.issues.length : "None"}</p>
                        </div>
                      </div>
                      {doc.issues.length > 0 && (
                        <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3">
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {doc.issues[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Scholarship Match Card Component ─────────────────────────────

function ScholarshipMatchCard({ match, index, profile }: { match: MatchResult; index: number; profile: StudentProfile | null }) {
  const breakdown = useMemo(() => {
    if (!profile) return null
    try {
      return generateBreakdown(profile, match.scholarship)
    } catch {
      return null
    }
  }, [profile, match.scholarship])

  return (
    <div
      className="rounded-lg border p-4 animate-slide-up transition-all hover:shadow-sm"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-4 flex-col sm:flex-row sm:justify-between">
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-semibold text-sm truncate">{match.scholarship.name}</h4>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                match.eligibilityPercentage >= 80
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : match.eligibilityPercentage >= 50
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {match.eligibilityPercentage}% Match
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{match.scholarship.provider}</p>

          <p className="text-xs text-muted-foreground mb-2">{match.scholarship.description}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Benefits: {match.benefits}
            </span>
          </div>

          {/* Reason */}
          <p className="text-xs mt-2">
            <span className="text-muted-foreground">{match.reason}</span>
          </p>

          {/* Matched Criteria */}
          {match.matchedCriteria.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {match.matchedCriteria.slice(0, 4).map((criterion) => (
                <span
                  key={criterion}
                  className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  ✓ {criterion}
                </span>
              ))}
              {match.matchedCriteria.length > 4 && (
                <span className="inline-flex items-center text-[10px] text-muted-foreground">
                  +{match.matchedCriteria.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Unmatched Criteria */}
          {match.unmatchedCriteria.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {match.unmatchedCriteria.slice(0, 3).map((criterion) => (
                <span
                  key={criterion}
                  className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400"
                >
                  ✗ {criterion}
                </span>
              ))}
            </div>
          )}

          {/* Eligibility Breakdown */}
          {breakdown && <EligibilityBreakdown breakdown={breakdown} />}
        </div>

        <a
          href={match.applyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white shadow transition-all hover:shadow-md hover:from-violet-700 hover:to-indigo-700 text-center sm:w-auto"
        >
          Apply
        </a>
      </div>
    </div>
  )
}
