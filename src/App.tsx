import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, LoginPage, SignupPage } from './features/auth'
import { DashboardPage } from './features/dashboard'
import { TemplatesPage } from './features/templates'
import { SchedulePage } from './features/schedule'
import { HistoryPage } from './features/workouts'
import { AdminPage } from './features/admin'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
