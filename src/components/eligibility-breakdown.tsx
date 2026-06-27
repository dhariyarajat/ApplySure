"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Lightbulb, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EligibilityBreakdown as EligibilityBreakdownType } from "@/lib/eligibility"

interface EligibilityBreakdownProps {
  breakdown: EligibilityBreakdownType
  className?: string
}

export function EligibilityBreakdown({ breakdown, className }: EligibilityBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn("mt-3", className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
      >
        {isOpen ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Hide Eligibility Breakdown
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            View Eligibility Breakdown
          </>
        )}
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className="mt-3 space-y-3 animate-fade-in">
          {/* Reason */}
          <p className="text-xs text-muted-foreground leading-relaxed">{breakdown.reason}</p>

          {/* Score bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Eligibility Score</span>
              <span
                className={cn(
                  "text-xs font-bold",
                  breakdown.score >= 80 && "text-emerald-600 dark:text-emerald-400",
                  breakdown.score >= 50 && breakdown.score < 80 && "text-amber-600 dark:text-amber-400",
                  breakdown.score < 50 && "text-red-600 dark:text-red-400",
                )}
              >
                {breakdown.score}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  breakdown.score >= 80 && "bg-gradient-to-r from-emerald-500 to-teal-500",
                  breakdown.score >= 50 && breakdown.score < 80 && "bg-gradient-to-r from-amber-500 to-orange-500",
                  breakdown.score < 50 && "bg-gradient-to-r from-red-500 to-rose-500",
                )}
                style={{ width: `${breakdown.score}%` }}
              />
            </div>
          </div>

          {/* Matched Criteria */}
          {breakdown.matchedCriteria.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Matched Requirements
              </h4>
              <div className="space-y-1">
                {breakdown.matchedCriteria.map((criterion) => (
                  <div
                    key={criterion.label}
                    className="flex items-start gap-2 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 px-2.5 py-1.5"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        {criterion.label}
                      </span>
                      <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                        {criterion.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Criteria */}
          {breakdown.failedCriteria.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Failed Requirements
              </h4>
              <div className="space-y-1">
                {breakdown.failedCriteria.map((criterion) => (
                  <div
                    key={criterion.label}
                    className="flex items-start gap-2 rounded-md bg-red-50/50 dark:bg-red-950/20 px-2.5 py-1.5"
                  >
                    <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-red-700 dark:text-red-300">
                        {criterion.label}
                      </span>
                      <p className="text-[10px] text-red-600/70 dark:text-red-400/70">
                        {criterion.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {breakdown.recommendations.length > 0 && breakdown.failedCriteria.length > 0 && (
            <div className="rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 px-3 py-2.5">
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Recommendations
              </h4>
              <ul className="space-y-1">
                {breakdown.recommendations.map((rec, i) => (
                  <li key={i} className="text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fully eligible badge */}
          {breakdown.score === 100 && (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                You are fully eligible! All requirements met.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
