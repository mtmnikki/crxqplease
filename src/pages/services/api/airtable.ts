/**
 * Airtable API service (ClinicalRxQ Files base)
 * - Uses new Base ID and table/field IDs exactly as provided.
 * - Reads API key from environment only (AIRTABLE_API_KEY). No localStorage. No UI configurator.
 * - Uses returnFieldsByFieldId=true to address fields by ID (robust to renames).
 *
 * Tables (IDs):
 * - ClinicalPrograms: tblXsjw9EvEX1JnCy
 * - TrainingModules: tblrXWJ8gC6G3L2wG
 * - ProtocolManuals: tblh5Hqrd512J5C9e
 * - DocumentationForms: tblFahap8ERhQk0p5
 * - PatientHandouts: tblF0sNzTgGF4EBga
 * - ClinicalGuidelines: tblfIcFCFpVlOpsGr
 * - MedicalBilling: tbly4NjBbcptuc9G5
 * - AdditionalResources: tbldWUMJBg4nuq6rQ
 * - MemberAccounts: tblxoJz15zMr6CeeV
 */

import {
  ApiError,
  ResourceItem,
  ClinicalProgram,
  MemberAccount,
  ResourceFilters,
  ResourceType,
  ProgramSlug,
} from './types'

/** Get environment safely (supports esbuild) */
function safeEnv(): Record<string, any> | undefined {
  try {
    return (import.meta as any)?.env as Record<string, any>
  } catch {
    return undefined
  }
}

/** Pick an env var */
function envVar(name: string): string | undefined {
  const env = safeEnv()
  return env?.[name]
}

/** First attachment helper */
function firstAttachment(list: any): { url: string; sizeMB?: number } {
  if (!Array.isArray(list) || list.length === 0) return { url: '' }
  const att = list[0]
  const url = att?.url ? String(att.url) : ''
  const size = att?.size ? Number(att.size) : 0
  return { url, sizeMB: size ? +(size / (1024 * 1024)).toFixed(2) : undefined }
}

/** Icon by slug for program cards */
function iconBySlug(slug?: string): string {
  const s = (slug || '').toLowerCase()
  if (s === 'tmm') return 'CalendarCheck'
  if (s === 'mtmtft') return 'Pill'
  if (s === 'tnt') return 'TestTube2'
  if (s === 'a1c') return 'ActivitySquare'
  if (s === 'oc') return 'Stethoscope'
  return 'Layers'
}

/** Convert program name to slug */
function programNameToSlug(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('timemymeds')) return 'tmm'
  if (n.includes('mtm the future today')) return 'mtmtft'
  if (n.includes('test and treat')) return 'tnt'
  if (n.includes('hb') && n.includes('a1c')) return 'a1c'
  if (n.includes('oral') && n.includes('contracept')) return 'oc'
  return 'tmm'
}

/**
 * Airtable service bound to the provided base/schema.
 */
export class AirtableService {
  /** REST root */
  private readonly baseUrl = 'https://api.airtable.com/v0'
  /** Base ID (fixed per request) */
  private readonly baseId = 'appuo6esxsc55yCgI'

  /** Table IDs */
  private readonly tables = {
    members: 'tblsxymfQsAnyg5OU',
    resources: 'tbl5YcwOmdgIoENEJ',
    categories: 'tblPtUZITweN3sFeo',
    types: 'tblkijrEI0c3PFQTl',
    tags: 'tblluhBI8ly0XOz9e',
    programs: 'tblCTUDN0EQWo1jAl',
    metadata: 'tblMCdCwTTTfHUjJT',
  }

