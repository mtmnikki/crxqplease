/** 
 * Supabase Storage service (REST only, no SDK)
 * - Prefers storage_files_catalog table (fast, reliable).
 * - Falls back to:
 *    1) list_all_files RPC (if present)
 *    2) Direct Storage REST traversal (recursive)
 *
 * Mapping:
 * - Converts rows into ResourceItem, deriving program/type/category from file_path.
 * - Uses enriched catalog columns: program_name, category, subcategory, tags when available.
 *
 * Env:
 * - VITE_SUPABASE_URL (override)
 * - VITE_SUPABASE_ANON_KEY (override)
 * Defaults baked in to ensure plug-and-play.
 */

import { ClinicalProgram, ProgramSlug, ResourceItem, ResourceType } from '../api/types'
import { programNameToSlug } from '../api/utils'

/** Read Vite env safely in esbuild */
function env() {
  try {
    return (import.meta as any).env || {}
  } catch {
    return {}
  }
}

/** Supabase config
 * - Hard-coded defaults provided by client (anon key)
 * - Still overridable via Vite env vars if present
 */
const DEFAULT_SUPABASE_URL = 'https://xeyfhlmflsibxzjsirav.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleWZobG1mbHNpYnh6anNpcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5Mjg5ODQsImV4cCI6MjA2OTUwNDk4NH0._wwYVbBmqX26WpbBnPMuuSmUTGG-XhxDwg8vkUS_n8Y'

const SUPABASE_URL = String((env() as any).VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL)
const SUPABASE_ANON_KEY = String((env() as any).VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY)
const BUCKET = 'clinicalrxqfiles'

/** Minimal guard to ensure env presence */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY)
}

/** Shape returned by your list_all_files RPC */
interface RpcFileRow {
  /** Full path within the bucket */
  path: string
  /** Basename of the object */
  name: string
  /** Unique id (object id or path fallback) */
  id: string
  /** Optional direct URL if known (catalog rows) */
  file_url?: string
  /** Optional metadata from storage or catalog */
  metadata?: any
  /** Optional enriched fields from catalog */
  program_name?: string | null
  category?: string | null
  subcategory?: string | null
  tags?: string[] | null
}

/** Storage list item shape (REST) */
interface StorageListItem {
  name: string
  id?: string | null
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?:
    | {
        size?: number
        mimetype?: string
        cacheControl?: string
      }
    | null
}

/** Catalog row shape (PostgREST) */
interface CatalogRow {
  id: string
  bucket_name: string
  file_name: string
  file_path: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  last_modified: string | null
  created_at?: string | null
  updated_at?: string | null
  // Optional new columns from your SQL migration
  program_name?: string | null
  category?: string | null
  subcategory?: string | null
  tags?: string[] | null
}

/**
 * Get rows from storage_files_catalog via REST (preferred).
 * Requires RLS to allow anon read or service role; uses anon key here.
 */
async function catalogListAllFiles(): Promise<RpcFileRow[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  const url = `${SUPABASE_URL}/rest/v1/storage_files_catalog?select=*`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Supabase catalog error ${res.status}: ${detail || res.statusText}`)
  }
  const rows = (await res.json()) as CatalogRow[]
  if (!Array.isArray(rows)) return []

  // Map catalog rows to RpcFileRow shape
  const mapped: RpcFileRow[] = rows
    .filter((r) => r.bucket_name === BUCKET) // ensure only our bucket
    .map((r) => ({
      path: r.file_path.replace(/^\/+/, ''), // normalize
      name: r.file_name || r.file_path.split('/').pop() || 'Resource',
      id: r.id,
      file_url: r.file_url || undefined,
      metadata: {
        size: r.file_size || undefined,
        mimetype: r.mime_type || undefined,
        lastModified: r.last_modified || undefined,
        created_at: r.created_at || undefined,
        updated_at: r.updated_at || undefined,
      },
      // propagate new columns so downstream mapping can use them
      program_name: r.program_name ?? null,
      category: r.category ?? null,
      subcategory: r.subcategory ?? null,
      tags: r.tags ?? null,
    }))

  return mapped
}

/**
 * Call the RPC to list all files in the target bucket.
 * Note: This requires your list_all_files RPC to be deployed on Supabase.
 */
export async function rpcListAllFiles(): Promise<RpcFileRow[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  const url = `${SUPABASE_URL}/rest/v1/rpc/list_all_files`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bucket_name: BUCKET }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Supabase RPC error ${res.status}: ${detail || res.statusText}`)
  }

  const data = (await res.json()) as RpcFileRow[]
  return Array.isArray(data) ? data : []
}

