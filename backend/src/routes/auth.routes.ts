import { Router } from 'express'
import { githubLogin, githubCallback, getMe, logout } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth'

const router = Router()

/**
 * Auth routes — mounted at /auth in index.ts
 *
 * GET  /auth/github           → redirect to GitHub OAuth
 * GET  /auth/github/callback  → GitHub redirects back here
 * GET  /auth/me               → get current user (requires login)
 * POST /auth/logout           → clear session cookie
 */

// Redirect to GitHub authorization page
router.get('/github', githubLogin)

// GitHub sends the user back here after they approve
router.get('/github/callback', githubCallback)

// Get the currently logged-in user
router.get('/me', authenticate, getMe)

// Log out — clears the HttpOnly cookie
router.post('/logout', logout)

export default router
