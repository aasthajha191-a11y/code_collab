import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Pages — we'll build these fully in Phase 2
import LandingPage   from '@/pages/LandingPage'
import LoginPage     from '@/pages/LoginPage'
import AuthCallback  from '@/pages/AuthCallback'
import DashboardPage from '@/pages/DashboardPage'
import EditorPage    from '@/pages/EditorPage'
import NotFoundPage  from '@/pages/NotFoundPage'

/**
 * App.tsx — Root component
 *
 * Defines the application's route structure:
 *
 *  /                → Landing page (public)
 *  /login           → Login page (public)
 *  /auth/callback   → GitHub OAuth callback handler (public)
 *  /dashboard       → User dashboard (protected — must be logged in)
 *  /room/:roomId    → Collaborative editor (protected)
 *  *                → 404 page
 */
export default function App() {
  return (
    // AuthProvider wraps the whole app so any component can access auth state
    <AuthProvider>
      {/* react-hot-toast notification system */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#252526',
            color: '#f3f4f6',
            border: '1px solid #3e3e42',
          },
        }}
      />

      <Routes>
        {/* Public routes */}
        <Route path="/"               element={<LandingPage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />

        {/* Protected routes — redirect to /login if not authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/room/:roomId"  element={<EditorPage />} />
        </Route>

        {/* Catch-all — show 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*"    element={<Navigate to="/404" replace />} />
      </Routes>
    </AuthProvider>
  )
}
