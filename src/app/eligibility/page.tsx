"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import {
  User, FileText, Loader2, LogOut, ArrowRight, GraduationCap, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { matchScholarships } from "@/lib/scholarship"
import type { StudentProfile } from "@/lib/scholarship/types"

export default function EligibilityPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingMyEligibility, setIsCheckingMyEligibility] = useState(false)

  useEffect(() => {
  const savedProfile = localStorage.getItem("user_profile")

  if (savedProfile) {
    setProfile(JSON.parse(savedProfile))
  } else {
    router.push("/profile-setup")
  }

  setIsLoading(false)
}, [router])
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-muted-foreground">Loading your profile...</h2>
        </div>
      </div>
    )
  }

  const handleCheckMyEligibility = async () => {
    if (!profile) return
    setIsCheckingMyEligibility(true)

    try {
      // Build StudentProfile from saved profile data
      let category = profile.category
      if (profile.minorityStatus === "Yes" && (category === "General" || !category)) {
        category = "Minority"
      }

      const studentProfile: StudentProfile = {
        name: profile.fullName,
        income: profile.annualFamilyIncome || 0,
        category,
        marks: profile.previousExamPercentage || 0,
        state: profile.state || "",
        student: true,
        gender: profile.gender as "Male" | "Female" | "Other" | undefined,
        disability: profile.disabilityStatus === "Yes",
        pursuing: profile.highestQualification || undefined,
      }

      // Run scholarship matching
      const results = matchScholarships(studentProfile)

      // Store in localStorage for the dashboard/results page
      localStorage.setItem("manual_profile", JSON.stringify(studentProfile))
      localStorage.setItem("manual_results", JSON.stringify(results))

      // Navigate to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Eligibility check error:", error)
    } finally {
      setIsCheckingMyEligibility(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Check Your{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Scholarship Eligibility
            </span>
          </h1>
          <p className="mt-4 text-lg text-foreground/70 max-w-2xl mx-auto">
            Choose how you'd like to check your eligibility for scholarships
          </p>
         
        </div>

        {/* Two Option Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Card 1: Check My Eligibility */}
          <div
            className="group relative rounded-2xl border-2 border-violet-200/50 bg-card p-8 transition-all duration-300 hover:shadow-xl hover:border-violet-300 hover:-translate-y-1 cursor-pointer animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-inner group-hover:scale-110 transition-transform">
              <User className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Check My Eligibility</h2>
            <p className="text-card-foreground/80 mb-6 leading-relaxed">
              Use your saved profile information to instantly check scholarship eligibility. No manual entry required.
            </p>
            <div className="space-y-3 mb-6">
              {profile && (
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 p-4 text-sm">
                  <p className="font-medium text-violet-800 dark:text-violet-300 mb-2">Your Saved Profile:</p>
                  <div className="space-y-1 text-xs text-violet-600 dark:text-violet-400">
                    <p>{profile.fullName} • {profile.gender} • {profile.category}</p>
                    <p>{profile.state}{profile.district ? ` • ${profile.district}` : ""}</p>
                    <p>{profile.highestQualification} • {profile.previousExamPercentage}% marks</p>
                    <p>₹{profile.annualFamilyIncome?.toLocaleString("en-IN")}/yr</p>
                  </div>
                </div>
              )}
            </div>
            <Button
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all text-base gap-2"
              disabled={isCheckingMyEligibility}
              onClick={(e) => { e.stopPropagation(); handleCheckMyEligibility(); }}
            >
              {isCheckingMyEligibility ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Checking Eligibility...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>

          {/* Card 2: Check Eligibility For Someone Else */}
          <div
            className="group relative rounded-2xl border-2 border-indigo-200/50 bg-card p-8 transition-all duration-300 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 cursor-pointer animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-indigo-900/30 shadow-inner group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Check Eligibility For Someone Else</h2>
            <p className="text-card-foreground/80 mb-6 leading-relaxed">
              Enter details manually for a friend, family member, or temporary eligibility check without using saved profile.
            </p>
            <ul className="space-y-2 mb-6 text-sm text-card-foreground/80">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Quick form-based entry
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                No saved profile required
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Instant eligibility results
              </li>
            </ul>
            <button
              onClick={() => {
                localStorage.removeItem("manual_results")
                localStorage.removeItem("manual_profile")
                router.push("/manual-entry")
              }}
              className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all group-hover:shadow-xl group-hover:shadow-indigo-500/30 group-hover:scale-105 cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manual Entry
            </button>
          </div>
        </div>

        {/* Profile actions */}
        <div className="mt-12 flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/profile-setup")}
          >
            <User className="h-4 w-4 mr-2" />
            Edit My Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/upload")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload Documents Instead
          </Button>
        </div>
      </div>
    </div>
  )
}
