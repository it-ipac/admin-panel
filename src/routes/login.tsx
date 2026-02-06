import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { loginSchema, validateInput } from '@/lib/validation'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { signIn, user, profile, loading, isAdmin } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && profile) {
      if (isAdmin) {
        navigate({ to: '/dashboard' })
      } else {
        setError('Access denied. Admin privileges required.')
      }
    }
  }, [user, profile, loading, isAdmin, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationErrors({})
    
    // Validate input
    const validation = validateInput(loginSchema, {
      identifier: username,
      password: password,
    })

    if (!validation.success) {
      setValidationErrors(validation.errors)
      return
    }

    setIsSubmitting(true)

    try {
      const { error: signInError } = await signIn(validation.data.identifier, validation.data.password)
      
      if (signInError) {
        setError(signInError.message || 'Invalid username or password')
        setIsSubmitting(false)
      }
      // Navigation will happen via useEffect when auth state changes
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 to-primary-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-50 to-primary-100 p-6">
      <div className="w-2xl">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 pt-8 text-center">
            <div className="flex flex-row items-center justify-center gap-2">
            <img src="/IPAC_logo.svg" alt="IPAC Logo" className="h-14" />
            <p className="text-4xl font-bold text-gray-700">IPAC Admin Panel</p>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-gray-900">Sign in to your account</h1>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="username" className="block text-lg font-medium mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setValidationErrors((prev) => ({ ...prev, identifier: '' }))
                  }}
                  className={`login-input w-full px-3 py-3 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    validationErrors.identifier
                      ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                      : 'border-black focus:ring-primary-500 focus:border-black'
                  }`}
                  placeholder="Username"
                />
                {validationErrors.identifier && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.identifier}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-lg font-medium mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setValidationErrors((prev) => ({ ...prev, password: '' }))
                    }}
                    className={`login-input w-full px-3 py-3 pr-10 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                      validationErrors.password
                        ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                        : 'border-black focus:ring-primary-500 focus:border-black'
                    }`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-md">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                Remember me
              </label>
              <button type="button" className="text-primary-600 hover:text-primary-700">
                Forgot your password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-10 text-lg w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