  /** Field IDs (by table) */
  private readonly fields = {
    members: {
      memberId: 'fldt373lT2Csq0KMy',
      temporaryPassword: 'fldoqhHg1qBHTlNTn',
      passwordHash: 'fldagPBaIbRqULk0k',
      firstName: 'fldpoepA2iuKekjDE',
      lastName: 'fldEDqwk2gJgguz25',
      email: 'fldxyBuc3P4lgQpMK',
      phone: 'fldpVsrOg4sjst1ew',
      registrationDate: 'fldIAfGWRamwffcs3',
      lastLogin: 'fldFVccUxi1YZ8OvM',
      subscriptionStatus: 'fldMd3K05w7QRjYYn',
      subscriptionStart: 'fld9XDu17YCcAAbkL',
      subscriptionEnd: 'fldvaosRlYc2XBAs6',
      pharmacyName: 'fldXXJl9XI1veGPJz',
      pharmacyPhone: 'fld6pTmlgWXKpiCju',
      pharmacyAddress: 'fldhzzP2uiR44ZWYS',
      pharmacyCity: 'fldtpbK7zqtxY4dQE',
      pharmacyState: 'fld5oyXUqePrqgTPE',
      pharmacyZip: 'fldiHKbGBw4Lldq7Y',
      techFirstName: 'fldv18qe2FXjYdlUM',
      techLastName: 'fldrXbYm7lcBodeAh',
    },
    resources: {
      resourceName: 'fld96lfnTpQr5YOCH',
      resourceFile: 'fldMvkoGkcFrDPWmM',
      tagName: 'fldztF4P701z94Jso',
      typeName: 'fldCJaJyo43FnTARk',
      clinicalgroupName: 'fldTXxfQcw4WJyY6Y',
      categoryName: 'fldyhCGGOspobh4vK',
      attachmentSummary: 'fldTrhbNqhZKd6rob',
      recordId: 'fldeZ9hwZBVJkei6W',
    },
    programs: {
      programName: 'fldcA9E0TK9mq3W7I',
      programDescription: 'fldLOY6tn3gpumgOY',
      experienceLevel: 'fldS5Yug9jIbGYY5I',
      programSummary: 'fld1LEc2OrpuTLcv3',
      sortOrder: 'fldRzkc9e3EeVMtS6',
      resourceNeedsAnalysis: 'fldGiZUckwFyDyiAb',
      linkedResourceId: 'fldcf1FvEfCohtawn',
      resources: 'fldOZnr2o8sX3ipes',
      linkedResources: 'fldAchLOKPP4qQ6wl',
      resourceName: 'fldX1W0DEKvZd35Od',
      resourceFile: 'fldTcFeoA1nEja6ET',
    },
  }

  /** API Key from environment only */
  private get apiKey(): string {
    const key = envVar('AIRTABLE_API_KEY')
    return key ? String(key) : ''
  }

  /** Is Airtable configured? */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * GET records with automatic pagination.
   * Uses returnFieldsByFieldId=true to access fields by ID consistently.
   */
  private async getRecords<T = any>(
    tableId: string,
    params: URLSearchParams = new URLSearchParams()
  ): Promise<Array<{ id: string; createdTime: string; fields: Record<string, any> }>> {
    if (!this.apiKey) throw new ApiError('AIRTABLE_API_KEY is not set', 500, 'CONFIG_ERROR')

    const out: Array<{ id: string; createdTime: string; fields: Record<string, any> }> = []
    let offset: string | undefined

    do {
      const p = new URLSearchParams(params.toString())
      p.set('returnFieldsByFieldId', 'true')
      if (offset) p.set('offset', offset)
      const url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(tableId)}?${p.toString()}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        let detail: any = null
        try {
          detail = await res.json()
        } catch {}
        if (res.status === 429) {
          const retry = Number(res.headers.get('Retry-After') || '1')
          await new Promise((r) => setTimeout(r, retry * 1000))
          continue
        }
        throw new ApiError(detail?.error?.message || `Airtable error ${res.status}`, res.status, detail?.error?.type)
      }

