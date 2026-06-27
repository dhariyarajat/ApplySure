"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { GraduationCap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/eligibility"
  const error = searchParams.get("error")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn("google", { callbackUrl })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 shadow-xl shadow-violet-500/25 mb-6">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              ApplySure
            </span>
          </h1>
          <p className="mt-2 text-foreground/70">
            Sign in to check your scholarship eligibility instantly
          </p>
        </div>

        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Use your Google account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-600 dark:text-red-400">
                {error === "OAuthSignin" && "There was a problem signing you in. Please try again."}
                {error === "OAuthCallback" && "There was a problem with the sign-in callback. Please try again."}
                {error === "OAuthAccountNotLinked" && "This email is already associated with another sign-in method."}
                {error === "AccessDenied" && "Access denied. You do not have permission to sign in."}
                {!["OAuthSignin", "OAuthCallback", "OAuthAccountNotLinked", "AccessDenied"].includes(error) && "An error occurred during sign in. Please try again."}
              </div>
            )}

            <Button
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all text-base gap-2"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>

            <p className="text-xs text-center text-foreground/60">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
