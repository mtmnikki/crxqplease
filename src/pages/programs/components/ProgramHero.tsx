/**
 * ProgramHero
 * Renders a gradient hero with a glassmorphism container showing program title and optional description.
 */

import React from 'react'

/** Props for ProgramHero */
interface ProgramHeroProps {
  /** Program title to display */
  title: string
  /** Optional subtitle/description under the title */
  subtitle?: string
  /** Optional statistics or extra content rendered below description */
  extra?: React.ReactNode
}

/**
 * ProgramHero component
 * Uses a blue-green gradient background and a translucent glass card for the content.
 */
const ProgramHero: React.FC<ProgramHeroProps> = ({ title, subtitle, extra }) => {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-cyan-600 to-teal-500" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-6 text-white backdrop-blur-md shadow-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-white/90">
              {subtitle}
            </p>
          ) : null}
          {extra ? <div className="mt-4">{extra}</div> : null}
        </div>
      </div>
      {/* Decorative subtle glow elements */}
      <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
    </section>
  )
}

export default ProgramHero
