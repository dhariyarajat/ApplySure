/**
 * API Route: /api/profile
 *
 * Handles saving and loading user academic profiles.
 * GET  /api/profile?userId=xxx - Load profile for a user
 * POST /api/profile - Save/update profile
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/profile?userId=xxx
 * Load the profile for a given user ID.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter is required" },
        { status: 400 }
      )
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("[API /profile] GET error:", error)
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profile
 * Save or update a user's academic profile.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      fullName,
      dob,
      gender,
      state,
      district,
      category,
      minorityStatus,
      disabilityStatus,
      highestQualification,
      currentEducationLevel,
      previousExamPercentage,
      annualFamilyIncome,
    } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // Upsert the profile (create if not exists, update if exists)
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        fullName,
        dob,
        gender,
        state,
        district,
        category,
        minorityStatus,
        disabilityStatus,
        highestQualification,
        currentEducationLevel,
        previousExamPercentage: previousExamPercentage ? parseFloat(previousExamPercentage) : null,
        annualFamilyIncome: parseFloat(annualFamilyIncome) || 0,
      },
      create: {
        userId,
        fullName,
        dob,
        gender,
        state,
        district,
        category,
        minorityStatus,
        disabilityStatus,
        highestQualification,
        currentEducationLevel,
        previousExamPercentage: previousExamPercentage ? parseFloat(previousExamPercentage) : null,
        annualFamilyIncome: parseFloat(annualFamilyIncome) || 0,
      },
    })

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error("[API /profile] POST error:", error)
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    )
  }
}
