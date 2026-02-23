import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, LoginPage, SignupPage } from './features/auth'
import { DashboardPage } from './features/dashboard'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { WorkoutModeProvider } from './lib/WorkoutModeContext'

// Lazy-load non-critical routes
const TemplatesPage = lazy(() => import('./features/templates/TemplatesPage').then((m) => ({ default: m.TemplatesPage })))
const SchedulePage = lazy(() => import('./features/schedule/SchedulePage').then((m) => ({ default: m.SchedulePage })))
const HistoryPage = lazy(() => import('./features/workouts/HistoryPage').then((m) => ({ default: m.HistoryPage })))
const AdminPage = lazy(() => import('./features/admin/AdminPage').then((m) => ({ default: m.AdminPage })))

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <WorkoutModeProvider>
        <Toaster 
          position="bottom-right"
          visibleToasts={3}
          richColors
          toastOptions={{
            duration: 4000,
            className: 'sonner-toast-with-progress',
            style: {
              '--progress-duration': '4000ms',
            } as React.CSSProperties,
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/templates" element={<Suspense fallback={null}><TemplatesPage /></Suspense>} />
              <Route path="/schedule" element={<Suspense fallback={null}><SchedulePage /></Suspense>} />
              <Route path="/history" element={<Suspense fallback={null}><HistoryPage /></Suspense>} />
              <Route path="/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
            </Route>
          </Route>
        </Routes>
      </WorkoutModeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
