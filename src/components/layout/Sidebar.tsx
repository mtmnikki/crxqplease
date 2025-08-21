/** 
 * Sidebar navigation for ClinicalRxQ
 * - Dark (navy) fixed sidebar on desktop, hidden on small screens.
 * - Contains Dashboard, Clinical Programs, and Resource Library sections.
 * - Per request:
 *   - Remove "Documentation Forms", "Protocols", and "Training" from Resource Library.
 *   - Keep "All Resources" CTA and place it at the bottom of the Resource Library list.
 *
 * Routing fix:
 * - Use react-router Link instead of native anchors to prevent full page reloads (404 in preview environment).
 */

import React from 'react'
import {
  LayoutDashboard,
  LibraryBig,
  FolderOpen,
  FileBadge,
  BookOpen,
  DollarSign,
} from 'lucide-react'
import { Link } from 'react-router'

/**
 * Single link item in the sidebar list.
 * - Uses react-router Link for SPA navigation inside MemoryRouter (prevents 404).
 * - Dark-mode tuned: subtle hover using white/5, active uses white/10.
 */
const SideLink: React.FC<{
  href: string
  label: string
  icon?: React.ReactNode
  active?: boolean
  emphasis?: 'default' | 'cta'
}> = ({ href, label, icon, active, emphasis = 'default' }) => {
  const base = 'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors'
  const inactive = 'text-slate-200 hover:bg-white/5'
  const activeCls = 'bg-white/10 text-white ring-1 ring-inset ring-white/10'
  const ctaCls =
    emphasis === 'cta'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : active
      ? activeCls
      : inactive

  return (
    <Link
      to={href}
      className={`${base} ${ctaCls}`}
      data-discover={emphasis === 'cta' ? 'true' : undefined}
      style={emphasis === 'cta' ? { pointerEvents: 'auto' } : undefined}
    >
      {icon && <span className="text-slate-300 group-hover:text-inherit">{icon}</span>}
      <span>{label}</span>
    </Link>
  )
}

/**
 * Expandable section wrapper using native details/summary.
 * - Styled for dark sidebar.
 */
const Section: React.FC<{
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}> = ({ title, icon, defaultOpen = true, children }) => {
  return (
    <details className="group w-full" open={defaultOpen}>
      <summary className="flex cursor-pointer select-none items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-slate-100 hover:bg-white/5">
        <span className="flex items-center gap-2">
          <span className="text-slate-300 group-hover:text-white">{icon}</span>
          {title}
        </span>
        <span aria-hidden className="ml-2 inline-block rotate-0 text-slate-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-2 space-y-1 pl-2">{children}</div>
    </details>
  )
}

/**
 * Sidebar component
 * - Fixed on desktop so main content doesn't render below it.
 * - Resource Library list updated as requested:
 *   - Kept: Patient Handouts, Clinical Resources, Medical Billing
 *   - Removed: Documentation Forms, Protocols, Training
 *   - CTA "All Resources" placed at bottom
 */
const Sidebar: React.FC = () => {
  return (
    <aside
      className="
        fixed inset-y-0 left-0 z-40 hidden h-screen w-[280px]
        overflow-y-auto border-r border-slate-800 bg-[#1A2332] text-slate-100
        lg:block
      "
    >
      <div className="px-3 py-4">
        {/* Top-level quick link: Dashboard */}
        <div className="mb-3">
          <SideLink href="/dashboard" label="Dashboard" icon={<LayoutDashboard size={16} />} />
        </div>

        {/* Clinical Programs */}
        <Section title="Clinical Programs" icon={<BookOpen size={16} />} defaultOpen>
          <SideLink href="/programs/tmm" label="MedSync: TimeMyMeds" icon={<FolderOpen size={16} />} />
          <SideLink href="/programs/mtmtft" label="MTM The Future Today" icon={<FolderOpen size={16} />} />
          <SideLink href="/programs/tnt" label="Test and Treat" icon={<FolderOpen size={16} />} />
          <SideLink href="/programs/a1c" label="HbA1C Testing" icon={<FolderOpen size={16} />} />
          <SideLink href="/programs/oc" label="Oral Contraceptives" icon={<FolderOpen size={16} />} />
        </Section>

        {/* Resource Library */}
        <div className="mt-4">
          <Section title="Resource Library" icon={<LibraryBig size={16} />} defaultOpen>
            {/* Kept items */}
            <SideLink
              href="/library?type=patient-handouts"
              label="Patient Handouts"
              icon={<FileBadge size={16} />}
            />
            <SideLink
              href="/library?type=clinical-resources"
              label="Clinical Resources"
              icon={<FileBadge size={16} />}
            />
            <SideLink
              href="/library?type=medical-billing"
              label="Medical Billing"
              icon={<DollarSign size={16} />}
            />

            {/* Removed per request: Documentation Forms, Protocols, Training */}

            {/* CTA moved to bottom */}
            <div className="pt-2">
              <SideLink href="/resources" label="All Resources" emphasis="cta" />
            </div>
          </Section>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
