"use client"

import { TrendingUp, TrendingDown, Lightbulb, CheckCircle2, XCircle, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EligibilityInsights as EligibilityInsightsType } from "@/lib/eligibility"

interface EligibilityInsightsProps {
  insights: EligibilityInsightsType
}

export function EligibilityInsights({ insights }: EligibilityInsightsProps) {
  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
          <CardTitle className="text-base sm:text-lg">Eligibility Insights</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Your eligibility patterns across {insights.fullyEligibleCount + insights.partiallyEligibleCount} matching scholarships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5">
        {/* Average Score */}
        <div className="flex items-center gap-3 rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 p-3 sm:p-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20 shrink-0">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground">Average Eligibility Score</p>
            <p className="text-xl sm:text-2xl font-bold text-violet-600 dark:text-violet-400">{insights.averageScore}%</p>
          </div>
        </div>

        {/* Strong Areas */}
        {insights.strongAreas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Strong Areas
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {insights.strongAreas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {insights.weakAreas.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Weak Areas
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {insights.weakAreas.map((area) => (
                <span
                  key={area}
                  className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/20 px-2.5 py-1 text-[10px] font-medium text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/30"
                >
                  <XCircle className="h-3 w-3" />
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 p-4">
            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2.5 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Top Recommendations
            </h4>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800 text-[9px] font-bold text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {insights.fullyEligibleCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Fully Eligible</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-center">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {insights.partiallyEligibleCount}
            </p>
            <p className="text-[10px] text-muted-foreground">Partially Eligible</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
