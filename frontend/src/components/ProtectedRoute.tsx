import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * If the user is not logged in, they are redirected to /login.
 * While we're still checking the session (isLoading), show a spinner
 * so we don't flash a redirect before auth is confirmed.
 *
 * Used in App.tsx like:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  // Still checking session — show a full-screen loader
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-editor-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-editor-border border-t-brand" />
          <p className="text-sm text-gray-400">Loading session...</p>
        </div>
      </div>
    )
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated — render the child route
  return <Outlet />
}