      const data = await res.json()
      if (Array.isArray(data.records)) out.push(...data.records)
      offset = data.offset
    } while (offset)

    return out
  }

  /**
   * GET single record by id.
   */
  private async getRecord<T = any>(
    tableId: string,
    id: string
  ): Promise<{ id: string; createdTime: string; fields: Record<string, any> }> {
    if (!this.apiKey) throw new ApiError('AIRTABLE_API_KEY is not set', 500, 'CONFIG_ERROR')
    const url = `${this.baseUrl}/${this.baseId}/${encodeURIComponent(tableId)}/${encodeURIComponent(id)}?returnFieldsByFieldId=true`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      let detail: any = null
      try {
        detail = await res.json()
      } catch {}
      throw new ApiError(detail?.error?.message || `Airtable error ${res.status}`, res.status, detail?.error?.type)
    }
    return res.json()
  }

  /**
   * Authenticate member (dev-appropriate).
   * - Finds record by email and compares Temp Password (plain) or falls back to error if only hash present.
   */
  async authenticateMember(email: string, password: string): Promise<MemberAccount> {
    if (!this.isConfigured()) throw new ApiError('AIRTABLE_API_KEY is not set', 500, 'CONFIG_ERROR')

    // filterByFormula uses field name, not field ID
    const ff = `LOWER({Email Address})='${email.trim().toLowerCase().replace(/'/g, "\\'")}'`
    const params = new URLSearchParams()
    params.set('filterByFormula', ff)
    params.set('maxRecords', '1')

    const matches = await this.getRecords(this.tables.members, params)
    if (matches.length === 0) throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS')

    const r = matches[0]
    const f = r.fields
    const tempPass = String(f[this.fields.members.temporaryPassword] || '')
    const storedHash = String(f[this.fields.members.passwordHash] || '')

    if (tempPass && password === tempPass) {
      const member: MemberAccount = {
        id: r.id,
        pharmacyName: String(f[this.fields.members.pharmacyName] || ''),
        email: String(f[this.fields.members.email] || email),
        subscriptionStatus: (String(f[this.fields.members.subscriptionStatus] || 'Active') as any) || 'Active',
        lastLoginISO: String(f[this.fields.members.lastLogin] || r.createdTime || new Date().toISOString()),
      }
      return member
    }

    if (storedHash) {
      // Requires server to verify securely
      throw new ApiError('Password hash present; server-side verification required.', 400, 'SERVER_AUTH_REQUIRED')
    }

    throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  /**
   * Fetch clinical programs.
   * Maps to ClinicalProgram for UI.
   */
  async getClinicalPrograms(): Promise<ClinicalProgram[]> {
    const records = await this.getRecords(this.tables.programs)
    return records.map((r) => {
      const f = r.fields
      const slug = String(f[this.fields.programs.programSlug] || '').toLowerCase() as ProgramSlug
      const trainingCount = Array.isArray(f[this.fields.programs.trainingLinks]) ? f[this.fields.programs.trainingLinks].length : 0
      const protoCount = Array.isArray(f[this.fields.programs.protocolLinks]) ? f[this.fields.programs.protocolLinks].length : 0
      const formCount = Array.isArray(f[this.fields.programs.formLinks]) ? f[this.fields.programs.formLinks].length : 0
      const addlCount = Array.isArray(f[this.fields.programs.additionalLinks]) ? f[this.fields.programs.additionalLinks].length : 0

      const prog: ClinicalProgram = {
        slug: (slug || 'tmm') as ProgramSlug,
        name: String(f[this.fields.programs.programName] || 'Program'),
        description: String(f[this.fields.programs.programDescription] || ''),
        icon: iconBySlug(slug),
        resourceCount: trainingCount + protoCount + formCount + addlCount,
        lastUpdatedISO: r.createdTime,
        downloadCount: undefined,
      }
      return prog
    })
  }

  /**
   * Fetch documentation forms for a program (used by ProgramPage "Documentation Forms" tab).
   * For now, returns empty array as we need to establish the relationship between programs and resources.
   */
  async getProgramDocumentationForms(slug: ProgramSlug): Promise<ResourceItem[]> {
    // TODO: Implement proper relationship between programs and resources
    // For now, return empty array
    return []
  }

  /**
   * Fetch resources from the Resources table.
   * Applies client-side filters for simplicity.
   */
  async getResources(filters: Partial<ResourceFilters> = {}): Promise<ResourceItem[]> {
    // Get all resources
    const records = await this.getRecords(this.tables.resources)
    
    const items: ResourceItem[] = records.map((r) => {
      const f = r.fields
      const { url, sizeMB } = firstAttachment(f[this.fields.resources.resourceFile])
      
      return {
        id: r.id,
        name: String(f[this.fields.resources.resourceName] || 'Resource'),
        program: 'general', // Will be updated when we link to programs
        type: 'Additional Resources' as ResourceType, // Default type
        category: undefined,
        tags: undefined,
        fileUrl: url,
        sizeMB,
        lastUpdatedISO: r.createdTime,
        downloadCount: undefined,
        bookmarked: false,
      } as ResourceItem
    })

    // Apply client-side filters
    let filtered = items

    if (filters.search) {
      const q = String(filters.search).toLowerCase()
      filtered = filtered.filter((it) => it.name.toLowerCase().includes(q))
    }

    // Sorting
    const sortBy = filters.sortBy || 'name'
    const sortOrder = (filters.sortOrder || 'asc') === 'asc' ? 1 : -1
    filtered.sort((a, b) => {
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

    return filtered
  }

  /**
   * Fetch a single resource by id from the Resources table.
   */
  async getResourceById(id: string): Promise<ResourceItem> {
    try {
      const r = await this.getRecord(this.tables.resources, id)
      const f = r.fields
      const { url, sizeMB } = firstAttachment(f[this.fields.resources.resourceFile])
      
      return {
        id: r.id,
        name: String(f[this.fields.resources.resourceName] || 'Resource'),
        program: 'general',
        type: 'Additional Resources' as ResourceType,
        category: undefined,
        tags: undefined,
        fileUrl: url,
        sizeMB,
        lastUpdatedISO: r.createdTime,
        downloadCount: undefined,
        bookmarked: false,
      }
    } catch (error) {
      throw new ApiError('Resource not found', 404, 'NOT_FOUND')
    }
  }
}

/** Export singleton */
export const airtableService = new AirtableService()