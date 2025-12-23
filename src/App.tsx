import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, LoginPage, SignupPage } from './features/auth'
import { DashboardPage } from './features/dashboard'
import { TemplatesPage } from './features/templates'
import { SchedulePage } from './features/schedule'
import { HistoryPage } from './features/workouts'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
