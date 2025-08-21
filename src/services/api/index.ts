/**
 * API client (Supabase-backed)
 * - Replaces Airtable with Supabase Storage + REST RPC.
 * - No Supabase SDK required; uses fetch to call your RPC and public object URLs.
 * - Auth: temporary local stub to preserve current UX until Supabase Auth is added.
 */

import {
  ApiError,
  Announcement,
  AuthResponse,
  ClinicalProgram,
  LoginPayload,
  MemberAccount,
  ProgramSlug,
  QuickAccessItem,
  RecentActivity,
  ResourceFilters,
  ResourceItem,
} from './types'
import {
  derivePrograms,
  fetchAllResources,
  isSupabaseConfigured,
} from '../supabase/storage'

/** Local storage keys (UI persistence) */
const LS_TOKEN = 'crxq_token'
const LS_MEMBER = 'crxq_member'
const LS_LOGIN_ATTEMPTS = 'crxq_login_attempts'
const LS_BOOKMARKS = 'crxq_bookmarks'

/** Tiny delay helper */
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms))

/** Bookmark helpers */
function getBookmarkSet(): Set<string> {
  const raw = localStorage.getItem(LS_BOOKMARKS)
  return new Set(raw ? (JSON.parse(raw) as string[]) : [])
}
function setBookmarkSet(set: Set<string>) {
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(Array.from(set)))
}

/**
 * TEMP auth stub:
 * - Accepts any email/password >= 8 chars.
 * - Stores a MemberAccount in localStorage.
 * NOTE: Will be replaced by Supabase Auth after @supabase/supabase-js is added.
 */
async function stubLogin(payload: LoginPayload): Promise<AuthResponse> {
  const attempts = Number(localStorage.getItem(LS_LOGIN_ATTEMPTS) || '0')
  if (attempts >= 5) throw new ApiError('Too many attempts. Please try again later.', 429, 'RATE_LIMIT')

  // Minimal validation to prevent accidental empty login
  if (!payload.email || !/\S+@\S+\.\S+/.test(payload.email) || !payload.password || payload.password.length < 8) {
    localStorage.setItem(LS_LOGIN_ATTEMPTS, String(attempts + 1))
    throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  const member: MemberAccount = {
    id: 'mem_local_' + Math.random().toString(36).slice(2),
    pharmacyName: 'ClinicalRxQ Member',
    email: payload.email,
    subscriptionStatus: 'Active',
    lastLoginISO: new Date().toISOString(),
  }
  const token = 'supabase-local-stub-token'
  localStorage.setItem(LS_TOKEN, token)
  localStorage.setItem(LS_MEMBER, JSON.stringify(member))
  localStorage.setItem(LS_LOGIN_ATTEMPTS, '0')
  return { token, member }
}

/** Logout stub (clears local storage) */
async function stubLogout(): Promise<void> {
  await wait(60)
  localStorage.removeItem(LS_TOKEN)
  localStorage.removeItem(LS_MEMBER)
}

/** Apply client-side filters similar to prior behavior */
function applyResourceFilters(list: ResourceItem[], filters: Partial<ResourceFilters> = {}): ResourceItem[] {
  let out = list.slice()

  // Program filter (string or array)
  if (filters.program) {
    const programs = Array.isArray(filters.program) ? filters.program : [filters.program]
    out = out.filter((r) => programs.includes(r.program || 'general'))
  }

  // Type filter (string or array)
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type]
    out = out.filter((r) => types.includes(r.type))
  }

  // Category filter
  if (filters.category) {
    out = out.filter((r) => r.category === filters.category)
  }

  // Tags filter
  if (filters.tags && filters.tags.length) {
    out = out.filter((r) => {
      const tags = r.tags || []
      return filters.tags!.every((t) => tags.includes(t))
    })
  }

  // Search (name, path-derived category, tags)
  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    out = out.filter((r) => {
      const name = r.name.toLowerCase()
      const cat = (r.category || '').toLowerCase()
      const tags = (r.tags || []).join(' ').toLowerCase()
      return name.includes(q) || cat.includes(q) || tags.includes(q)
    })
  }

  // Sorting
  const sortBy = filters.sortBy || 'name'
  const sortOrder = (filters.sortOrder || 'asc') === 'asc' ? 1 : -1
  out.sort((a, b) => {
    const aVal =
      sortBy === 'name'
        ? a.name
        : sortBy === 'lastUpdated'
        ? a.lastUpdatedISO || ''
        : sortBy === 'downloadCount'
        ? a.downloadCount || 0
        : sortBy === 'category'
        ? a.category || ''
        : a.name
    const bVal =
      sortBy === 'name'
        ? b.name
        : sortBy === 'lastUpdated'
        ? b.lastUpdatedISO || ''
        : sortBy === 'downloadCount'
        ? b.downloadCount || 0
        : sortBy === 'category'
        ? b.category || ''
        : b.name

    if (aVal < bVal) return -1 * sortOrder
    if (aVal > bVal) return 1 * sortOrder
    return 0
  })

  // Limit/offset
  if (typeof filters.offset === 'number' || typeof filters.limit === 'number') {
    const start = filters.offset || 0
    const end = start + (filters.limit || out.length)
    out = out.slice(start, end)
  }

  return out
}

