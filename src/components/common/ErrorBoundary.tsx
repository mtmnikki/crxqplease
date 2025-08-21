/**
 * ErrorBoundary component
 * Catches runtime errors and displays a friendly message instead of a blank page.
 * Useful for production where silent failures would otherwise render nothing.
 */

import React from 'react'

/** Props for ErrorBoundary wrapper */
interface ErrorBoundaryProps {
  /** Children to render within the boundary */
  children: React.ReactNode
}

/** Internal state tracking error presence */
interface ErrorBoundaryState {
  /** Whether an error was caught */
  hasError: boolean
  /** Error instance if available */
  error?: Error
}

/**
 * ErrorBoundary class component
 * Uses getDerivedStateFromError and componentDidCatch to capture errors and render a fallback UI.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  /** Update state to render fallback when an error is thrown */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  /** Log error details for diagnostics */
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application error boundary caught:', error, info)
    
    // Send error to monitoring service (placeholder for future integration)
    if (typeof window !== 'undefined' && 'fetch' in window) {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(console.error)
    }
  }

  /** Render fallback UI if error occurred, else children */
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              Please refresh the page. If the issue persists, contact support.
            </p>
            {this.state.error?.message ? (
              <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-md overflow-auto max-h-48">
                {this.state.error.message}
              </pre>
            ) : null}
          </div>
        </div>
      )
    }
    return this.props.children as any
  }
}

export default ErrorBoundary
