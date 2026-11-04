import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Code2, GitBranch, Shield, Zap, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/Spinner'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-editor-bg">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="min-h-screen bg-editor-bg flex">

      {/* ── Left panel — branding ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-editor-sidebar border-r border-editor-border">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-brand/10">
            <Code2 className="h-5 w-5 text-brand" />
          </div>
          <span className="text-lg font-bold text-white">CodeCollab</span>
        </Link>

        {/* Centre content */}
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Code together,<br />
            <span className="text-brand">ship faster.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10">
            Real-time collaborative coding with live cursors,
            instant execution, and version history.
          </p>

          {/* Feature checklist */}
          <ul className="space-y-4">
            {[
              { icon: Zap,    text: 'Conflict-free editing powered by Yjs CRDT' },
              { icon: Users,  text: 'Live cursors and real-time presence' },
              { icon: Shield, text: 'Secure GitHub OAuth — no passwords' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-brand" />
                </div>
                <span className="text-sm text-gray-300">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-600">
          B.Tech CSE Project — Mayank Saroha &amp; Reshav Govindam, 2026
        </p>
      </div>

      {/* ── Right panel — login form ───────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <Code2 className="h-7 w-7 text-brand" />
          <span className="text-xl font-bold text-white">CodeCollab</span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-2">
              Sign in to start coding together
            </p>
          </div>

          {/* GitHub OAuth button */}
          <a
            href="/auth/github"
            className="flex items-center justify-center gap-3 w-full px-5 py-3.5
                       bg-[#24292f] hover:bg-[#2f3439] border border-[#444c56]
                       rounded-lg text-white font-medium transition-colors duration-150
                       shadow-lg shadow-black/20 group"
          >
            {/* GitHub SVG icon */}
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57
                       0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41
                       -1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815
                       2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925
                       0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23
                       .96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65
                       .24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925
                       .435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57
                       A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">→</span>
          </a>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-editor-border" />
            <span className="text-xs text-gray-600">Authentication via GitHub OAuth 2.0</span>
            <div className="flex-1 h-px bg-editor-border" />
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-editor-sidebar border border-editor-border p-4 space-y-2">
            {[
              'No password required',
              'Uses your existing GitHub account',
              'We only read your profile and email',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-gray-400">
                <div className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                {t}
              </div>
            ))}
          </div>

          <p className="text-center mt-8">
            <Link to="/" className="text-sm text-brand hover:text-brand-light transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
