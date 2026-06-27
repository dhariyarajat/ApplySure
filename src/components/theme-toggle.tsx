"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleSelect = useCallback((value: string) => {
    setTheme(value)
    setIsOpen(false)
  }, [setTheme])

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
        <div className="h-4 w-4" />
      </div>
    )
  }

  const resolved = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
        aria-label="Toggle theme"
        aria-expanded={isOpen}
      >
        {resolved === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 origin-top-right rounded-lg border bg-card shadow-lg z-50 animate-scale-in">
          <div className="p-1">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                  {isActive && (
                    <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
