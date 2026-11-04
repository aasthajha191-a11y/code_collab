import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

/**
 * validate.ts — Request validation middleware using Zod schemas.
 *
 * Usage:
 *   router.post('/rooms', authenticate, validate(createRoomSchema), createRoomController)
 *
 * The validated + typed data is attached to req.body.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
      return
    }
    // Replace req.body with the parsed (and type-safe) version
    req.body = result.data
    next()
  }
}
