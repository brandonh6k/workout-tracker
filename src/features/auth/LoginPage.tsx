import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ErrorMessage } from '../../components/ErrorMessage'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      navigate('/')
    }
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
            Sign in to continue
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
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          <p 
            className="text-center text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Don't have an account?{' '}
            <Link 
              to="/signup" 
              className="font-medium transition-colors"
              style={{ color: 'var(--color-ember)' }}
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
