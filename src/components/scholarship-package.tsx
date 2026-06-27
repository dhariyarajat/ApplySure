"use client"

import { CheckCircle2, AlertCircle, FileUp, Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export type DocumentStatus = "uploaded" | "missing"

export interface DocumentItem {
  id: string
  label: string
  status: DocumentStatus
  description: string
  icon?: string
}

interface ScholarshipPackageProps {
  documents: DocumentItem[]
}

const documentIcons: Record<string, string> = {
  "aadhaar": "🪪",
  "income": "💰",
  "marksheet": "📄",
  "caste": "📋",
  "bank": "🏦",
}

export function ScholarshipPackage({ documents }: ScholarshipPackageProps) {
  const uploadedCount = documents.filter((d) => d.status === "uploaded").length
  const totalCount = documents.length
  const percentage = Math.round((uploadedCount / totalCount) * 100)

  return (
    <div className="animate-scale-in rounded-xl border bg-gradient-to-b from-card to-muted/20 shadow-lg">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm shadow-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Scholarship Package</h3>
            <p className="text-xs text-muted-foreground">
              {uploadedCount} of {totalCount} documents
            </p>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="px-5 py-3 space-y-1">
        {documents.map((doc, index) => (
          <div
            key={doc.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-300",
              doc.status === "uploaded"
                ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                : "bg-amber-50/50 dark:bg-amber-950/20",
              "animate-slide-up"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-all duration-300",
              doc.status === "uploaded"
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            )}>
              {doc.status === "uploaded" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {doc.label}
                </span>
                <span className="text-xs">{documentIcons[doc.id] ?? ""}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
            </div>
            <div className="shrink-0">
              {doc.status === "uploaded" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  Uploaded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  Missing
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Footer */}
      <div className="border-t bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Package Completion</span>
          <span className={cn(
            "text-lg font-bold tabular-nums",
            percentage === 100
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-violet-600 dark:text-violet-400"
          )}>
            {percentage}%
          </span>
        </div>
        <Progress value={percentage} className={cn(
          "h-2.5",
          percentage === 100 && "[&>div]:bg-emerald-500"
        )} />
        {percentage === 100 && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            All documents uploaded! Ready for processing.
          </p>
        )}
        {percentage > 0 && percentage < 100 && (
          <p className="text-xs text-muted-foreground mt-2">
            Upload remaining documents to complete your package
          </p>
        )}
      </div>
    </div>
  )
}
