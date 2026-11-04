import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Code2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/**
 * AuthCallback — handles the redirect back from GitHub OAuth.
 *
 * Flow:
 * 1. GitHub redirects to our backend: GET /auth/github/callback
 * 2. Backend validates the code, creates/updates the user, sets a cookie
 * 3. Backend redirects the browser to: /auth/callback?status=success
 * 4. THIS page reads the status and navigates appropriately
 *
 * If status=error, show the error. Otherwise refresh the user session
 * and redirect to the dashboard.
 */
export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const { refreshUser } = useAuth()
  const called = useRef(false) // prevent double-execution in StrictMode

  const status = params.get('status')
  const error  = params.get('error')

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (status === 'success') {
      // Refresh auth context then go to dashboard
      refreshUser().then(() => {
        navigate('/dashboard', { replace: true })
      })
    } else {
      // OAuth failed — go back to login with an error after 3 seconds
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    }
  }, [status, refreshUser, navigate])

  return (
    <div className="min-h-screen bg-editor-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <Code2 className="h-10 w-10 text-brand" />

        {status === 'success' || !status ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-editor-border border-t-brand" />
            <p className="text-white font-medium">Completing sign in...</p>
            <p className="text-sm text-gray-400">You will be redirected automatically.</p>
          </>
        ) : (
          <>
            <p className="text-red-400 font-medium">Authentication failed</p>
            <p className="text-sm text-gray-400">
              {error || 'An error occurred during sign in.'}
            </p>
            <p className="text-xs text-gray-500">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  )
}
