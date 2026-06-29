"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X, Home, Upload, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close menu on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    if (mobileMenuOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [mobileMenuOpen]);

  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-violet-500/30 group-hover:scale-105">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            Apply
            <span className="text-violet-600 dark:text-violet-400">Sure</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/upload"
            className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
          >
            Start Application
          </a>
          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex sm:hidden h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Side Drawer */}
<>
  <div
    className={cn(
      "fixed inset-0 z-[90] bg-black/10 transition-opacity duration-300 sm:hidden",
      mobileMenuOpen
        ? "opacity-100"
        : "pointer-events-none opacity-0"
    )}
    onClick={closeMobileMenu}
    aria-hidden="true"
  />

  <div
    className={cn(
      "fixed top-0 right-0 z-[100] h-screen w-[80vw] max-w-[320px] sm:hidden",
      "transition-transform duration-300 ease-in-out",
      "border-l border-white/10",
      "bg-background/70 supports-[backdrop-filter]:bg-background/90",
      "backdrop-blur-2xl",
      "shadow-2xl",
      mobileMenuOpen
        ? "translate-x-0"
        : "translate-x-full"
    )}
  >
    <div className="flex h-full flex-col">

      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <span className="text-sm font-semibold">
          Menu
        </span>

        <button
          onClick={closeMobileMenu}
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-5 space-y-2">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon

          return (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMobileMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-white/10"
            >
              <Icon className="h-5 w-5 opacity-70" />
              {link.label}
            </a>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <a
          href="/upload"
          onClick={closeMobileMenu}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 font-medium text-white"
        >
          <Upload className="h-4 w-4" />
          Start Application
        </a>
      </div>

    </div>
  </div>
</>
    </nav>
  );
}
