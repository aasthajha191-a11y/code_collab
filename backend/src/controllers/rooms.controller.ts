import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../database/prisma'
import { createError } from '../middleware/errorHandler'

// ── Zod validation schemas ─────────────────────────────
export const createRoomSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  language: z.enum(['python', 'javascript', 'java']),
})

export const updateRoomSchema = z.object({
  name:        z.string().min(1).max(100).trim().optional(),
  language:    z.enum(['python', 'javascript', 'java']).optional(),
  currentCode: z.string().max(65536).optional(),
})

export const updateCodeSchema = z.object({
  code:     z.string().max(65536),
  language: z.enum(['python', 'javascript', 'java']).optional(),
})

// ── Controllers ─────────────────────────────────────────

/** POST /api/rooms — Create a new room */
export async function createRoom(req: Request, res: Response): Promise<void> {
  const { name, language } = req.body as z.infer<typeof createRoomSchema>
  const userId = req.authUser!.id

  const defaultTemplates: Record<string, string> = {
    python: '# Welcome to CodeCollab!\n\ndef main():\n    print("Hello from Python!")\n\nif __name__ == "__main__":\n    main()\n',
    javascript: '// Welcome to CodeCollab!\n\nfunction main() {\n  console.log("Hello from JavaScript!");\n}\n\nmain();\n',
    java: '// Welcome to CodeCollab!\n\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java!");\n  }\n}\n',
  }

  const currentCode = defaultTemplates[language] ?? ''

  const room = await prisma.room.create({
    data: {
      name,
      language,
      currentCode,
      ownerId: userId,
      members: {
        create: { userId, role: 'owner' },
      },
    },
    include: {
      owner:   { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      _count:  { select: { members: true, snapshots: true } },
    },
  })

  // Create initial version snapshot (v1)
  await prisma.codeSnapshot.create({
    data: {
      roomId: room.id,
      code: currentCode,
      language,
      versionNumber: 1,
      createdById: userId,
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
      _count:  { select: { snapshots: true, members: true } },
    },
  })

  if (!room) throw createError('Room not found', 404)

  const isMember = room.members.some((m) => m.userId === userId)
  if (!isMember) throw createError('You are not a member of this room', 403)

  res.json(room)
}

/** PATCH or PUT /api/rooms/:roomId — Update room details */
export async function updateRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id
  const { name, language, currentCode } = req.body as z.infer<typeof updateRoomSchema>

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  })

  if (!room) throw createError('Room not found', 404)

  const membership = room.members.find((m) => m.userId === userId)
  if (!membership) throw createError('You are not a member of this room', 403)

  // Only the owner can rename the room
  if (name !== undefined && name !== room.name && room.ownerId !== userId) {
    throw createError('Only the room owner can rename the room', 403)
  }

  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(currentCode !== undefined ? { currentCode } : {}),
      updatedAt: new Date(),
    },
    include: {
      owner:   { select: { id: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
      _count:  { select: { snapshots: true, members: true } },
    },
  })

  res.json(updatedRoom)
}

/** GET /api/rooms/:roomId/code — Retrieve current code document */
export async function getRoomCode(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id:          true,
      name:        true,
      currentCode: true,
      language:    true,
      updatedAt:   true,
      members:     { select: { userId: true } },
    },
  })

  if (!room) throw createError('Room not found', 404)

  const isMember = room.members.some((m) => m.userId === userId)
  if (!isMember) throw createError('You are not a member of this room', 403)

  res.json({
    roomId:      room.id,
    name:        room.name,
    code:        room.currentCode,
    language:    room.language,
    updatedAt:   room.updatedAt,
  })
}

/** PUT /api/rooms/:roomId/code — Save current code document */
export async function saveRoomCode(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id
  const { code, language } = req.body as z.infer<typeof updateCodeSchema>

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  })

  if (!room) throw createError('Room not found', 404)

  const isMember = room.members.some((m) => m.userId === userId)
  if (!isMember) throw createError('You are not a member of this room', 403)

  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      currentCode: code,
      ...(language ? { language } : {}),
      updatedAt: new Date(),
    },
    select: {
      id:          true,
      currentCode: true,
      language:    true,
      updatedAt:   true,
    },
  })

  res.json({
    message:   'Code saved successfully',
    roomId:    updatedRoom.id,
    code:      updatedRoom.currentCode,
    language:  updatedRoom.language,
    updatedAt: updatedRoom.updatedAt,
  })
}

/** GET /api/rooms/:roomId/members — Retrieve room members */
export async function getRoomMembers(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params
  const userId = req.authUser!.id

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!room) throw createError('Room not found', 404)

  const isMember = room.members.some((m) => m.userId === userId)
  if (!isMember) throw createError('You are not a member of this room', 403)

  res.json(room.members)
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
