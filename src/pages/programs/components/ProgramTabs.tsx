/**
 * ProgramTabs
 * Compact horizontal tab bar for program detail pages.
 * Parent owns state; this component only renders the nav and calls onChange.
 */

import React from 'react'

/** A single tab item definition */
export interface TabItem {
  key: string
  label: string
  count?: number
}

/** Props for ProgramTabs */
interface ProgramTabsProps {
  /** Tabs to render (order matters) */
  tabs: TabItem[]
  /** Active tab key */
  active: string
  /** Change handler when a tab is clicked */
  onChange: (key: string) => void
}

/**
 * ProgramTabs component
 * Uses a subtle underline indicator and compact spacing for a dense layout.
 */
const ProgramTabs: React.FC<ProgramTabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="w-full border-b bg-white">
      <div className="mx-auto max-w-[1280px] px-4">
        <nav className="flex items-center gap-2 overflow-x-auto overflow-y-hidden">
          {tabs.map((t) => {
            const isActive = t.key === active
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={[
                  'relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  isActive ? 'text-blue-700' : 'text-slate-700 hover:text-blue-700',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{t.label}</span>
                {typeof t.count === 'number' ? (
                  <span className={[
                    'rounded-full px-2 py-0.5 text-xs',
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700',
                  ].join(' ')}>
                    {t.count}
                  </span>
                ) : null}
                {isActive ? (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] bg-blue-600 rounded-full" />
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default ProgramTabs
