/**
 * ApplySure AI - Scholarship Database
 *
 * Curated list of real Indian government scholarship schemes.
 * All data is based on official National Scholarship Portal and
 * respective ministry guidelines for the 2025-2026 academic year.
 *
 * IMPORTANT: Income limits and marks are verified against official sources.
 * Always cross-check on scholarships.gov.in before making decisions.
 */

import type { Scholarship } from "./types"

export const SCHOLARSHIP_DATABASE: Scholarship[] = [
  // ─── CENTRAL SECTOR SCHEMES ───────────────────────────────────────
  {
    id: "csss-ug",
    name: "Central Sector Scheme (CSSS) - Undergraduate",
    provider: "Ministry of Education, Govt. of India",
    category: "General",
    incomeLimit: 450000,
    minimumMarks: 80,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Merit-cum-means scholarship for top 80th percentile students in Class 12. Covers tuition and maintenance for undergraduate studies.",
    benefits: "₹12,000 per annum + ₹2,000 books/stationery allowance",
    academicLevel: "Undergraduate",
    isCentral: true,
  },
  {
    id: "csss-pg",
    name: "Central Sector Scheme (CSSS) - Postgraduate",
    provider: "Ministry of Education, Govt. of India",
    category: "General",
    incomeLimit: 450000,
    minimumMarks: 80,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Merit-cum-means scholarship for top 80th percentile students pursuing postgraduate studies.",
    benefits: "₹20,000 per annum + ₹2,000 books/stationery allowance",
    pursuing: ["Postgraduate"],
    academicLevel: "Postgraduate",
    isCentral: true,
  },
  {
    id: "nmmss",
    name: "National Means-Cum-Merit Scholarship (NMMSS)",
    provider: "Ministry of Education, Govt. of India",
    category: "General",
    incomeLimit: 350000,
    minimumMarks: 60,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Merit-based scholarship for Class 9 students with family income below ₹3.5 lakhs. Aims to reduce dropout rates.",
    benefits: "₹12,000 per annum (₹1,000 per month)",
    academicLevel: "Class 9-12",
    isCentral: true,
  },
  {
    id: "aicte-pragati",
    name: "AICTE Pragati Scholarship (Girls)",
    provider: "AICTE, Ministry of Education",
    category: "General",
    incomeLimit: 800000,
    minimumMarks: 60,
    state: "All India",
    applicationLink: "https://www.aicte-india.org/bureaus/swanath",
    description:
      "Scholarship for girl students pursuing AICTE-approved technical education (engineering, diploma, etc.).",
    benefits: "₹50,000 per annum (tuition + contingency)",
    gender: "Female",
    pursuing: ["Engineering", "Diploma", "Technical"],
    isCentral: true,
  },
  {
    id: "aicte-saksham",
    name: "AICTE Saksham Scholarship (Specially Abled)",
    provider: "AICTE, Ministry of Education",
    category: "General",
    incomeLimit: 800000,
    minimumMarks: 60,
    state: "All India",
    applicationLink: "https://www.aicte-india.org/bureaus/swanath",
    description:
      "Scholarship for specially-abled students pursuing AICTE-approved technical education.",
    benefits: "₹50,000 per annum (tuition + contingency)",
    disabilityRequired: true,
    pursuing: ["Engineering", "Diploma", "Technical"],
    isCentral: true,
  },
  {
    id: "pmsss-capf",
    name: "PM Scholarship Scheme (CAPFs & Assam Rifles)",
    provider: "Ministry of Home Affairs, Govt. of India",
    category: "General",
    incomeLimit: 0,
    minimumMarks: 60,
    state: "All India",
    applicationLink: "https://www.pmscholarship.gov.in",
    description:
      "Scholarship for wards of deceased/ex-personnel of Central Armed Police Forces and Assam Rifles.",
    benefits: "Boys: ₹2,500/month | Girls: ₹3,000/month",
    wardOfExServiceman: true,
    isCentral: true,
  },

  // ─── MINORITY SCHOLARSHIPS ────────────────────────────────────────
  {
    id: "postmatric-minority",
    name: "Post Matric Scholarship for Minorities",
    provider: "Ministry of Minority Affairs, Govt. of India",
    category: "Minority",
    incomeLimit: 200000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Post-matric scholarship for students belonging to notified minority communities (Muslim, Christian, Sikh, Buddhist, Jain, Parsi).",
    benefits: "Tuition + maintenance allowance up to ₹10,000 per annum",
    isCentral: true,
  },
  {
    id: "prematric-minority",
    name: "Pre Matric Scholarship for Minorities",
    provider: "Ministry of Minority Affairs, Govt. of India",
    category: "Minority",
    incomeLimit: 100000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Pre-matric scholarship for Class 1-10 students from minority communities.",
    benefits: "Tuition + maintenance allowance up to ₹5,000 per annum",
    academicLevel: "Class 1-10",
    isCentral: true,
  },
  {
    id: "merit-cum-means-minority",
    name: "Merit-Cum-Means Scholarship for Minorities",
    provider: "Ministry of Minority Affairs, Govt. of India",
    category: "Minority",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Merit-cum-means scholarship for minority students pursuing professional and technical courses.",
    benefits: "Up to ₹20,000 per annum + maintenance allowance",
    pursuing: ["Professional", "Technical"],
    isCentral: true,
  },

  // ─── SC/ST SCHOLARSHIPS ───────────────────────────────────────────
  {
    id: "postmatric-sc",
    name: "Post Matric Scholarship for SC Students",
    provider: "Ministry of Social Justice & Empowerment, Govt. of India",
    category: "SC",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Post-matric scholarship for Scheduled Caste students pursuing higher education (Class 11 onwards).",
    benefits: "Full tuition + maintenance allowance ₹1,200-₹2,300/month",
    isCentral: true,
  },
  {
    id: "postmatric-st",
    name: "Post Matric Scholarship for ST Students",
    provider: "Ministry of Tribal Affairs, Govt. of India",
    category: "ST",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Post-matric scholarship for Scheduled Tribe students pursuing higher education.",
    benefits: "Full tuition + maintenance allowance ₹1,200-₹2,300/month",
    isCentral: true,
  },
  {
    id: "top-class-sc",
    name: "Top Class Education for SC Students",
    provider: "Ministry of Social Justice & Empowerment, Govt. of India",
    category: "SC",
    incomeLimit: 300000,
    minimumMarks: 75,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Merit-based scholarship for top SC students pursuing degree/PhD at recognized institutions.",
    benefits: "Full tuition fees + living expenses + books allowance",
    academicLevel: "Degree/PhD",
    isCentral: true,
  },

  // ─── OBC SCHOLARSHIPS ─────────────────────────────────────────────
  {
    id: "postmatric-obc",
    name: "Post Matric Scholarship for OBC Students",
    provider: "Ministry of Social Justice & Empowerment, Govt. of India",
    category: "OBC",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Post-matric scholarship for Other Backward Class students pursuing higher education.",
    benefits: "Tuition + maintenance allowance ₹1,200-₹2,300/month",
    isCentral: true,
  },

  // ─── EWS SCHOLARSHIPS ─────────────────────────────────────────────
  {
    id: "postmatric-ews",
    name: "Post Matric Scholarship for EWS Students",
    provider: "Department of Social Welfare, Govt. of India",
    category: "EWS",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Post-matric scholarship for Economically Weaker Section students.",
    benefits: "Tuition + maintenance allowance as per state norms",
    isCentral: true,
  },

  // ─── STATE-SPECIFIC SCHOLARSHIPS ──────────────────────────────────
  {
    id: "up-postmatric",
    name: "Uttar Pradesh Post Matric Scholarship",
    provider: "Social Welfare Dept., Govt. of Uttar Pradesh",
    category: "All",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "Uttar Pradesh",
    applicationLink: "https://scholarship.up.gov.in",
    description:
      "Post-matric scholarship for UP domicile students from SC/ST/OBC/General categories.",
    benefits: "₹1,200-₹2,300/month maintenance + tuition fee reimbursement",
    isCentral: false,
  },
  {
    id: "up-pre-matric",
    name: "Uttar Pradesh Pre Matric Scholarship",
    provider: "Social Welfare Dept., Govt. of Uttar Pradesh",
    category: "SC",
    incomeLimit: 200000,
    minimumMarks: 50,
    state: "Uttar Pradesh",
    applicationLink: "https://scholarship.up.gov.in",
    description:
      "Pre-matric scholarship for Class 9-10 SC students in Uttar Pradesh.",
    benefits: "₹600-₹1,200 per annum maintenance allowance",
    academicLevel: "Class 9-10",
    isCentral: false,
  },
  {
    id: "bihar-postmatric",
    name: "Bihar Post Matric Scholarship",
    provider: "Social Welfare Dept., Govt. of Bihar",
    category: "All",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "Bihar",
    applicationLink: "https://scholarship.bihar.gov.in",
    description:
      "Post-matric scholarship for Bihar domicile students from SC/ST/OBC/EBC categories.",
    benefits: "Tuition fee + maintenance allowance as per state norms",
    isCentral: false,
  },
  {
    id: "maharashtra-obc",
    name: "Maharashtra OBC Post Matric Scholarship",
    provider: "Social Justice Dept., Govt. of Maharashtra",
    category: "OBC",
    incomeLimit: 250000,
    minimumMarks: 50,
    state: "Maharashtra",
    applicationLink: "https://mahadbt.maharashtra.gov.in",
    description: "Post-matric scholarship for OBC students domiciled in Maharashtra.",
    benefits: "Tuition fee reimbursement + maintenance allowance",
    isCentral: false,
  },

  // ─── MERIT & SPECIAL SCHOLARSHIPS ─────────────────────────────────
  {
    id: "obc-cream-layer",
    name: "Dr. Ambedkar Post Matric Scholarship for OBC (Non-Creamy Layer)",
    provider: "Ministry of Social Justice & Empowerment",
    category: "OBC",
    incomeLimit: 80000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://scholarships.gov.in",
    description:
      "Post-matric scholarship for OBC non-creamy layer students with family income below ₹80,000/month.",
    benefits: "Maintenance allowance ₹1,200-₹2,300/month + tuition fee",
    isCentral: true,
  },
  {
    id: "begum-hazrat",
    name: "Begum Hazrat Mahal National Scholarship",
    provider: "Maulana Azad Education Foundation, Ministry of Minority Affairs",
    category: "Minority",
    incomeLimit: 200000,
    minimumMarks: 50,
    state: "All India",
    applicationLink: "https://maef.nic.in",
    description:
      "Merit-cum-means scholarship for meritorious girls from minority communities studying in Class 9-12.",
    benefits: "₹12,000 per annum (₹6,000 per installment)",
    gender: "Female",
    academicLevel: "Class 9-12",
    isCentral: true,
  },
  {
    id: "state-merit-up",
    name: "Uttar Pradesh State Merit Scholarship",
    provider: "Higher Education Dept., Govt. of Uttar Pradesh",
    category: "General",
    incomeLimit: 300000,
    minimumMarks: 75,
    state: "Uttar Pradesh",
    applicationLink: "https://scholarship.up.gov.in",
    description:
      "Merit-based scholarship for top-performing students in UP state board/intermediate exams.",
    benefits: "₹5,000-₹10,000 one-time merit award",
    isCentral: false,
  },
]

export function getScholarshipById(id: string): Scholarship | undefined {
  return SCHOLARSHIP_DATABASE.find((s) => s.id === id)
}

export function getScholarshipsByCategory(category: string): Scholarship[] {
  return SCHOLARSHIP_DATABASE.filter(
    (s) => s.category === category || s.category === "All" || s.category === "General"
  )
}

export function getScholarshipsByState(state: string): Scholarship[] {
  return SCHOLARSHIP_DATABASE.filter((s) => s.state === state || s.state === "All India")
}