/**
 * REST: list objects in a prefix (no SDK).
 * Uses POST /storage/v1/object/list/{bucket} with prefix and returns entries.
 */
async function restList(prefix = ''): Promise<StorageListItem[]> {
  const url = `${SUPABASE_URL}/storage/v1/object/list/${encodeURIComponent(BUCKET)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Supabase Storage list error ${res.status}: ${detail || res.statusText}`)
  }
  const data = (await res.json()) as StorageListItem[]
  return Array.isArray(data) ? data : []
}

/**
 * Determine whether a list item is a folder or a file using best-effort heuristics.
 */
function isFolderEntry(it: StorageListItem): boolean {
  // Folders usually have null/absent metadata and often missing id
  const hasMeta = !!it.metadata && (typeof it.metadata.size === 'number' || !!(it.metadata as any).mimetype)
  // If metadata indicates a mimetype or size, it's a file
  if (hasMeta) return false
  // If the name clearly has a file extension, treat as file
  if (/\.[a-z0-9]{2,6}$/i.test(it.name)) return false
  // Otherwise, treat as folder
  return true
}

/**
 * Recursively list all files under a prefix using REST storage API.
 * Returns rows compatible with RpcFileRow.
 */
async function restListAllFilesRecursive(prefix = ''): Promise<RpcFileRow[]> {
  const entries = await restList(prefix)
  const out: RpcFileRow[] = []

  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (isFolderEntry(entry)) {
      const children = await restListAllFilesRecursive(path)
      out.push(...children)
    } else {
      out.push({
        path,
        name: entry.name,
        id: String(entry.id || path), // Fallback to path as ID if id is missing
        metadata: entry.metadata || {},
      })
    }
  }

  return out
}

/**
 * Load all files:
 * 1) Try catalog table (preferred, fastest)
 * 2) Try RPC (if deployed)
 * 3) Fallback to REST traversal
 */
async function listAllFiles(): Promise<RpcFileRow[]> {
  try {
    const catalog = await catalogListAllFiles()
    if (catalog.length) return catalog
  } catch (e) {
    console.warn('Catalog read failed; continuing to RPC/REST:', e)
  }

  try {
    return await rpcListAllFiles()
  } catch (e) {
    console.warn('RPC list_all_files failed; falling back to REST listing:', e)
    return await restListAllFilesRecursive('')
  }
}

/** Canonical mapping for program display and icon */
const programMeta: Record<
  ProgramSlug,
  Pick<ClinicalProgram, 'name' | 'description' | 'icon'>
> = {
  tmm: {
    name: 'MedSync: TimeMyMeds',
    description: 'Create predictable appointment schedules to enable clinical service delivery.',
    icon: 'CalendarCheck',
  },
  mtmtft: {
    name: 'MTM The Future Today',
    description: 'Team-based MTM with CMR forms, flowsheets, and protocols.',
    icon: 'Pill',
  },
  tnt: {
    name: 'Test and Treat: Strep, Flu, COVID',
    description: 'Point-of-care testing and treatment protocols for infectious diseases.',
    icon: 'TestTube2',
  },
  a1c: {
    name: 'HbA1C Testing',
    description: 'In-pharmacy glycemic control testing with counseling and billing support.',
    icon: 'ActivitySquare',
  },
  oc: {
    name: 'Oral Contraceptives',
    description: 'Pharmacist-prescribed contraceptive services and embedded forms.',
    icon: 'Stethoscope',
  },
}

/**
 * Derive ProgramSlug from path tokens or metadata.
 * Supports your real top-level program folders and preview convention.
 */
