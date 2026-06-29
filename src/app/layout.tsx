import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { NavBar } from '@/components/navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ApplySure AI - Smart Scholarship Applications',
  description: 'Upload, verify, and submit your scholarship documents with AI-powered precision.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            <NavBar />
            <main className="flex-1 pt-16">
              {children}
            </main>
            <footer className="border-t bg-muted/30">
              <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
                <p className="text-sm text-muted-foreground">
                  © 2026 ApplySure AI. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
