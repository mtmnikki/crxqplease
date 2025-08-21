/**
 * Member Login Page
 * Split-screen layout with branding on left and login form on right.
 * Adds secret alt+click bypass chips positioned above the left-most and right-most
 * preview cards in the "Where dispensing meets direct patient care" container.
 * - Left chip: Member bypass
 * - Right chip: Admin bypass
 * Visibility: Hold Alt to reveal, or toggle persistent debug with Ctrl+Alt+D.
 */

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { useAuth } from '../components/auth/AuthContext'
import { useLocation, useNavigate, Link } from 'react-router'
import { ShieldCheck, FileText, ClipboardList, PlayCircle } from 'lucide-react'
import Header from '../components/layout/Header'

/**
 * Form schema for validating login input values
 */
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

/**
 * Login Page Component with Header and secret alt+click bypass chips
 */
const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Keyboard-driven state for secret controls
  const [altPressed, setAltPressed] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: true },
  })

  /**
   * Toggle debugMode with Ctrl+Alt+D and track Alt press state.
   * Debug mode makes the bypass chips persist and clickable without holding Alt.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setAltPressed(true)
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        setDebugMode((v) => !v)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setAltPressed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  /**
   * Handle login submit and redirect to dashboard or prior protected route
   */
  const onSubmit = async (data: FormValues) => {
    setError(null)
    try {
      await login(data.email, data.password)
      const redirectTo = location.state?.from || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Login failed.')
    }
  }

  /**
   * Secret bypass handler
   * Logs in via stub auth using role-specific demo emails,
   * stores a role hint for UI experiments, and navigates to dashboard.
   */
  const handleBypass = async (role: 'member' | 'admin') => {
    try {
      setError(null)
      // Use the current stub auth rules: any email + password >= 8 chars
      const demoEmail = role === 'admin' ? 'admin@demo.test' : 'member@demo.test'
      const demoPass = 'password1234'
      await login(demoEmail, demoPass)
      localStorage.setItem('crxq_role', role)
      navigate('/dashboard', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Bypass failed.')
    }
  }

  // Visibility flag for chips (Alt pressed or persistent debug mode)
  const showBypassChips = altPressed || debugMode

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Global Header (navigation back to Home/other pages) */}
      <Header />

      {/* Main content area */}
      <main className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Left branding panel */}
        <div className="relative hidden items-center justify-center bg-gradient-to-br from-blue-700 via-cyan-600 to-teal-500 p-10 text-white lg:flex">
          {/* Background glow layers */}
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative z-10 max-w-md">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-xl font-bold">
                CR
              </div>
              <div className="text-lg font-semibold">ClinicalRxQ</div>
            </div>

            <h1 className="mb-3 text-3xl font-bold">Where dispensing meets direct patient care</h1>
            <p className="mb-8 text-white/90">
              Access 190+ resources, protocols, and training materials to transform your pharmacy into a
              clinical care destination.
            </p>

            {/* Preview cards grid + Secret bypass chips positioned above left-most and right-most cards */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {/* Column 1 (left-most) with Member bypass chip */}
              <div className="space-y-1">
                {showBypassChips && (
                  <button
                    type="button"
                    aria-label="Member bypass (Alt+Click)"
                    onMouseDown={(e) => {
                      // Require Alt unless debug mode is active
                      if (debugMode || e.altKey) handleBypass('member')
                    }}
                    className="w-full rounded-md bg-white/15 px-2 py-1 text-left text-[11px] font-medium text-white shadow-sm ring-1 ring-white/25 backdrop-blur hover:bg-white/20"
                  >
                    Member bypass
                    <span className="ml-1 text-white/80">(Alt+Click)</span>
                  </button>
                )}
                <div className="rounded-lg bg-white/10 p-3 backdrop-blur">
                  <FileText className="mb-2 h-5 w-5" />
                  <div className="text-sm font-semibold">Docs</div>
                  <div className="text-xs text-white/80">Legally compliant forms</div>
                </div>
              </div>

              {/* Column 2 (center) */}
              <div className="rounded-lg bg-white/10 p-3 backdrop-blur">
                <ClipboardList className="mb-2 h-5 w-5" />
                <div className="text-sm font-semibold">Protocols</div>
                <div className="text-xs text-white/80">Evidence-based workflows</div>
              </div>

              {/* Column 3 (right-most) with Admin bypass chip */}
              <div className="space-y-1">
                {showBypassChips && (
                  <button
                    type="button"
                    aria-label="Admin bypass (Alt+Click)"
                    onMouseDown={(e) => {
                      if (debugMode || e.altKey) handleBypass('admin')
                    }}
                    className="w-full rounded-md bg-white/15 px-2 py-1 text-right text-[11px] font-medium text-white shadow-sm ring-1 ring-white/25 backdrop-blur hover:bg-white/20"
                  >
                    <span className="text-white/80">(Alt+Click)</span>
                    <span className="ml-1">Admin bypass</span>
                  </button>
                )}
                <div className="rounded-lg bg-white/10 p-3 backdrop-blur">
                  <PlayCircle className="mb-2 h-5 w-5" />
                  <div className="text-sm font-semibold">Training</div>
                  <div className="text-xs text-white/80">Modules and webinars</div>
                </div>
              </div>
            </div>

            {/* Small hint ribbon for testers */}
            {showBypassChips && (
              <div className="mt-3 rounded-md bg-white/10 px-3 py-2 text-xs text-white/90 ring-1 ring-white/20">
                Hold Alt to reveal bypass chips. Toggle persistent debug with Ctrl+Alt+D.
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4" />
              HIPAA-aligned. Updated monthly.
            </div>
          </div>
        </div>

        {/* Right login form panel */}
        <div className="flex items-center justify-center bg-white p-6">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <div className="mb-1 text-2xl font-bold">Welcome Back</div>
              <div className="text-sm text-slate-600">Sign in to access your member dashboard</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" placeholder="pharmacy@example.com" {...register('email')} />
                {errors.email ? (
                  <div className="mt-1 text-xs text-red-600">{errors.email.message}</div>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    className="text-sm text-blue-700 hover:underline"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  {...register('password')}
                />
                {errors.password ? (
                  <div className="mt-1 text-xs text-red-600">Minimum 8 characters</div>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" {...register('remember')} />
                  <Label htmlFor="remember" className="text-sm">
                    Remember me
                  </Label>
                </div>
                <Link to="/forgot-password" className="text-sm text-blue-700 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              {error ? <div className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}

              <Button type="submit" className="w-full">
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="text-xs text-slate-500">New to ClinicalRxQ?</div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Link to="/join" className="block">
                <Button variant="outline" className="w-full bg-transparent">
                  Request Access
                </Button>
              </Link>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