function deriveProgramFromPath(tokens: string[], md?: any): ProgramSlug | 'general' {
  // Prefer explicit metadata
  const metaProgram = (md?.program || md?.Program || '').toString().toLowerCase()
  if (metaProgram && ['tmm', 'mtmtft', 'tnt', 'a1c', 'oc'].includes(metaProgram)) {
    return metaProgram as ProgramSlug
  }

  // Map your real top-level program folders
  const top = (tokens[0] || '').toLowerCase()
  const topToProgram: Record<string, ProgramSlug> = {
    mtmthefuturetoday: 'mtmtft',
    timemymeds: 'tmm',
    testandtreat: 'tnt',
    hba1c: 'a1c',
    oralcontraceptives: 'oc',
  }
  if (topToProgram[top]) return topToProgram[top]

  // Old preview convention support (programs/{slug}/...)
  if (top === 'programs' && tokens.length >= 2) {
    const slug = (tokens[1] || '').toLowerCase()
    if (['tmm', 'mtmtft', 'tnt', 'a1c', 'oc'].includes(slug)) return slug as ProgramSlug
  }

  // General libraries default
  return 'general'
}

/** Create a public URL for a given object path (bucket is public) */
export function publicUrlFor(path: string): string {
  const cleanPath = path.replace(/^\/+/, '')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURI(cleanPath)}`
}

/**
 * Map special folder tokens to friendly labels; then titleize.
 */
function prettifyToken(token?: string): string | undefined {
  if (!token) return undefined
  const key = token.toLowerCase()
  const specials: Record<string, string> = {
    // Program-specific
    medflowsheets: 'Medical Condition Flowsheets',
    outcomestip: 'Outcomes TIP Forms',
    prescribercomm: 'Prescriber Communication Forms',
    druginteractions: 'Drug Interactions',
    needsdrugtherapy: 'Needs Drug Therapy',
    optimizemedicationtherapy: 'Optimize Medication Therapy',
    suboptimaldrugselection_hrm: 'Suboptimal Drug Selection (HRM)',
    utilityforms: 'Utility Forms',
    // General libraries
    cardiovascularconditions: 'Cardiovascular Conditions',
    infectionsdisease: 'Infectious Disease',
    painandopioids: 'Pain and Opioids',
    psychologicalconditions: 'Psychological Conditions',
    zonetools: 'Zone Tools',
  }
  if (specials[key]) return specials[key]

  // Insert spaces before capitals, replace separators, title case
  const spaced = token
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()

  return spaced.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

/**
 * Determine ResourceType and category based on your folder layout.
 * - Program folders: mtmthefuturetoday | timemymeds | testandtreat | hba1c | oralcontraceptives
 *   - Subfolders: forms | protocols | resources | training
 * - General folders: clinicalguidelines | patienthandouts | medicalbilling
 */
function deriveTypeAndCategory(tokens: string[]): { type: ResourceType; category?: string } {
  // General libraries
  const lower = tokens.map((t) => (t || '').toLowerCase())
  const top = lower[0]

  if (top === 'patienthandouts') {
    const categoryPath = tokens.slice(1, Math.max(1, tokens.length - 1))
    const category = categoryPath.length ? categoryPath.map(prettifyToken).filter(Boolean).join(' / ') : undefined
    return { type: 'Patient Handouts', category }
  }
  if (top === 'clinicalguidelines') {
    const categoryPath = tokens.slice(1, Math.max(1, tokens.length - 1))
    const category = categoryPath.length ? categoryPath.map(prettifyToken).filter(Boolean).join(' / ') : undefined
    return { type: 'Clinical Resources', category }
  }
  if (top === 'medicalbilling') {
    const categoryPath = tokens.slice(1, Math.max(1, tokens.length - 1))
    const category = categoryPath.length ? categoryPath.map(prettifyToken).filter(Boolean).join(' / ') : undefined
    return { type: 'Medical Billing', category }
  }

  // Program-specific: look for type folder after top
  const typeFolders: Record<string, ResourceType> = {
    forms: 'Documentation Forms',
    protocols: 'Protocols',
    resources: 'Clinical Resources',
    training: 'Training Materials',
  }

  let typeIdx = -1
  let type: ResourceType = 'Additional Resources'
  for (let i = 1; i < lower.length; i++) {
    const folder = lower[i]
    if (typeFolders[folder as keyof typeof typeFolders]) {
      type = typeFolders[folder]
      typeIdx = i
      break
    }
  }

  // Category: after the type folder, excluding the filename
  const categoryPath = typeIdx >= 0 ? tokens.slice(typeIdx + 1, Math.max(typeIdx + 1, tokens.length - 1)) : []
  const category = categoryPath.length ? categoryPath.map(prettifyToken).filter(Boolean).join(' / ') : undefined

  return { type, category }
}

/** Remove common extensions from the display name */
function displayName(name: string): string {
  return name.replace(/\.(pdf|mp4|pptx(?:\.mp4)?|png|jpg|jpeg|docx)$/i, '')
}

/**
 * Convert a storage object row into ResourceItem.
 * Supports your real paths and the earlier preview convention.
 * Accepts:
 * - RpcFileRow from catalog (has file_url, metadata.size/lastModified, program_name/category/subcategory/tags)
 * - RpcFileRow from RPC/REST (has path/name/metadata)
 */
export function toResourceItem(row: RpcFileRow): ResourceItem {
  const tokens = (row.path || '').split('/').filter(Boolean)

  // Prefer catalog-provided program_name; fall back to path inference
  let program: ProgramSlug | 'general' = 'general'
  if (row.program_name) {
    program = programNameToSlug(row.program_name)
  } else {
    program = deriveProgramFromPath(tokens, row.metadata)
  }

  const { type, category } = deriveTypeAndCategory(tokens)
  // Prefer catalog subcategory as the display category if available
  const displayCategory = row.subcategory ? prettifyToken(row.subcategory) : category

  // Size (MB) if provided in metadata
  const sz = Number(row.metadata?.size || (row.metadata as any)?.Size || 0)
  const sizeMB = sz ? +(sz / (1024 * 1024)).toFixed(2) : undefined

  const item: ResourceItem = {
    id: row.id,
    name: displayName(row.name || tokens[tokens.length - 1] || 'Resource'),
    program,
    type,
    category: displayCategory,
    tags: row.tags || undefined,
    // Prefer catalog's direct URL if provided, else construct public URL
    fileUrl: row.file_url ? row.file_url : publicUrlFor(row.path),
    sizeMB,
    lastUpdatedISO:
      row.metadata?.lastModified || row.metadata?.updated_at || row.metadata?.created_at || undefined,
    downloadCount: undefined,
    bookmarked: false,
  }
  return item
}

/**
 * Load all resources from Supabase (catalog → RPC → REST).
 * Returns a normalized list suitable for the UI.
 */
export async function fetchAllResources(): Promise<ResourceItem[]> {
  const rows = await listAllFiles()
  const items = rows.map(toResourceItem)
  return items
}

/**
 * Search resources using the database function search_content (if present).
 * Falls back to empty results on error (caller may merge with client-side search).
 */
export async function searchResourcesInCatalog(term: string): Promise<ResourceItem[]> {
  if (!isSupabaseConfigured()) return []
  if (!term || !term.trim()) return []
  const url = `${SUPABASE_URL}/rest/v1/rpc/search_content`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ search_term: term }),
    })
    if (!res.ok) {
      // If the function is missing or blocked by RLS, fail soft
      return []
    }
    const data = (await res.json()) as Array<{
      id: string
      file_name: string
      file_path: string
      file_url: string
      category: string | null
      program_name: string | null
      subcategory: string | null
      media_type: string | null
      relevance_score: number
    }>

    const rows: RpcFileRow[] = (data || []).map((r) => ({
      id: r.id,
      name: r.file_name,
      path: (r.file_path || '').replace(/^\/+/, ''),
      file_url: r.file_url,
      metadata: {}, // minimal; catalog already gives us URL and names
      program_name: r.program_name,
      category: r.category,
      subcategory: r.subcategory,
    }))

    return rows.map(toResourceItem)
  } catch {
    return []
  }
}

/**
 * Build ClinicalProgram list by deriving from resources.
 * If a slug has zero files it won't appear.
 */
export async function derivePrograms(): Promise<ClinicalProgram[]> {
  const items = await fetchAllResources()
  const bySlug = new Map<ProgramSlug, number>()

  for (const it of items) {
    if (it.program && it.program !== 'general') {
      const slug = it.program as ProgramSlug
      bySlug.set(slug, (bySlug.get(slug) || 0) + 1)
    }
  }

  const out: ClinicalProgram[] = []
  for (const [slug, count] of bySlug.entries()) {
    const base = programMeta[slug]
    out.push({
      slug,
      name: base?.name || slug.toUpperCase(),
      description: base?.description || '',
      icon: base?.icon || 'Layers',
      resourceCount: count,
      lastUpdatedISO: undefined,
      downloadCount: undefined,
    })
  }

  // Stable order by slug for consistent UI
  out.sort((a, b) => a.slug.localeCompare(b.slug))
  return out
}