export const Api = {
  /** Is Supabase configured via env? */
  isSupabaseConfigured(): boolean {
    return isSupabaseConfigured()
  },

  /** Auth: temporary local stub; will switch to Supabase Auth later */
  async login(payload: LoginPayload) {
    return stubLogin(payload)
  },
  async logout() {
    return stubLogout()
  },
  getStoredAuth(): AuthResponse | null {
    try {
      const token = localStorage.getItem(LS_TOKEN)
      const memberRaw = localStorage.getItem(LS_MEMBER)
      if (!token || !memberRaw) return null
      const member = JSON.parse(memberRaw) as MemberAccount
      return { token, member }
    } catch (error) {
      console.error('Error parsing stored auth:', error)
      return null
    }
  },

  /** Programs derived from storage structure */
  async getPrograms(): Promise<ClinicalProgram[]> {
    if (!isSupabaseConfigured()) {
      // Show empty list to avoid hard errors during local preview
      return []
    }
    return derivePrograms()
  },

  /** Documentation Forms for a specific program (based on folder/type) */
  async getProgramResources(slug: ProgramSlug): Promise<ResourceItem[]> {
    if (!isSupabaseConfigured()) return []
    const all = await fetchAllResources()
    return all.filter((r) => r.program === slug && r.type === 'Documentation Forms')
  },

  /** Resource library (client-side filtering over full list) */
  async getResources(filters?: Partial<ResourceFilters>): Promise<ResourceItem[]> {
    if (!isSupabaseConfigured()) return []
    const all = await fetchAllResources()
    return applyResourceFilters(all, filters || {})
  },

  /** Get one resource by id (scan list for V1; optimize with direct GET if needed) */
  async getResourceById(id: string): Promise<ResourceItem> {
    if (!isSupabaseConfigured()) {
      throw new ApiError('Supabase is not configured', 500, 'CONFIG_ERROR')
    }
    const all = await fetchAllResources()
    const found = all.find((r) => r.id === id)
    if (!found) throw new ApiError('Resource not found', 404, 'NOT_FOUND')
    return found
  },

  /** Bookmarks (client-only, persisted in localStorage) */
  async getBookmarkedResources(): Promise<ResourceItem[]> {
    if (!isSupabaseConfigured()) return []
    const set = getBookmarkSet()
    const list = await fetchAllResources()
    return list
      .map((r) => ({ ...r, bookmarked: set.has(r.id) || !!r.bookmarked }))
      .filter((r) => r.bookmarked)
  },
  async toggleBookmark(resourceId: string, value?: boolean) {
    const set = getBookmarkSet()
    const should = value ?? !set.has(resourceId)
    if (should) set.add(resourceId)
    else set.delete(resourceId)
    setBookmarkSet(set)
    return should
  },

  /** Optional dashboard surfaces (empty until implemented in Supabase) */
  async getQuickAccess(): Promise<QuickAccessItem[]> {
    return []
  },
  async getRecentActivity(): Promise<RecentActivity[]> {
    return []
  },
  async getAnnouncements(): Promise<Announcement[]> {
    return []
  },
}
