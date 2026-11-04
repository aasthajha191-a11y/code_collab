import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../database/prisma'
import { createError } from '../middleware/errorHandler'

export const createSnapshotSchema = z.object({
  code:     z.string().max(65536),
  language: z.enum(['python', 'javascript', 'java']),
})

/** GET /api/rooms/:roomId/versions */
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

/** GET /api/rooms/:roomId/versions/:versionId */
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

/** POST /api/rooms/:roomId/snapshots */
export async function createSnapshot(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const { code, language } = req.body as z.infer<typeof createSnapshotSchema>
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  const snapshot = await saveSnapshot(roomId, code, language, userId)
  res.status(201).json(snapshot)
}

/** POST /api/rooms/:roomId/versions/:versionId/restore */
export async function restoreVersion(req: Request, res: Response): Promise<void> {
  const { roomId, versionId } = req.params
  const userId = req.authUser!.id
  await assertMembership(roomId, userId)

  const snapshot = await prisma.codeSnapshot.findFirst({ where: { id: versionId, roomId } })
  if (!snapshot) throw createError('Version not found', 404)

  await prisma.room.update({ where: { id: roomId }, data: { currentCode: snapshot.code, language: snapshot.language } })
  const newSnapshot = await saveSnapshot(roomId, snapshot.code, snapshot.language, userId)

  res.json({ message: 'Version restored successfully', newSnapshot, restoredFrom: versionId })
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
): Promise<{ id: string; versionNumber: number; createdAt: Date }> {
  const latest = await prisma.codeSnapshot.findFirst({
    where:   { roomId },
    orderBy: { versionNumber: 'desc' },
    select:  { versionNumber: true },
  })

  const versionNumber = (latest?.versionNumber ?? 0) + 1
  const snapshot = await prisma.codeSnapshot.create({
    data:   { roomId, code, language, versionNumber, createdById: createdById ?? null },
    select: { id: true, versionNumber: true, createdAt: true },
  })

  await prisma.room.update({ where: { id: roomId }, data: { currentCode: code, updatedAt: new Date() } })
  return snapshot
}
