/**
 * Shared API types for ClinicalRxQ
 * - Centralizes runtime classes (ApiError) and TypeScript interfaces used across the app.
 * - Consumed by API layer, pages, and UI components.
 */

//////////////////////////////
// Errors
//////////////////////////////

/**
 * Generic API error with HTTP-ish status and a short error code.
 */
export class ApiError extends Error {
  /** HTTP-like status code */
  status: number
  /** Machine-readable short code (e.g., CONFIG_ERROR, NOT_FOUND) */
  code: string

  /**
   * Create an ApiError
   * @param message User-friendly message
   * @param status Numeric status (default 500)
   * @param code Short identifier for programmatic handling
   */
  constructor(message: string, status = 500, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

//////////////////////////////
// Auth
//////////////////////////////

/**
 * Minimal shape for login request
 */
export interface LoginPayload {
  email: string
  password: string
}

/**
 * Member account information stored client-side
 */
export interface MemberAccount {
  id: string
  pharmacyName: string
  email: string
  /** Subscription badge text; UI expects 'Active' | 'Expiring' | 'Trial' etc. */
  subscriptionStatus?: 'Active' | 'Expiring' | 'Trial' | 'Expired' | string
  /** ISO string used in dashboard headers */
  lastLoginISO?: string
}

/**
 * Auth response returned by Api.login and loaded from storage
 */
export interface AuthResponse {
  token: string
  member: MemberAccount
}

//////////////////////////////
// Domain: Programs and Resources
//////////////////////////////

/**
 * Known clinical program slugs in the system
 */
export type ProgramSlug = 'tmm' | 'mtmtft' | 'tnt' | 'a1c' | 'oc'

/**
 * Resource types supported in the library
 */
export type ResourceType =
  | 'Documentation Forms'
  | 'Clinical Resources'
  | 'Patient Handouts'
  | 'Protocols'
  | 'Training Materials'
  | 'Medical Billing'
  | 'Additional Resources'

/**
 * Single resource item mapped from Supabase storage
 */
export interface ResourceItem {
  /** Stable id; for catalog rows this is the row UUID, else path fallback */
  id: string
  /** Display name without extension */
  name: string
  /** Clinical program association or 'general' */
  program?: ProgramSlug | 'general'
  /** Resource classification */
  type: ResourceType
  /** Optional derived category from folder path */
  category?: string
  /** Optional tags (future) */
  tags?: string[]
  /** Public file URL for download/view */
  fileUrl?: string
  /** Approx size (MB) if available */
  sizeMB?: number
  /** ISO date of last update if available */
  lastUpdatedISO?: string
  /** Download counter if tracked server-side */
  downloadCount?: number
  /** Client-side bookmark flag (persisted locally) */
  bookmarked?: boolean
}

/**
 * Filters used client-side for search and refinement
 * - Some fields are UI-only (e.g., medicalCondition) and ignored by API filtering.
 */
export interface ResourceFilters {
  program?: ProgramSlug | 'general' | Array<ProgramSlug | 'general'>
  type?: ResourceType | ResourceType[]
  category?: string
  tags?: string[]
  search?: string
  sortBy?: 'name' | 'lastUpdated' | 'downloadCount' | 'category'
  sortOrder?: 'asc' | 'desc'
  offset?: number
  limit?: number
  /** UI-only: medical conditions chips */
  medicalCondition?: string[]
}

/**
 * Clinical program summary for Programs and Dashboard
 */
export interface ClinicalProgram {
  slug: ProgramSlug
  name: string
  description: string
  /** Lucide icon name, e.g., 'CalendarCheck' */
  icon: string
  resourceCount?: number
  lastUpdatedISO?: string
  downloadCount?: number
}

//////////////////////////////
// Dashboard Surfaces
//////////////////////////////

/**
 * Quick action item for dashboard cards
 */
export interface QuickAccessItem {
  id: string
  title: string
  /** Lucide icon name */
  icon: string
  /** CTA distinguishes Download vs Watch UI */
  cta: 'Download' | 'Watch'
  /** Optional target URL */
  url?: string
}

/**
 * Recently accessed resource entry
 */
export interface RecentActivity {
  id: string
  name: string
  program?: ProgramSlug | 'general'
  accessedAtISO: string
  /** Optional deep link */
  url?: string
}

/**
 * Announcement / update item
 */
export interface Announcement {
  id: string
  title: string
  body: string
  dateISO: string
}
