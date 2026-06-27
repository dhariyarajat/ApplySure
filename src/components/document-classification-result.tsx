"use client"

import { CheckCircle2, AlertCircle, XCircle, FileText, Shield, Brain, Scan, Zap, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DocumentAnalysisResult } from "@/lib/document-ai"
import { DOCUMENT_LABELS } from "@/lib/document-ai/types"

interface DocumentClassificationResultProps {
  result: DocumentAnalysisResult | null
  isLoading: boolean
}

export function DocumentClassificationResult({ result, isLoading }: DocumentClassificationResultProps) {
  if (isLoading) {
    return (
      <Card className="border-violet-200 dark:border-violet-800">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-violet-200 dark:bg-violet-800" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30">
                <Scan className="h-8 w-8 text-violet-600 dark:text-violet-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">AI is analyzing your document...</p>
              <p className="text-xs text-muted-foreground mt-1">Running OCR and classification</p>
            </div>
            <div className="w-full max-w-xs">
              <Progress value={45} className="h-1.5 [&>div]:bg-violet-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  const { classification, extraction, validations, overallConfidence, errors } = result
  const isValid = classification.isValidDocument
  const allPassed = validations.every((v) => v.status === "present")

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Classification Result */}
      <Card
        className={cn(
          "border-2",
          isValid
            ? "border-emerald-200 dark:border-emerald-800"
            : "border-red-200 dark:border-red-800"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isValid
                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                    : "bg-red-100 dark:bg-red-900/40"
                )}
              >
                {isValid ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">
                  {isValid ? "Valid Document Detected" : "Document Rejected"}
                </CardTitle>
                <CardDescription>{classification.reason}</CardDescription>
              </div>
            </div>
            {isValid && (
              <div className="rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 px-3 py-1">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {classification.confidence}%
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Document Type Badge */}
          {isValid && classification.documentType !== "unknown" && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 px-4 py-2">
              <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                {DOCUMENT_LABELS[classification.documentType] ?? classification.documentType}
              </span>
              <span className="text-xs text-muted-foreground">| Confidence: {classification.confidence}%</span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 mb-4">
              {errors.map((error, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Extracted Fields */}
          {isValid && extraction && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-500" />
                Extracted Information
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {renderField("Full Name", extraction.name, extraction.extractedFields["name"]?.confidence)}
                {renderField("Father's Name", extraction.fatherName, extraction.extractedFields["fatherName"]?.confidence)}
                {renderField("Date of Birth", extraction.dob, extraction.extractedFields["dob"]?.confidence)}
                {renderField("Annual Income", extraction.income ? `₹${extraction.income}` : null, extraction.extractedFields["income"]?.confidence)}
                {renderField("Category", extraction.category, extraction.extractedFields["category"]?.confidence)}
                {renderField("Marks", extraction.marks, extraction.extractedFields["marks"]?.confidence)}
                {renderField("Bank Account", extraction.bankAccount, extraction.extractedFields["bankAccount"]?.confidence)}
                {renderField("IFSC Code", extraction.ifsc, extraction.extractedFields["ifsc"]?.confidence)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                Validation Results
              </CardTitle>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400">{validations.filter((v) => v.status === "present").length} passed</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-amber-600 dark:text-amber-400">{validations.filter((v) => v.status !== "present").length} issues</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validations.map((validation, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3 text-sm",
                    validation.status === "present" && "bg-emerald-50/50 dark:bg-emerald-950/20",
                    validation.status === "missing" && "bg-red-50/50 dark:bg-red-950/20",
                    validation.status === "unclear" && "bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  {validation.status === "present" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  ) : validation.status === "missing" ? (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p
                      className={cn(
                        "font-medium text-xs",
                        validation.status === "present" && "text-emerald-700 dark:text-emerald-300",
                        validation.status === "missing" && "text-red-700 dark:text-red-300",
                        validation.status === "unclear" && "text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {validation.field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {validation.message && (
                      <p className="text-xs text-muted-foreground mt-0.5">{validation.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Score */}
            <div className="mt-4 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Zap className="h-4 w-4 text-violet-500" />
                  Overall Confidence Score
                </span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    overallConfidence >= 80 && "text-emerald-600",
                    overallConfidence >= 50 && overallConfidence < 80 && "text-amber-600",
                    overallConfidence < 50 && "text-red-600"
                  )}
                >
                  {overallConfidence}%
                </span>
              </div>
              <Progress
                value={overallConfidence}
                className={cn(
                  "h-2",
                  overallConfidence >= 80 && "[&>div]:bg-emerald-500",
                  overallConfidence >= 50 && overallConfidence < 80 && "[&>div]:bg-amber-500",
                  overallConfidence < 50 && "[&>div]:bg-red-500"
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Processing time: {(result.processingTimeMs / 1000).toFixed(1)}s
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Document Info */}
      {!isValid && (
        <Card className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">Document Not Accepted</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {classification.reason}. Please upload a valid document from the supported list:
                </p>
                <ul className="mt-2 space-y-1">
                  {["Aadhaar Card", "Income Certificate", "Academic Marksheet", "Caste Certificate", "Bank Passbook"].map(
                    (doc, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <div className="h-1 w-1 rounded-full bg-red-400" />
                        {doc}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {isValid && allPassed && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                All validations passed! Document is ready for processing.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function renderField(label: string, value: string | null | undefined, confidence?: number) {
  const isPopulated = !!value && value.length > 0
  const isConfident = confidence !== undefined && confidence >= 70

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-200",
        isPopulated && isConfident
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
          : "border-muted bg-muted/20"
      )}
    >
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "text-sm font-medium mt-0.5",
          isPopulated && isConfident ? "text-foreground" : "text-muted-foreground italic"
        )}
      >
        {isPopulated ? value : "Not found"}
      </p>
      {confidence !== undefined && (
        <p className={cn("text-[10px] mt-0.5", confidence >= 70 ? "text-emerald-600" : "text-muted-foreground")}>
          Confidence: {confidence}%
        </p>
      )}
    </div>
  )
}
