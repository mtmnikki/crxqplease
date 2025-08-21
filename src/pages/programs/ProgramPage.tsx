/**
 * Program detail page (dense, desktop-friendly)
 * - Hero: blue→green gradient with glassmorphism title container.
 * - Tabs: Overview | Training | Protocols | Forms | Additional Resources.
 * - Loads all resources for the program once and partitions into tab buckets.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router'
import AppShell from '../../components/layout/AppShell'
import ProgramHero from './components/ProgramHero'
import ProgramTabs, { TabItem } from './components/ProgramTabs'
import ResourceRow from './components/ResourceRow'
import { Button } from '../../components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Api } from '../../services/api'
import { ProgramSlug, ResourceItem, ResourceType } from '../../services/api/types'

/** Friendly labels for known program slugs */
const programName: Record<ProgramSlug, string> = {
  tmm: 'MedSync: TimeMyMeds',
  mtmtft: 'MTM The Future Today',
  tnt: 'Test and Treat',
  a1c: 'HbA1C Testing',
  oc: 'Oral Contraceptives',
}

/** Convert a list of resources into typed buckets for the tabs */
function partitionResources(items: ResourceItem[]) {
  const buckets: Record<string, ResourceItem[]> = {
    training: [],
    protocols: [],
    forms: [],
    additional: [],
  }

  const isKnown = (t?: ResourceType) =>
    t === 'Training Materials' || t === 'Protocols' || t === 'Documentation Forms'

  for (const it of items) {
    if (it.type === 'Training Materials') buckets.training.push(it)
    else if (it.type === 'Protocols') buckets.protocols.push(it)
    else if (it.type === 'Documentation Forms') buckets.forms.push(it)
    else buckets.additional.push(it)
  }

  // Sort each bucket by name for consistent UX
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => a.name.localeCompare(b.name))
  }

  return buckets
}

/**
 * ProgramPage component
 * Loads all program resources, shows a hero, and organizes items within tabs.
 */
const ProgramPage: React.FC = () => {
  const params = useParams() as { slug?: ProgramSlug }
  const slug = (params.slug || 'mtmtft') as ProgramSlug

  const [loading, setLoading] = useState(true)
  const [all, setAll] = useState<ResourceItem[]>([])
  const [active, setActive] = useState<string>('overview')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        // Pull everything for this program; partition client-side
        const list = await Api.getResources({ program: slug })
        if (!mounted) return
        setAll(list)
      } catch (e) {
        console.error('Error loading program resources:', e)
        if (!mounted) return
        setAll([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [slug])

  const buckets = useMemo(() => partitionResources(all), [all])
  const counts = {
    training: buckets.training.length,
    protocols: buckets.protocols.length,
    forms: buckets.forms.length,
    additional: buckets.additional.length,
    total: all.length,
  }

  const tabs: TabItem[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'training', label: 'Training', count: counts.training },
    { key: 'protocols', label: 'Protocols', count: counts.protocols },
    { key: 'forms', label: 'Forms', count: counts.forms },
    { key: 'additional', label: 'Additional Resources', count: counts.additional },
  ]

  return (
    <AppShell>
      {/* Hero */}
      <ProgramHero
        title={programName[slug] ?? slug.toUpperCase()}
        subtitle="Implementation-focused resources, training, and documentation to transform your practice."
        extra={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/20 px-2 py-0.5">Resources: {counts.total}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">Forms: {counts.forms}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">Protocols: {counts.protocols}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5">Training: {counts.training}</span>
          </div>
        }
      />

      {/* Tabs */}
      <ProgramTabs tabs={tabs} active={active} onChange={setActive} />

      {/* Content */}
      <div className="mx-auto max-w-[1280px] px-4 py-6">


        {active === 'overview' ? (
          <section className="space-y-3">
            {/* Dense, short cards to summarize sections */}

            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">Recently Updated</div>
              {loading ? (
                <div className="text-sm text-slate-600">Loading…</div>
              ) : buckets.additional.slice(0, 5).length === 0 && all.slice(0, 5).length === 0 ? (
                <div className="text-sm text-slate-600">No resources yet.</div>
              ) : (
                <div className="space-y-2">
                  {(all.slice(0, 6)).map((r) => (
                    <ResourceRow key={r.id} item={r} />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {active === 'training' ? (
          <section className="space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : buckets.training.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-slate-700">
                No training resources found.
              </div>
            ) : (
              buckets.training.map((r) => <ResourceRow key={r.id} item={r} />)
            )}
          </section>
        ) : null}

        {active === 'protocols' ? (
          <section className="space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : buckets.protocols.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-slate-700">
                No protocols found.
              </div>
            ) : (
              buckets.protocols.map((r) => <ResourceRow key={r.id} item={r} />)
            )}
          </section>
        ) : null}

        {active === 'forms' ? (
          <section className="space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : buckets.forms.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-slate-700">
                No forms found.
              </div>
            ) : (
              buckets.forms.map((r) => <ResourceRow key={r.id} item={r} />)
            )}
          </section>
        ) : null}

        {active === 'additional' ? (
          <section className="space-y-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : buckets.additional.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-slate-700">
                No additional resources found.
              </div>
            ) : (
              buckets.additional.map((r) => <ResourceRow key={r.id} item={r} />)
            )}
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}

export default ProgramPage
