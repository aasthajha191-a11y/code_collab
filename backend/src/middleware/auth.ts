import { Request, Response, NextFunction, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { prisma } from '../database/prisma'

/**
 * auth.ts — JWT authentication middleware.
 *
 * The JWT is stored in an HttpOnly cookie named 'token'.
 * HttpOnly means JavaScript in the browser cannot read it,
 * which protects against XSS (cross-site scripting) attacks.
 *
 * Usage: add `authenticate` to any route that requires login.
 * Example: router.get('/me', authenticate, meController)
 */

// Attached user shape after authentication
export interface AuthUser {
  id: string
  name: string
  email: string | null
  avatarUrl: string | null
  githubId: string | null
}

// Extend Express Request type to include `user`
// We use a module augmentation pattern so Express's own `user` field
// is widened to include our type, avoiding the overload conflict.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser
    }
  }
}

// AuthRequest is just a convenience alias — use req.authUser inside handlers
export type AuthRequest = Request & { authUser: AuthUser }

interface JwtPayload {
  userId: string
  iat: number
  exp: number
}

/** Middleware: requires a valid JWT. Returns 401 if missing or invalid. */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Read token from HttpOnly cookie or Authorization header (Bearer token)
    let token = req.cookies?.token as string | undefined
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7).trim()
    }

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    // Verify the token signature and expiry
    let payload: JwtPayload
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }

    // Load the user from the database to confirm they still exist
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        githubId: true,
      },
    })

    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    // Attach user to the request object for downstream handlers
    req.authUser = user
    next()
  } catch (err) {
    console.error('[Auth Middleware] Unexpected error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/** Helper: generate a signed JWT for a given userId */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/** Helper: set the JWT as an HttpOnly cookie on the response */
export function setAuthCookie(res: Response, token: string): void {
  // If in production or cross-site HTTPS (e.g. Render frontend on onrender.com talking to backend on onrender.com),
  // sameSite: 'none' is required with secure: true
  const isSecure = env.COOKIE_SECURE || env.IS_PROD

  res.cookie('token', token, {
    httpOnly: true,        // not accessible by JavaScript
    secure: isSecure,      // true in production / HTTPS
    sameSite: isSecure ? 'none' : 'lax', // cross-site cookie support across separate Render domains
    maxAge: 7 * 24 * 60 * 60 * 1000,    // 7 days in ms
    path: '/',
  })
}

/** Helper: clear the auth cookie (used on logout) */
export function clearAuthCookie(res: Response): void {
  const isSecure = env.COOKIE_SECURE || env.IS_PROD
  res.clearCookie('token', {
    path: '/',
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
  })
}
