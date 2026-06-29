"use client"

import { ArrowRight, CheckCircle2, FileText, Shield, Zap, Sparkles, Upload, Brain, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950 dark:via-background dark:to-indigo-950" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5OTk5OTkiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0wIDM2YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0tMTgtMThjMS42NTcgMCAzLTEuMzQzIDMtM3MtMS4zNDMtMy0zLTMtMyAxLjM0My0zIDMgMS4zNDMgMyAzIDN6bTM2IDBjMS42NTcgMCAzLTEuMzQzIDMtM3MtMS4zNDMtMy0zLTMtMyAxLjM0My0zIDMgMS4zNDMgMyAzIDN6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />              <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pb-36 lg:pt-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border bg-white/50 dark:bg-white/10 px-4 py-1.5 text-sm shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span className="text-foreground/70">AI-Powered Scholarship Applications</span>
            </div>

            {/* Headline */}
            <h1 className="animate-slide-up text-3xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Your Scholarship
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Applied with Confidence
              </span>
            </h1>

            {/* Subtitle */}
            <p className="animate-slide-up stagger-2 mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-foreground/70 sm:text-xl">
              ApplySure AI helps you organize, verify, and submit scholarship documents with AI-powered precision. 
              No more missing papers. No more last-minute panic.
            </p>

            {/* CTA Buttons */}
            <div className="animate-slide-up stagger-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/upload">
                <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 text-base gap-2">
                  <Upload className="h-5 w-5" />
                  Start Your Application
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  <BarChart3 className="h-5 w-5" />
                  View Dashboard
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="animate-slide-up stagger-4 mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 border-y py-6 sm:py-8">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">10K+</div>
                <div className="text-xs sm:text-sm text-foreground/60 mt-1">Applications Processed</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">98%</div>
                <div className="text-xs sm:text-sm text-foreground/60 mt-1">Approval Rate</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">5 min</div>
                <div className="text-xs sm:text-sm text-foreground/60 mt-1">Average Upload Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for a{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                successful application
              </span>
            </h2>
            <p className="mt-4 text-foreground/60 text-base sm:text-lg">
              From document upload to AI verification, we've got you covered.
            </p>
          </div>

          <div className="mt-10 sm:mt-16 grid gap-4 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Upload,
                title: "Document Upload",
                description: "Upload all required documents in one place. Aadhaar, Income Certificate, Marksheets, and more.",
                gradient: "from-violet-500 to-purple-500",
              },
              {
                icon: Brain,
                title: "AI Verification",
                description: "Our AI checks each document for completeness, clarity, and validity before submission.",
                gradient: "from-indigo-500 to-blue-500",
              },
              {
                icon: BarChart3,
                title: "Real-time Dashboard",
                description: "Track your application status, document verification progress, and submission deadlines.",
                gradient: "from-emerald-500 to-teal-500",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Your documents are encrypted and stored securely. We never share your data with third parties.",
                gradient: "from-rose-500 to-pink-500",
              },
              {
                icon: Zap,
                title: "Fast Processing",
                description: "Get AI verification results in seconds. No more waiting weeks for document checks.",
                gradient: "from-amber-500 to-orange-500",
              },
              {
                icon: FileText,
                title: "Smart Package Builder",
                description: "Automatically organize documents into a complete scholarship package with progress tracking.",
                gradient: "from-cyan-500 to-sky-500",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800"
              >
                <div className={`inline-flex rounded-lg bg-gradient-to-br ${feature.gradient} p-3 text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{feature.title}</h3>
                <p className="mt-2 text-sm text-card-foreground/80 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight sm:text-4xl">
              How it{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                works
              </span>
            </h2>
            <p className="mt-4 text-foreground/60 text-base sm:text-lg">
              Three simple steps to a complete scholarship application.
            </p>
          </div>

          <div className="mt-10 sm:mt-16 grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            {[
              { step: "01", title: "Upload Documents", description: "Upload all required scholarship documents. Our smart system automatically organizes them into a package.", icon: Upload },
              { step: "02", title: "AI Processing", description: "Our AI verifies each document for completeness, clarity, and authenticity. Get instant feedback.", icon: Brain },
              { step: "03", title: "Submit & Track", description: "Review your complete package, make any adjustments, and submit. Track your application in real-time.", icon: CheckCircle2 },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 shadow-inner">
                  <item.icon className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="mt-2 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">
                  Step {item.step}
                </div>
                <h3 className="mt-4 font-semibold text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-gradient-to-br from-violet-600 to-indigo-600 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to simplify your scholarship application?
          </h2>
          <p className="mt-4 text-lg text-violet-100">
            Join thousands of students who have successfully applied with ApplySure AI.
          </p>
          <Link href="/upload">
            <Button size="lg" className="mt-8 h-12 px-10 bg-white text-violet-700 hover:bg-violet-50 shadow-xl text-base gap-2">
              <Upload className="h-5 w-5" />
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
