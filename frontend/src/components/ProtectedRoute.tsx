import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * If the user is not logged in, they are redirected to /login with a redirect query param
 * so they are seamlessly routed back to the shared room after logging in.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

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

  // Not authenticated — redirect to login preserving redirect target
  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />
  }

  // Authenticated — render the child route
  return <Outlet />
}
