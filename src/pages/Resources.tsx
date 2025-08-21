/**
 * Resource Library page
 * - Displays a dense, single-column table-like list of resources.
 * - Adds a compact search bar (live filter by name/category/tags).
 * - Quick Access cards act as single-select type filters (toggle).
 * - No extra scroll containers added; layout remains desktop-dense.
 */

import React, { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Download, Search } from 'lucide-react'
import { Api } from '../services/api'
import { ResourceItem, ResourceType } from '../services/api/types'

/**
 * Convert API items to a stable, name-sorted list for predictable UI.
 */
function useSortedResources(items: ResourceItem[]) {
  return useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name))
  }, [items])
}

/**
 * Map a Quick Access label to a ResourceType.
 * Keeps UI labels decoupled from the domain union.
 */
function labelToType(label: string): ResourceType | null {
  const key = label.toLowerCase()
  if (key === 'patient handouts') return 'Patient Handouts'
  if (key === 'clinical resources') return 'Clinical Resources'
  if (key === 'documentation forms') return 'Documentation Forms'
  if (key === 'protocols') return 'Protocols'
  if (key === 'training') return 'Training Materials'
  if (key === 'medical billing') return 'Medical Billing'
  return null
}

/**
 * Minimal list row for a resource item.
 * Renders name and a compact Download button.
 */
const ResourceListRow: React.FC<{ item: ResourceItem }> = ({ item }) => {
  const hasLink = Boolean(item.fileUrl)
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 leading-5 break-words">
          {item.name}
        </div>
      </div>
      <div className="flex-shrink-0">
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          asChild={hasLink}
          disabled={!hasLink}
        >
          {hasLink ? (
            <a href={item.fileUrl!} target="_blank" rel="noreferrer">
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Lightweight quick access row (6 compact buttons).
 * - Acts as filter toggles by type.
 * - Highlights the active selection.
 */
const QuickAccessRow: React.FC<{
  items: Array<{ label: string; icon: React.ReactNode }>
  selectedLabel?: string | null
  onClick?: (label: string) => void
}> = ({ items, selectedLabel, onClick }) => {
  return (
    <div className="mb-3 grid grid-cols-6 gap-2">
      {items.map((it) => {
        const active = selectedLabel?.toLowerCase() === it.label.toLowerCase()
        return (
          <button
            type="button"
            key={it.label}
            className={[
              'rounded-lg border bg-white transition-colors duration-150',
              active
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50',
              'cursor-pointer',
            ].join(' ')}
            onClick={() => onClick?.(it.label)}
            aria-pressed={active}
          >
            <div className="p-2 h-full flex items-center justify-center text-center">
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#244575]/15 to-[#132B51]/15 text-[#244575] [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-slate-600">
                  {it.icon}
                </div>
                <div className="text-[13px] font-medium text-slate-800">{it.label}</div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Resource Library page component
 * - Adds live search (name/category/tags).
 */
const ResourcesPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ResourceItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Active type filter from Quick Access
  const [filterType, setFilterType] = useState<ResourceType | null>(null)

  // Live search query
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await Api.getResources({})
        if (!mounted) return
        setItems(list)
      } catch (e) {
        console.error('Failed to load resources', e)
        if (!mounted) return
        setError('Failed to load resources.')
        setItems([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  /**
   * Apply in-memory filtering by selected type and search query.
   * Search fields: name, category, tags.
   */
  const filtered = useMemo(() => {
    let out = items
    if (filterType) {
      out = out.filter((r) => r.type === filterType)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      out = out.filter((r) => {
        const name = r.name.toLowerCase()
        const cat = (r.category || '').toLowerCase()
        const tags = (r.tags || []).join(' ').toLowerCase()
        return name.includes(q) || cat.includes(q) || tags.includes(q)
      })
    }
    return out
  }, [items, filterType, search])

  const sorted = useSortedResources(filtered)

  // Current label (for active style)
  const activeLabel = useMemo(() => {
    if (!filterType) return null
    // Derive label from type (inverse of labelToType)
    return filterType === 'Training Materials' ? 'Training' : (filterType as string)
  }, [filterType])

  return (
    <AppShell>
      <div className="mx-auto max-w-[1280px] px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900">Complete Resource Library</h1>
          <p className="text-sm text-slate-600">
            Browse all clinical and general pharmacy resources.
          </p>
        </div>

        {/* Search bar (compact, live search) */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keyword, file name, or tag..."
              className="h-9 pl-8"
              aria-label="Search resources"
            />
          </div>
          {search ? (
            <Button
              variant="outline"
              className="bg-transparent h-9"
              onClick={() => setSearch('')}
            >
              Clear
            </Button>
          ) : null}
        </div>

        {/* Quick Access (six compact filter buttons) */}
        <QuickAccessRow
          selectedLabel={activeLabel}
          items={[
            {
              label: 'Patient Handouts',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
              ),
            },
            {
              label: 'Clinical Resources',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h.01"></path><path d="M3 18h.01"></path><path d="M3 6h.01"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M8 6h13"></path></svg>
              ),
            },
            {
              label: 'Documentation Forms',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="12" x="2" y="6" rx="2"></rect><path d="M12 12h.01"></path><path d="M17 12h.01"></path><path d="M7 12h.01"></path></svg>
              ),
            },
            {
              label: 'Protocols',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="22" x2="18" y1="12" y2="12"></line><line x1="6" x2="2" y1="12" y2="12"></line><line x1="12" x2="12" y1="6" y2="2"></line><line x1="12" x2="12" y1="22" y2="18"></line></svg>
              ),
            },
            {
              label: 'Training',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>
              ),
            },
            {
              label: 'Medical Billing',
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
              ),
            },
          ]}
          onClick={(label) => {
            const t = labelToType(label)
            if (!t) return
            setFilterType((prev) => (prev === t ? null : t))
          }}
        />

        {/* Results container */}
        <div className="rounded-md border bg-white divide-y overflow-hidden">
          {/* Status row with optional active filter/search chips */}
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              {loading ? (
                <span>Loading…</span>
              ) : error ? (
                <span>{error}</span>
              ) : (
                <span>Showing {sorted.length} resources</span>
              )}

              {/* Active search chip */}
              {search ? (
                <span className="flex items-center gap-1">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 border border-slate-200">
                    Search: “{search}”
                  </span>
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                    onClick={() => setSearch('')}
                  >
                    Clear
                  </button>
                </span>
              ) : null}

              {/* Active type chip */}
              {filterType ? (
                <span className="flex items-center gap-1">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 border border-blue-100">
                    Type: {filterType}
                  </span>
                  <button
                    type="button"
                    className="text-blue-700 hover:underline"
                    onClick={() => setFilterType(null)}
                  >
                    Clear
                  </button>
                </span>
              ) : null}
            </div>
          </div>

          {/* Items */}
          {loading ? null : sorted.length === 0 ? (
            <div className="px-3 py-6 text-sm text-slate-700">No resources found.</div>
          ) : (
            <div className="divide-y">
              {sorted.map((it) => (
                <ResourceListRow key={it.id} item={it} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default ResourcesPage
