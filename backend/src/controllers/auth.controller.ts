import { Request, Response } from 'express'
import axios from 'axios'
import { prisma } from '../database/prisma'
import { env } from '../config/env'
import { generateToken, setAuthCookie, clearAuthCookie } from '../middleware/auth'

/**
 * auth.controller.ts — Handles GitHub OAuth 2.0 flow.
 *
 * Flow:
 * 1. GET /auth/github         → redirect to GitHub
 * 2. GET /auth/github/callback → GitHub sends back a `code`
 * 3. We exchange the `code` for an access token
 * 4. We use the token to get the user's GitHub profile
 * 5. We create/update the user in our DB
 * 6. We issue our own JWT stored in an HttpOnly cookie
 * 7. We redirect the browser to the frontend callback page
 */

/** Step 1: Redirect user to GitHub authorization page */
export function githubLogin(req: Request, res: Response): void {
  if (!env.GITHUB_CLIENT_ID) {
    // No credentials configured — show helpful dev message
    res.status(503).json({
      error: 'GitHub OAuth is not configured.',
      instructions: [
        'Create a GitHub OAuth App at https://github.com/settings/developers',
        'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file',
        `Set callback URL to: ${env.GITHUB_CALLBACK_URL}`,
      ],
    })
    return
  }

  const params = new URLSearchParams({
    client_id:    env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope:        'read:user user:email',
  })

  res.redirect(`https://github.com/login/oauth/authorize?${params}`)
}

/** Step 2–6: Handle GitHub's redirect back to our server */
export async function githubCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string | undefined

  if (!code) {
    res.redirect(`${env.FRONTEND_URL}/auth/callback?status=error&error=no_code`)
    return
  }

  try {
    // Exchange the authorization code for an access token
    const tokenRes = await axios.post<{ access_token: string; error?: string }>(
      'https://github.com/login/oauth/access_token',
      {
        client_id:     env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  env.GITHUB_CALLBACK_URL,
      },
      { headers: { Accept: 'application/json' } }
    )

    const accessToken = tokenRes.data.access_token
    if (!accessToken || tokenRes.data.error) {
      console.error('[Auth] GitHub token exchange failed:', tokenRes.data)
      res.redirect(`${env.FRONTEND_URL}/auth/callback?status=error&error=token_exchange_failed`)
      return
    }

    // Use the access token to fetch the GitHub user profile
    const [profileRes, emailsRes] = await Promise.all([
      axios.get<GithubProfile>('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get<GithubEmail[]>('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])

    const profile = profileRes.data
    const emails  = emailsRes.data

    // Find the primary verified email
    const primaryEmail =
      emails.find((e) => e.primary && e.verified)?.email ??
      emails.find((e) => e.verified)?.email ??
      null

    // Upsert: create user if they don't exist; update if they do
    const user = await prisma.user.upsert({
      where: { githubId: String(profile.id) },
      update: {
        name:      profile.name ?? profile.login,
        email:     primaryEmail,
        avatarUrl: profile.avatar_url,
      },
      create: {
        githubId:  String(profile.id),
        name:      profile.name ?? profile.login,
        email:     primaryEmail,
        avatarUrl: profile.avatar_url,
      },
    })

    // Issue our own JWT (we don't store the GitHub token)
    const jwt = generateToken(user.id)
    setAuthCookie(res, jwt)

    // Redirect to frontend — the AuthCallback page handles the rest
    res.redirect(`${env.FRONTEND_URL}/auth/callback?status=success`)
  } catch (err) {
    console.error('[Auth] GitHub callback error:', err)
    res.redirect(`${env.FRONTEND_URL}/auth/callback?status=error&error=server_error`)
  }
}

/** GET /api/auth/me — return the currently authenticated user */
export function getMe(req: Request, res: Response): void {
  res.json(req.authUser)
}

/** POST /api/auth/logout — clear the session cookie */
export function logout(req: Request, res: Response): void {
  clearAuthCookie(res)
  res.json({ message: 'Logged out successfully' })
}

// ── GitHub API response types ──────────────────────────
interface GithubProfile {
  id:         number
  login:      string
  name:       string | null
  avatar_url: string
}

interface GithubEmail {
  email:    string
  primary:  boolean
  verified: boolean
}
