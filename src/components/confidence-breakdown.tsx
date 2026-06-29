"use client"

import { Shield, CheckCircle2, AlertCircle, XCircle, Brain, Zap, TrendingUp, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DocumentAnalysisResult } from "@/lib/document-ai"

interface ConfidenceBreakdownProps {
  result: DocumentAnalysisResult
  className?: string
}

const FIELD_LABELS: Record<string, string> = {
  name: "Full Name",
  fatherName: "Father's Name",
  dob: "Date of Birth",
  income: "Annual Income",
  category: "Category/Caste",
  marks: "Marks/Percentage",
  bankAccount: "Bank Account",
  ifsc: "IFSC Code",
  ocr: "OCR Quality",
}

const FIELD_ICONS: Record<string, typeof Shield> = {
  name: Shield,
  fatherName: Shield,
  dob: Shield,
  income: TrendingUp,
  category: Shield,
  marks: TrendingUp,
  bankAccount: Shield,
  ifsc: Shield,
  ocr: Brain,
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return "text-emerald-500"
  if (confidence >= 70) return "text-emerald-500"
  if (confidence >= 40) return "text-amber-500"
  return "text-red-500"
}

function getConfidenceBg(confidence: number): string {
  if (confidence >= 90) return "bg-emerald-500"
  if (confidence >= 70) return "bg-emerald-500"
  if (confidence >= 40) return "bg-amber-500"
  return "bg-red-500"
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 95) return "Excellent"
  if (confidence >= 85) return "High"
  if (confidence >= 70) return "Good"
  if (confidence >= 40) return "Low"
  return "Unreliable"
}

function getConfidenceIcon(confidence: number, hasValue: boolean) {
  if (!hasValue) return <XCircle className="h-4 w-4 text-muted-foreground" />
  if (confidence >= 70) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (confidence >= 40) return <AlertCircle className="h-4 w-4 text-amber-500" />
  return <XCircle className="h-4 w-4 text-red-500" />
}

export function ConfidenceBreakdown({ result, className }: ConfidenceBreakdownProps) {
  const { extraction, validations, overallConfidence, classification } = result
  const isValid = classification.isValidDocument

  if (!isValid || !extraction) {
    return (
      <Card className={cn("border-amber-200 dark:border-amber-800", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-medium text-sm text-amber-800 dark:text-amber-300">No extraction data available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Confidence breakdown is only available for successfully classified documents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const fieldEntries = Object.entries(extraction.extractedFields).filter(([key]) => key !== "ocr")
  const hasValue = (key: string) => {
    const v = extraction?.[key as keyof typeof extraction]
    return !!v && typeof v === "string" && v.length > 0
  }

  // Calculate distribution based on field keys (not f.source)
  const excellent = fieldEntries.filter(([key, f]) => f.confidence >= 90 && hasValue(key)).length
  const good = fieldEntries.filter(([, f]) => f.confidence >= 70 && f.confidence < 90).length
  const low = fieldEntries.filter(([, f]) => f.confidence >= 40 && f.confidence < 70).length
  const unreliable = fieldEntries.filter(([, f]) => f.confidence < 40).length

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="h-1.5 bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-500" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-500" />
              Confidence Breakdown
            </CardTitle>
            <CardDescription>
              Per-field AI confidence scores for extracted data
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold tabular-nums", getConfidenceColor(overallConfidence))}>
              {overallConfidence}%
            </div>
            <div className="text-[10px] text-muted-foreground">overall</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Field-by-field confidence */}
        <div className="space-y-2 sm:space-y-2.5">
          {fieldEntries
            .sort(([, a], [, b]) => b.confidence - a.confidence)
            .map(([key, field]) => {
              const Icon = FIELD_ICONS[key] ?? Shield
              const label = FIELD_LABELS[key] ?? key
              const hasFieldValue = hasValue(key)

              return (
                <div
                  key={key}
                  className={cn(
                    "group rounded-lg border p-3 transition-all duration-200 hover:shadow-sm",
                    field.confidence >= 70
                      ? "border-emerald-200/50 dark:border-emerald-800/50"
                      : field.confidence >= 40
                      ? "border-amber-200/50 dark:border-amber-800/50"
                      : "border-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md",
                          field.confidence >= 70
                            ? "bg-emerald-100 dark:bg-emerald-900/40"
                            : field.confidence >= 40
                            ? "bg-amber-100 dark:bg-amber-900/40"
                            : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5",
                            field.confidence >= 70
                              ? "text-emerald-600 dark:text-emerald-400"
                              : field.confidence >= 40
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{label}</span>
                        {hasFieldValue && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {String(extraction[key as keyof typeof extraction])}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold tabular-nums", getConfidenceColor(field.confidence))}>
                        {field.confidence}%
                      </span>
                      {getConfidenceIcon(field.confidence, hasFieldValue)}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        getConfidenceBg(field.confidence)
                      )}
                      style={{ width: `${field.confidence}%` }}
                    />
                  </div>

                  {/* Status label */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {getConfidenceLabel(field.confidence)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {field.source === "ocr_match" ? "OCR match" : field.source === "not_found" ? "Not found" : field.source}
                    </span>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Distribution Summary */}
        <div className="rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-4">
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-1">
            <Info className="h-3 w-3" />
            Confidence Distribution
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{excellent}</div>
              <div className="text-[10px] text-muted-foreground">Excellent (≥90)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-500">{good}</div>
              <div className="text-[10px] text-muted-foreground">Good (70-89)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-500">{low}</div>
              <div className="text-[10px] text-muted-foreground">Low (40-69)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-muted-foreground">{unreliable}</div>
              <div className="text-[10px] text-muted-foreground">Unreliable (&lt;40)</div>
            </div>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="rounded-lg border p-3">
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Validation Summary
          </h4>
          <div className="flex flex-wrap gap-2">
            {validations.map((v, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                  v.status === "present" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
                  v.status === "missing" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                  v.status === "unclear" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                )}
              >
                {v.status === "present" ? (
                  <CheckCircle2 className="h-2.5 w-2.5" />
                ) : v.status === "missing" ? (
                  <XCircle className="h-2.5 w-2.5" />
                ) : (
                  <AlertCircle className="h-2.5 w-2.5" />
                )}
                {v.field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ))}
          </div>
        </div>

        {/* OCR Text Sample Preview */}
        {extraction.rawText && extraction.rawText.length > 0 && (
          <div className="rounded-lg bg-muted/30 p-3">
            <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
              <Brain className="h-3 w-3" />
              OCR Text Preview
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 font-mono">
              {extraction.rawText.slice(0, 300)}
              {extraction.rawText.length > 300 && "..."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
