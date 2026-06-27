"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  User, MapPin, DollarSign, BookOpen, Calendar, Users, AlertCircle,
  ArrowRight, CheckCircle2, Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]

interface ProfileFormData {
  fullName: string
  dob: string
  gender: string
  state: string
  district: string
  category: string
  minorityStatus: string
  disabilityStatus: string
  highestQualification: string
  currentEducationLevel: string
  previousExamPercentage: string
  annualFamilyIncome: string
}

const INITIAL_FORM: ProfileFormData = {
  fullName: "",
  dob: "",
  gender: "",
  state: "",
  district: "",
  category: "",
  minorityStatus: "",
  disabilityStatus: "",
  highestQualification: "",
  currentEducationLevel: "",
  previousExamPercentage: "",
  annualFamilyIncome: "",
}

interface FormErrors {
  [key: string]: string
}

const SECTIONS = [
  {
    title: "Personal Details",
    icon: User,
    fields: [
      { key: "fullName" as const, label: "Full Name", type: "text", placeholder: "Enter your full name" },
      { key: "dob" as const, label: "Date of Birth", type: "text", placeholder: "DD/MM/YYYY" },
      {
        key: "gender" as const, label: "Gender", type: "select",
        options: [
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
          { value: "Other", label: "Other" },
        ],
      },
    ],
  },
  {
    title: "Academic Details",
    icon: BookOpen,
    fields: [
      {
        key: "highestQualification" as const, label: "Highest Qualification", type: "select",
        options: [
          { value: "10th", label: "10th" },
          { value: "12th", label: "12th" },
          { value: "Diploma", label: "Diploma" },
          { value: "UG", label: "UG" },
          { value: "PG", label: "PG" },
          { value: "PhD", label: "PhD" },
        ],
      },
      {
        key: "currentEducationLevel" as const, label: "Current Education Level", type: "select",
        options: [
          { value: "School", label: "School" },
          { value: "College", label: "College" },
          { value: "University", label: "University" },
        ],
      },
      { key: "previousExamPercentage" as const, label: "Previous Exam Percentage", type: "number", placeholder: "e.g. 85.5" },
    ],
  },
  {
    title: "Financial & Category",
    icon: DollarSign,
    fields: [
      { key: "annualFamilyIncome" as const, label: "Annual Family Income (₹)", type: "number", placeholder: "e.g. 250000" },
      {
        key: "category" as const, label: "Category", type: "select",
        options: [
          { value: "General", label: "General" },
          { value: "OBC", label: "OBC" },
          { value: "SC", label: "SC" },
          { value: "ST", label: "ST" },
          { value: "EWS", label: "EWS" },
        ],
      },
      {
        key: "minorityStatus" as const, label: "Minority Status", type: "select",
        options: [
          { value: "No", label: "No" },
          { value: "Yes", label: "Yes" },
        ],
      },
      {
        key: "disabilityStatus" as const, label: "Disability Status", type: "select",
        options: [
          { value: "No", label: "No" },
          { value: "Yes", label: "Yes" },
        ],
      },
    ],
  },
  {
    title: "Location",
    icon: MapPin,
    fields: [
      {
        key: "state" as const, label: "State", type: "select",
        options: INDIAN_STATES.map((s) => ({ value: s, label: s })),
      },
      { key: "district" as const, label: "District", type: "text", placeholder: "Enter your district" },
    ],
  },
]

