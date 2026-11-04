import { Request, Response, NextFunction, RequestHandler } from 'express'
import { ZodError } from 'zod'

/**
 * errorHandler.ts — Global Express error handling middleware.
 *
 * Must be registered LAST with app.use() in index.ts.
 * Catches errors thrown or passed to next(err) anywhere in the app.
 */

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean  // true = known/expected error; false = bug
}

/** Create a structured error with a status code */
export function createError(message: string, statusCode = 500): AppError {
  const err: AppError = new Error(message)
  err.statusCode = statusCode
  err.isOperational = true
  return err
}

/** Wrapper for async route handlers to forward uncaught errors to error middleware */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/** Express 404 handler — call this for any route not matched */
export function notFound(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
  })
}

/** Global error handler middleware */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors — return the specific field errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  const statusCode = err.statusCode ?? 500
  const message    = err.isOperational ? err.message : 'Internal server error'

  // Log server errors (5xx) for debugging
  if (statusCode >= 500) {
    console.error('[Server Error]', err)
  }

  res.status(statusCode).json({ error: message })
}
