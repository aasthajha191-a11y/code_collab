import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../database/prisma'
import { createError } from '../middleware/errorHandler'

// ── Zod validation schemas ─────────────────────────────
export const createRoomSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  language: z.enum(['python', 'javascript', 'java']),
})

// ── Controllers ─────────────────────────────────────────

/** POST /api/rooms — Create a new room */
export async function createRoom(req: Request, res: Response): Promise<void> {
  const { name, language } = req.body as z.infer<typeof createRoomSchema>
  const userId = req.authUser!.id

  const room = await prisma.room.create({
    data: {
      name,
      language,
      ownerId: userId,
      members: {
        create: { userId, role: 'owner' },
      },
    },
    include: {
      owner:   { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      _count:  { select: { members: true } },
    },
  })

  res.status(201).json(room)
}

/** GET /api/rooms — List rooms the current user belongs to */
export async function getRooms(req: Request, res: Response): Promise<void> {
  const userId = req.authUser!.id

  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          owner:  { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { members: true, snapshots: true } },
        },
      },
    },
    orderBy: { room: { updatedAt: 'desc' } },
  })

  const rooms = memberships.map((m) => ({
    ...m.room,
    role:     m.role,
    joinedAt: m.joinedAt,
  }))

  res.json(rooms)
}

/** GET /api/rooms/:roomId — Get a single room (must be a member) */
export async function getRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner:   { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      _count:  { select: { snapshots: true } },
    },
  })

  if (!room) throw createError('Room not found', 404)

  const isMember = room.members.some((m) => m.userId === userId)
  if (!isMember) throw createError('You are not a member of this room', 403)

  res.json(room)
}

/** POST /api/rooms/:roomId/join — Join a room */
export async function joinRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw createError('Room not found', 404)

  await prisma.roomMember.upsert({
    where:  { roomId_userId: { roomId, userId } },
    update: {},
    create: { roomId, userId, role: 'member' },
  })

  res.json({ message: 'Joined room successfully', roomId })
}

/** POST /api/rooms/:roomId/leave — Leave a room */
export async function leaveRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw createError('Room not found', 404)

  if (room.ownerId === userId)
    throw createError('Room owner cannot leave. Delete the room instead.', 400)

  await prisma.roomMember.delete({
    where: { roomId_userId: { roomId, userId } },
  })

  res.json({ message: 'Left room successfully' })
}

/** DELETE /api/rooms/:roomId — Delete a room (owner only) */
export async function deleteRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) throw createError('Room not found', 404)

  if (room.ownerId !== userId)
    throw createError('Only the room owner can delete this room', 403)

  await prisma.room.delete({ where: { id: roomId } })

  res.json({ message: 'Room deleted successfully' })
}
