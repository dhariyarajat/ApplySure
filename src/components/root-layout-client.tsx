"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

function NavbarAuth() {
  return (
    <Link
      href="/profile-setup"
      className="inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
    >
      Profile
    </Link>
  );
}

function NavbarInner() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
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
            Apply<span className="text-violet-600">Sure</span>
          </span>
        </Link>
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Upload
          </Link>
          <Link
            href="/eligibility"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Eligibility
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
          >
            Start Application
          </Link>

          <NavbarAuth />
        </div>
      </div>
    </nav>
  );
}

function NavbarContainer() {
  return <NavbarInner />;
}

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="relative flex min-h-screen flex-col">
        <NavbarContainer />
        <main className="flex-1 pt-16">{children}</main>
        <footer className="border-t bg-muted/30">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-muted-foreground">
              © 2026 ApplySure AI. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
