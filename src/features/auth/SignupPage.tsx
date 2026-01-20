import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ErrorMessage } from '../../components/ErrorMessage'

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { signUp } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    const { error } = await signUp(email, password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--color-void)' }}
      >
        <div className="max-w-sm w-full text-center space-y-6">
          <div 
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-success-muted)' }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-success)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 
              className="text-xl tracking-wide mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
            >
              CHECK YOUR EMAIL
            </h2>
            <p 
              className="text-sm"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              Click the link in your email to confirm your account
            </p>
          </div>
          <Link 
            to="/login" 
            className="inline-block text-sm transition-colors"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ember)' }}
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-void)' }}
    >
      <div className="max-w-sm w-full space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded flex items-center justify-center"
            style={{ 
              background: 'linear-gradient(135deg, var(--color-ember) 0%, var(--color-flame) 100%)',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <svg 
              className="w-8 h-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: 'var(--color-void)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 
            className="text-3xl tracking-wider"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            IRON FORGE
          </h1>
          <p 
            className="mt-2 text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorMessage message={error} />}

          <div className="space-y-4">
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs uppercase tracking-wider mb-2"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="block text-xs uppercase tracking-wider mb-2"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="********"
              />
            </div>

            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-xs uppercase tracking-wider mb-2"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full"
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div 
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--color-void)', borderTopColor: 'transparent' }}
                />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          <p 
            className="text-center text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium transition-colors"
              style={{ color: 'var(--color-ember)' }}
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
