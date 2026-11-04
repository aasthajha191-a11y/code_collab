import { Link } from 'react-router-dom'
import { Code2 } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-editor-bg flex items-center justify-center">
      <div className="text-center">
        <Code2 className="h-12 w-12 text-brand mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-6">Page not found.</p>
        <Link to="/" className="btn-primary mx-auto">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
