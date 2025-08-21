/**
 * Programs Overview Page
 * Displays all clinical programs loaded from Airtable (no mock data).
 * Replaces dynamic require with a safe icon map to avoid runtime errors in production.
 */

import React, { useEffect, useState } from 'react'
import Header from '../components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Link } from 'react-router'
import { ArrowRight, CalendarCheck, Pill, TestTube2, ActivitySquare, Stethoscope, Layers } from 'lucide-react'
import { ClinicalProgram } from '../services/api/types'
import { Api } from '../services/api'

/**
 * Map Airtable-provided icon names to Lucide components.
 * Falls back to Layers for unknown names.
 */
function iconByName(name?: string) {
  const n = (name || '').toLowerCase()
  const map: Record<string, React.ComponentType<any>> = {
    calendarcheck: CalendarCheck,
    pill: Pill,
    testtube2: TestTube2,
    activitysquare: ActivitySquare,
    stethoscope: Stethoscope,
    layers: Layers,
  }
  return map[n] || Layers
}

/**
 * Programs Page Component (live Airtable)
 */
const ProgramsPage: React.FC = () => {
  const [programs, setPrograms] = useState<ClinicalProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const list = await Api.getPrograms()
        setPrograms(list)
      } catch (e) {
        console.error('Error loading programs:', e)
        setPrograms([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F9FB] to-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-teal-500 text-white py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1200px] px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Clinical Programs</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Comprehensive clinical service programs designed to transform your pharmacy practice
              from traditional dispensing to patient-centered care delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="py-16">
        <div className="mx-auto max-w-[1200px] px-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-white" />
            </div>
          ) : programs.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-slate-700">
              No programs found. Please verify Airtable connection.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {programs.map((program) => {
                const Icon = iconByName(program.icon)
                return (
                  <Card
                    key={program.slug}
                    className="group border-blue-50 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                  >
                    <CardHeader className="pb-2">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-4`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{program.resourceCount} resources</Badge>
                        <Badge variant="outline" className="bg-transparent">
                          {program.downloadCount ? `${program.downloadCount.toLocaleString()} downloads` : 'Live'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{program.description}</p>
                      <div className="text-xs text-gray-500 mb-4">
                        Last updated: {program.lastUpdatedISO ? new Date(program.lastUpdatedISO).toLocaleDateString() : '—'}
                      </div>
                      <Link to={`/programs/${program.slug}`}>
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
                          Explore Program
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-[1200px] px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Practice?</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join pharmacies using ClinicalRxQ to deliver enhanced clinical services and improve patient outcomes.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/join">
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600">
                Join Now
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="bg-transparent">
                Member Login
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProgramsPage
