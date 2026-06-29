"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  GraduationCap, CheckCircle2, AlertCircle, ArrowLeft, Sparkles,
  TrendingUp, Users, ExternalLink, Award, FileText, User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MatchingResults, MatchResult, StudentProfile } from "@/lib/scholarship/types"
import { generateBreakdown } from "@/lib/eligibility"
import { EligibilityBreakdown } from "@/components/eligibility-breakdown"

export default function ManualResultsPage() {
  const router = useRouter()
  const [results, setResults] = useState<MatchingResults | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)

  useEffect(() => {
    const storedResults = localStorage.getItem("manual_results") || sessionStorage.getItem("manual_results")
    const storedProfile = localStorage.getItem("manual_profile") || sessionStorage.getItem("manual_profile")

    if (!storedResults || !storedProfile) {
      router.push("/manual-entry")
      return
    }

    try {
      setResults(JSON.parse(storedResults))
      setProfile(JSON.parse(storedProfile))
    } catch {
      router.push("/manual-entry")
    }
  }, [router])

  // Show loading while checking
  if (!results || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
          <h2 className="text-xl font-semibold">Loading your results...</h2>
        </div>
      </div>
    )
  }

  const totalMatches = results.eligibleScholarships.length + results.partiallyEligible.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Start new application
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/25 shrink-0">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Scholarship Matches</h1>
                {totalMatches > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                    {totalMatches} matches
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                Based on your profile, here are the scholarships you may be eligible for
              </p>
            </div>
          </div>
        </div>

        {/* Student Profile Summary */}
        <Card className="mb-6 sm:mb-8 animate-slide-up">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <CardTitle className="text-base">Your Profile Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profile.name && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/20 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                  <User className="h-3.5 w-3.5" /> {profile.name}
                </span>
              )}
              {profile.gender && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                  {profile.gender}
                </span>
              )}
              {profile.category && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {profile.category}
                </span>
              )}
              {profile.income > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  ₹{profile.income.toLocaleString("en-IN")}/yr
                </span>
              )}
              {profile.marks > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  {profile.marks}% marks
                </span>
              )}
              {profile.state && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                  {profile.state}
                </span>
              )}
              {profile.disability && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                  Disability
                </span>
              )}
              {profile.pursuing && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                  {profile.pursuing}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 mb-6 sm:mb-8 animate-slide-up">
          <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-violet-200/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-violet-500 mx-auto mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">{totalMatches}</div>
              <div className="text-[10px] sm:text-xs text-foreground/60 mt-0.5 sm:mt-1">Total Matches Found</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 mx-auto mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{results.eligibleScholarships.length}</div>
              <div className="text-[10px] sm:text-xs text-foreground/60 mt-0.5 sm:mt-1">Highly Eligible (≥80%)</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50">
            <CardContent className="p-4 sm:p-6 text-center">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 mx-auto mb-1 sm:mb-2" />
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">{results.partiallyEligible.length}</div>
              <div className="text-[10px] sm:text-xs text-foreground/60 mt-0.5 sm:mt-1">Partially Eligible (50-79%)</div>
            </CardContent>
          </Card>
        </div>

        {/* No matches state */}
        {totalMatches === 0 && (
          <Card className="border-amber-200 dark:border-amber-800 animate-slide-up">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Matching Scholarships Found</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Based on your profile, we couldn&apos;t find any matching scholarships. Try adjusting your criteria or uploading documents for more accurate matching.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push("/manual-entry")}>
                  Edit Details
                </Button>
                <Button
                  className="bg-gradient-to-r from-violet-600 to-indigo-600"
                  onClick={() => router.push("/upload")}
                >
                  Upload Documents
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Highly Eligible */ }
        {results.eligibleScholarships.length > 0 && (
          <div className="mb-8 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Highly Eligible Scholarships
              <span className="text-sm font-normal text-foreground/60">({results.eligibleScholarships.length})</span>
            </h2>
            <div className="space-y-4">
              {results.eligibleScholarships.map((match, index) => (
                <ScholarshipResultCard key={match.scholarship.id} match={match} index={index} profile={profile} />
              ))}
            </div>
          </div>
        )}

        {/* Partially Eligible */}
        {results.partiallyEligible.length > 0 && (
          <div className="mb-8 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Partially Eligible Scholarships
              <span className="text-sm font-normal text-foreground/60">({results.partiallyEligible.length})</span>
            </h2>
            <div className="space-y-4">
              {results.partiallyEligible.map((match, index) => (
                <ScholarshipResultCard key={match.scholarship.id} match={match} index={index} profile={profile} />
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-6 sm:mt-8 animate-slide-up">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 w-full sm:w-auto"
            onClick={() => router.push("/manual-entry")}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Edit Details
          </Button>
          <Button
            size="lg"
            className="h-12 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg w-full sm:w-auto"
            onClick={() => router.push("/upload")}
          >
            <FileText className="h-5 w-5 mr-2" />
            Try Uploading Documents Instead
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Scholarship Result Card Component ─────────────────────────────

function ScholarshipResultCard({ match, index, profile }: { match: MatchResult; index: number; profile: StudentProfile }) {
  const breakdown = useMemo(() => {
    try {
      return generateBreakdown(profile, match.scholarship)
    } catch {
      return null
    }
  }, [profile, match.scholarship])

  return (
    <Card className="animate-slide-up overflow-hidden hover:shadow-md transition-shadow" style={{ animationDelay: `${index * 60}ms` }}>
      <div className={cn(
        "h-1",
        match.eligibilityPercentage >= 80
          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
          : "bg-gradient-to-r from-amber-500 to-orange-500"
      )} />
      <CardContent className="p-6">
        <div className="flex items-start gap-4 flex-col sm:flex-row sm:justify-between">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-base truncate">{match.scholarship.name}</h3>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
                match.eligibilityPercentage >= 80
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              )}>
                {match.eligibilityPercentage}% Match
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{match.scholarship.provider}</p>
            <p className="text-sm text-muted-foreground mb-3">{match.scholarship.description}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                {match.benefits}
              </span>
            </div>

            {/* Reason */}
            <p className="text-xs text-muted-foreground mb-2">{match.reason}</p>

            {/* Criteria tags */}
            {match.matchedCriteria.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {match.matchedCriteria.slice(0, 3).map((c) => (
                  <span key={c} className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    ✓ {c}
                  </span>
                ))}
                {match.matchedCriteria.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{match.matchedCriteria.length - 3} more</span>
                )}
              </div>
            )}
            {match.unmatchedCriteria.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {match.unmatchedCriteria.slice(0, 2).map((c) => (
                  <span key={c} className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                    ✗ {c}
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
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow transition-all hover:shadow-md hover:from-violet-700 hover:to-indigo-700 sm:w-auto"
          >
            Apply Now
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

