import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../database/prisma'
import { createError } from '../middleware/errorHandler'
import { setDocContent } from '../collaboration/docManager'

export const createSnapshotSchema = z.object({
  code:     z.string().max(65536),
  language: z.enum(['python', 'javascript', 'java']),
})

/** GET /api/rooms/:roomId/versions — List all snapshots for room */
export async function listVersions(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  const snapshots = await prisma.codeSnapshot.findMany({
    where:   { roomId },
    orderBy: { versionNumber: 'desc' },
    select: {
      id:            true,
      versionNumber: true,
      language:      true,
      createdAt:     true,
      createdBy:     { select: { id: true, name: true, avatarUrl: true } },
    },
  })
  res.json(snapshots)
}

/** GET /api/rooms/:roomId/versions/:versionId — Fetch a specific snapshot with code */
export async function getVersion(req: Request, res: Response): Promise<void> {
  const { roomId, versionId } = req.params
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  const snapshot = await prisma.codeSnapshot.findFirst({
    where:   { id: versionId, roomId },
    include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
  })
  if (!snapshot) throw createError('Version not found', 404)
  res.json(snapshot)
}

/** GET /api/rooms/:roomId/versions/compare — Compare two snapshots */
export async function compareVersions(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const fromId = (req.query.from || req.query.fromId) as string
  const toId = (req.query.to || req.query.toId) as string
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  if (!fromId || !toId) {
    throw createError('Both "from" and "to" snapshot IDs are required for comparison', 400)
  }

  const [fromSnapshot, toSnapshot] = await Promise.all([
    prisma.codeSnapshot.findFirst({ where: { id: fromId, roomId } }),
    prisma.codeSnapshot.findFirst({ where: { id: toId, roomId } }),
  ])

  if (!fromSnapshot || !toSnapshot) {
    throw createError('One or both specified snapshot versions do not exist', 404)
  }

  // Generate line-by-line diff metadata
  const fromLines = fromSnapshot.code.split('\n')
  const toLines = toSnapshot.code.split('\n')

  res.json({
    roomId,
    from: {
      id: fromSnapshot.id,
      versionNumber: fromSnapshot.versionNumber,
      code: fromSnapshot.code,
      language: fromSnapshot.language,
      createdAt: fromSnapshot.createdAt,
    },
    to: {
      id: toSnapshot.id,
      versionNumber: toSnapshot.versionNumber,
      code: toSnapshot.code,
      language: toSnapshot.language,
      createdAt: toSnapshot.createdAt,
    },
    diff: {
      fromLineCount: fromLines.length,
      toLineCount: toLines.length,
      hasChanges: fromSnapshot.code !== toSnapshot.code,
    },
  })
}

/** POST /api/rooms/:roomId/snapshots — Manually create a snapshot */
export async function createSnapshot(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const { code, language } = req.body as z.infer<typeof createSnapshotSchema>
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  const snapshot = await saveSnapshot(roomId, code, language, userId)
  const statusCode = snapshot.unchanged ? 200 : 201
  res.status(statusCode).json(snapshot)
}

/** POST /api/rooms/:roomId/versions/:versionId/restore — Restore version as active code */
export async function restoreVersion(req: Request, res: Response): Promise<void> {
  const { roomId, versionId } = req.params
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  const snapshot = await prisma.codeSnapshot.findFirst({ where: { id: versionId, roomId } })
  if (!snapshot) throw createError('Version not found', 404)

  // 1. Update database current code
  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: { currentCode: snapshot.code, language: snapshot.language, updatedAt: new Date() },
  })

  // 2. Update authoritative in-memory Yjs document so all connected collaborators reflect restored code
  setDocContent(roomId, snapshot.code)

  // 3. Create a snapshot recording the restoration
  const newSnapshot = await saveSnapshot(roomId, snapshot.code, snapshot.language, userId)

  res.json({
    message: 'Version restored successfully',
    currentCode: updatedRoom.currentCode,
    newSnapshot,
    restoredFrom: versionId,
  })
}

// ── Helpers ──────────────────────────────────────────

async function assertMembership(roomId: string, userId: string): Promise<void> {
  const m = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } })
  if (!m) throw createError('You are not a member of this room', 403)
}

export async function saveSnapshot(
  roomId: string,
  code: string,
  language: string,
  createdById?: string
): Promise<{ id: string; versionNumber: number; createdAt: Date; unchanged?: boolean }> {
  const latest = await prisma.codeSnapshot.findFirst({
    where:   { roomId },
    orderBy: { versionNumber: 'desc' },
    select:  { id: true, versionNumber: true, code: true, createdAt: true },
  })

  // Avoid creating redundant snapshots if code has not changed
  if (latest && latest.code === code) {
    return {
      id: latest.id,
      versionNumber: latest.versionNumber,
      createdAt: latest.createdAt,
      unchanged: true,
    }
  }

  const versionNumber = (latest?.versionNumber ?? 0) + 1
  const snapshot = await prisma.codeSnapshot.create({
    data:   { roomId, code, language, versionNumber, createdById: createdById ?? null },
    select: { id: true, versionNumber: true, createdAt: true },
  })

  await prisma.room.update({
    where: { id: roomId },
    data: { currentCode: code, updatedAt: new Date() },
  })

  return snapshot
}