export default function ProfileSetupPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [form, setForm] = useState<ProfileFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    // Load existing profile if available
    if (session?.user?.id) {
      fetch(`/api/profile?userId=${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            setForm({
              fullName: data.profile.fullName || "",
              dob: data.profile.dob || "",
              gender: data.profile.gender || "",
              state: data.profile.state || "",
              district: data.profile.district || "",
              category: data.profile.category || "",
              minorityStatus: data.profile.minorityStatus || "",
              disabilityStatus: data.profile.disabilityStatus || "",
              highestQualification: data.profile.highestQualification || "",
              currentEducationLevel: data.profile.currentEducationLevel || "",
              previousExamPercentage: data.profile.previousExamPercentage?.toString() || "",
              annualFamilyIncome: data.profile.annualFamilyIncome?.toString() || "",
            })
            setIsSaved(true)
          }
        })
        .catch(() => {})
    }
  }, [session])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const updateField = <K extends keyof ProfileFormData>(field: K, value: ProfileFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required"
    if (!form.dob.trim()) newErrors.dob = "Date of Birth is required"
    else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dob)) newErrors.dob = "Use DD/MM/YYYY format"
    if (!form.gender) newErrors.gender = "Select your gender"
    if (!form.state) newErrors.state = "Select your state"
    if (!form.district.trim()) newErrors.district = "District is required"
    if (!form.category) newErrors.category = "Select your category"
    if (!form.minorityStatus) newErrors.minorityStatus = "Select minority status"
    if (!form.disabilityStatus) newErrors.disabilityStatus = "Select disability status"
    if (!form.highestQualification) newErrors.highestQualification = "Select highest qualification"
    if (!form.currentEducationLevel) newErrors.currentEducationLevel = "Select education level"
    const pct = parseFloat(form.previousExamPercentage)
    if (!form.previousExamPercentage.trim()) newErrors.previousExamPercentage = "Percentage is required"
    else if (isNaN(pct) || pct < 0 || pct > 100) newErrors.previousExamPercentage = "Enter valid percentage (0-100)"
    const income = parseInt(form.annualFamilyIncome.replace(/,/g, ""), 10)
    if (!form.annualFamilyIncome.trim()) newErrors.annualFamilyIncome = "Annual income is required"
    else if (isNaN(income) || income <= 0) newErrors.annualFamilyIncome = "Enter a valid income amount"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)

    try {
      const profileData = {
        userId: session?.user?.id || "",
        fullName: form.fullName.trim(),
        dob: form.dob.trim(),
        gender: form.gender,
        state: form.state,
        district: form.district.trim(),
        category: form.category,
        minorityStatus: form.minorityStatus,
        disabilityStatus: form.disabilityStatus,
        highestQualification: form.highestQualification,
        currentEducationLevel: form.currentEducationLevel,
        previousExamPercentage: parseFloat(form.previousExamPercentage),
        annualFamilyIncome: parseInt(form.annualFamilyIncome.replace(/,/g, ""), 10),
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })

      if (!res.ok) throw new Error("Failed to save profile")

      setIsSaved(true)
      setTimeout(() => {
        router.push("/eligibility")
      }, 500)
    } catch (error) {
      console.error("Profile save error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalFields = Object.keys(INITIAL_FORM).length
  const filledFields = Object.entries(form).filter(([, v]) => v !== "" && v !== 0 && v !== "0").length
  const completionPercent = Math.round((filledFields / totalFields) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
            <User className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {isSaved ? "Update Your" : "Set Up Your"}{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Profile
            </span>
          </h1>
          <p className="mt-2 text-foreground/70 max-w-xl mx-auto">
            {isSaved
              ? "Update your saved profile information for accurate scholarship matching"
              : "Fill in your details so we can match you with the right scholarships"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{filledFields} of {totalFields} fields</span>
          </div>
          <Progress value={completionPercent} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-indigo-500" />
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section, sectionIndex) => (
            <Card key={section.title} className="animate-slide-up overflow-hidden" style={{ animationDelay: `${sectionIndex * 0.1}s` }}>
              <CardHeader className="pb-4 border-b bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
                    <section.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>Fill in your {section.title.toLowerCase()}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {section.fields.map((field) => {
                    const value = form[field.key]
                    const error = errors[field.key]

                    return (
                      <div key={field.key} className={cn(field.type === "select" && field.options && field.options.length > 10 ? "sm:col-span-2" : "")}>
                        <label className="block text-sm font-medium mb-1.5">
                          {field.label}
                          <span className="text-red-500 ml-0.5">*</span>
                        </label>

                        {field.type === "select" && field.options ? (
                          <select
                            value={value}
                            onChange={(e) => updateField(field.key, e.target.value as never)}
                            className={cn(
                              "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                              error ? "border-red-500" : "border-input hover:border-violet-300"
                            )}
                          >
                            <option value="">Select {field.label.toLowerCase()}...</option>
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            value={value}
                            onChange={(e) => updateField(field.key, e.target.value as never)}
                            placeholder={field.placeholder}
                            className={cn(
                              "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                              error ? "border-red-500" : "border-input hover:border-violet-300"
                            )}
                          />
                        )}

                        {error && (
                          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {error}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-8 space-y-4 animate-slide-up">
          {Object.keys(errors).length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? "s" : ""}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {Object.entries(errors).map(([field, msg]) => (
                        <li key={field} className="text-xs text-amber-600 dark:text-amber-400">• {msg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all text-base gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting || isSaved}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving Profile...
              </>
            ) : isSaved ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Profile Saved — Continue
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Save Profile & Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>

          {isSaved && (
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={() => router.push("/eligibility")}
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Continue to Eligibility Check
            </Button>
          )}

          <p className="text-xs text-center text-foreground/60">
            Your information is encrypted and stored securely
          </p>
        </div>
      </div>
    </div>
  )
}
