import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth'
import { useTheme } from '../lib/useTheme'
import { useWorkoutMode } from '../lib/WorkoutModeContext'

const ADMIN_EMAILS = ['brandon.hunt@gmail.com']

const baseNavItems = [
  { to: '/', label: 'Dashboard', icon: '◈' },
  { to: '/templates', label: 'Templates', icon: '☰' },
  { to: '/schedule', label: 'Schedule', icon: '▦' },
  { to: '/history', label: 'History', icon: '◷' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { isWorkoutActive } = useWorkoutMode()

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)
  const navItems = isAdmin
    ? [...baseNavItems, { to: '/admin', label: 'Admin', icon: '⚙' }]
    : baseNavItems

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-void)' }}>
      {/* Header - hidden during active workout */}
      {!isWorkoutActive && <header
        className="sticky top-0 z-20 border-b"
        style={{ 
          background: 'var(--color-iron)',
          borderColor: 'var(--color-steel)'
        }}
      >
        <div className="max-w-6xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <Link 
              to="/" 
              className="group flex items-center gap-3"
            >
              {/* Logo mark */}
              <div 
                className="w-8 h-8 flex items-center justify-center text-lg font-bold"
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-ember) 0%, var(--color-flame) 100%)',
                  color: 'var(--color-void)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                W
              </div>
              <span 
                className="text-xl tracking-wider hidden sm:block"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  color: 'var(--color-chalk)',
                  textTransform: 'uppercase'
                }}
              >
                Iron Forge
              </span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 transition-colors"
                style={{ color: 'var(--color-zinc)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-chalk)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-zinc)'}
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {/* User info */}
              <span 
                className="text-xs hidden sm:inline font-mono"
                style={{ color: 'var(--color-zinc)' }}
              >
                {user?.email}
              </span>

              {/* Sign out */}
              <button
                onClick={signOut}
                className="text-xs font-mono px-3 py-1.5 transition-all"
                style={{ 
                  color: 'var(--color-slate)',
                  background: 'var(--color-steel)',
                  borderRadius: 'var(--radius-sm)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-chalk)'
                  e.currentTarget.style.background = 'var(--color-concrete)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-slate)'
                  e.currentTarget.style.background = 'var(--color-steel)'
                }}
              >
                SIGN OUT
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-1 pb-3 overflow-x-auto">
            {navItems.map(({ to, label, icon }) => {
              const isActive = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2 px-4 py-2 text-sm transition-all whitespace-nowrap"
                  style={{ 
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: 'var(--radius-sm)',
                    color: isActive ? 'var(--color-void)' : 'var(--color-slate)',
                    background: isActive 
                      ? 'linear-gradient(135deg, var(--color-ember) 0%, var(--color-flame) 100%)'
                      : 'transparent',
                    boxShadow: isActive ? 'var(--shadow-glow)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-chalk)'
                      e.currentTarget.style.background = 'var(--color-steel)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-slate)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span className="text-base">{icon}</span>
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer accent line */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-1"
        style={{ 
          background: 'linear-gradient(90deg, transparent, var(--color-ember), transparent)',
          opacity: 0.3
        }}
      />
    </div>
  )
}
