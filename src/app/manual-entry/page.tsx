"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  FileText, AlertCircle, ArrowRight, ArrowLeft,
  GraduationCap, User, DollarSign, BookOpen, MapPin, Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { matchScholarships } from "@/lib/scholarship"
import type { StudentProfile } from "@/lib/scholarship/types"

interface FormData {
  name: string
  dob: string
  gender: "Male" | "Female" | "Other" | ""
  qualification: "10th" | "12th" | "Diploma" | "UG" | "PG" | ""
  marks: string
  income: string
  state: string
  district: string
  category: string
  minority: "yes" | "no" | ""
  disability: "yes" | "no" | ""
  educationLevel: "School" | "College" | "University" | ""
  courseName: string
  institutionType: "Government" | "Private" | ""
}

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

const INITIAL_FORM: FormData = {
  name: "",
  dob: "",
  gender: "",
  qualification: "",
  marks: "",
  income: "",
  state: "",
  district: "",
  category: "",
  minority: "",
  disability: "",
  educationLevel: "",
  courseName: "",
  institutionType: "",
}

interface FormErrors {
  [key: string]: string
}

const SECTIONS: SectionConfig[] = [
  {
    title: "Personal Information",
    icon: User,
    fields: [
      { key: "name", label: "Full Name", type: "text", placeholder: "Enter your full name" },
      { key: "dob", label: "Date of Birth", type: "text", placeholder: "DD/MM/YYYY" },
      {
        key: "gender", label: "Gender", type: "select",
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
        key: "qualification", label: "Highest Qualification", type: "select",
        options: [
          { value: "10th", label: "10th" },
          { value: "12th", label: "12th" },
          { value: "Diploma", label: "Diploma" },
          { value: "UG", label: "UG" },
          { value: "PG", label: "PG" },
        ],
      },
      { key: "marks", label: "Previous Exam Percentage / Marks", type: "number", placeholder: "e.g. 85" },
      {
        key: "educationLevel", label: "Current Education Level", type: "select",
        options: [
          { value: "School", label: "School" },
          { value: "College", label: "College" },
          { value: "University", label: "University" },
        ],
      },
      { key: "courseName", label: "Course Name", type: "text", placeholder: "e.g. B.Sc, B.A., Engineering", optional: true },
      {
        key: "institutionType", label: "Institution Type", type: "select",
        options: [
          { value: "Government", label: "Government" },
          { value: "Private", label: "Private" },
        ],
      },
    ],
  },
  {
    title: "Financial & Category",
    icon: DollarSign,
    fields: [
      { key: "income", label: "Annual Family Income (₹)", type: "text", placeholder: "e.g. 250000" },
      {
        key: "category", label: "Category", type: "select",
        options: [
          { value: "General", label: "General" },
          { value: "OBC", label: "OBC" },
          { value: "SC", label: "SC" },
          { value: "ST", label: "ST" },
          { value: "EWS", label: "EWS" },
        ],
      },
      {
        key: "minority", label: "Minority Status", type: "select",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
      {
        key: "disability", label: "Disability Status", type: "select",
        options: [
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ],
      },
    ],
  },
  {
    title: "Location",
    icon: MapPin,
    fields: [
      {
        key: "state", label: "State", type: "select",
        options: INDIAN_STATES.map((s) => ({ value: s, label: s })),
      },
      { key: "district", label: "District", type: "text", placeholder: "Enter your district", optional: true },
    ],
  },
]

interface FieldConfig {
  key: keyof FormData
  label: string
  type: "text" | "number" | "select"
  placeholder?: string
  options?: { value: string; label: string }[]
  optional?: boolean
}

interface SectionConfig {
  title: string
  icon: React.ComponentType<{ className?: string }>
  fields: FieldConfig[]
}

export default function ManualEntryPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Clear old upload-flow data on mount to ensure fresh state
  useEffect(() => {
    localStorage.removeItem("applysure_analyses")
    sessionStorage.removeItem("applysure_analyses")
  }, [])

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user corrects it
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

    if (!form.name.trim()) newErrors.name = "Name is required"
    if (!form.dob.trim()) newErrors.dob = "Date of Birth is required"
    else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dob)) newErrors.dob = "Use DD/MM/YYYY format"

    if (!form.gender) newErrors.gender = "Select your gender"
    if (!form.qualification) newErrors.qualification = "Select your qualification"

    const marksNum = parseFloat(form.marks)
    if (!form.marks.trim()) newErrors.marks = "Marks/percentage is required"
    else if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) newErrors.marks = "Enter a valid percentage (0-100)"

    const incomeNum = parseInt(form.income.replace(/,/g, ""), 10)
    if (!form.income.trim()) newErrors.income = "Annual income is required"
    else if (isNaN(incomeNum) || incomeNum <= 0) newErrors.income = "Enter a valid income amount"

    if (!form.state) newErrors.state = "Select your state"
    if (!form.category) newErrors.category = "Select your category"
    if (!form.minority) newErrors.minority = "Select minority status"
    if (!form.disability) newErrors.disability = "Select disability status"
    if (!form.educationLevel) newErrors.educationLevel = "Select education level"
    if (!form.institutionType) newErrors.institutionType = "Select institution type"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setIsSubmitting(true)

    // Build StudentProfile from form data
    // Map minority status to category if applicable
    let category = form.category
    if (form.minority === "yes" && (category === "General" || category === "")) {
      category = "Minority"
    }

    const profile: StudentProfile = {
      name: form.name.trim(),
      income: parseInt(form.income.replace(/,/g, ""), 10),
      category,
      marks: parseFloat(form.marks),
      state: form.state,
      student: true,
      gender: form.gender as "Male" | "Female" | "Other",
      disability: form.disability === "yes",
      pursuing: form.courseName || form.qualification || undefined,
    }

    // Run scholarship matching
    const results = matchScholarships(profile)

    // Store profile and results in localStorage (persists across tab refreshes)
    localStorage.setItem("manual_profile", JSON.stringify(profile))
    localStorage.setItem("manual_results", JSON.stringify(results))

    // Navigate to results page
    setTimeout(() => {
      router.push("/manual-results")
    }, 300)
  }

  const totalFields = Object.keys(INITIAL_FORM).length
  const filledFields = Object.entries(form).filter(([, v]) => v !== "" && v !== 0).length
  const completionPercent = Math.round((filledFields / totalFields) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => router.push("/upload")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to options
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Fill Details Manually</h1>
              <p className="text-muted-foreground mt-1">
                Enter your academic and personal details to check scholarship eligibility
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Form Completion</span>
            <span className="text-sm text-muted-foreground">{filledFields} of {totalFields} fields</span>
          </div>
          <Progress value={completionPercent} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-indigo-500" />
        </div>

        <div className="space-y-8">
          {SECTIONS.map((section: SectionConfig, sectionIndex: number) => (
            <Card key={section.title} className="animate-slide-up overflow-hidden" style={{ animationDelay: `${sectionIndex * 0.1}s` }}>
              <CardHeader className="pb-4 border-b bg-gradient-to-r from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md">
                    <section.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription>
                      {section.fields.filter((f: FieldConfig) => !f.optional).length} required field{section.fields.filter((f: FieldConfig) => !f.optional).length !== 1 ? "s" : ""}
                      {section.fields.some((f: FieldConfig) => f.optional) ? " (optional fields marked)" : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {section.fields.map((field: FieldConfig) => {
                    const value = form[field.key]
                    const error = errors[field.key]
                    const isOptional = field.optional

                    return (
                      <div key={field.key} className={cn(field.type === "select" && field.options && field.options.length > 10 ? "sm:col-span-2" : "")}>
                        <label className="block text-sm font-medium mb-1.5">
                          {field.label}
                          {isOptional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
                          {!isOptional && <span className="text-red-500 ml-0.5">*</span>}
                        </label>

                        {field.type === "select" && field.options ? (
                          <select
                            value={value as string}
                            onChange={(e) => updateField(field.key, e.target.value as never)}
                            className={cn(
                              "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                              error ? "border-red-500" : "border-input hover:border-violet-300"
                            )}
                          >
                            <option value="">Select {field.label.toLowerCase()}...</option>                              {field.options.map((opt: { value: string; label: string }) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type}
                            value={value as string}
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
                        <li key={field} className="text-xs text-amber-600 dark:text-amber-400">
                          • {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6"
              onClick={() => router.push("/upload")}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <Button
              size="lg"
              className="h-12 px-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all text-base flex-1 sm:flex-none"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Checking Eligibility...
                </>
              ) : (
                <>
                  <GraduationCap className="h-5 w-5 mr-2" />
                  Check Scholarship Eligibility
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your information is processed securely and is not stored permanently
          </p>
        </div>
      </div>
    </div>
  )
}
