import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../middleware/errorHandler'
import {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
  getRoomCode,
  saveRoomCode,
  getRoomMembers,
  createRoomSchema,
  updateRoomSchema,
  updateCodeSchema,
} from '../controllers/rooms.controller'
import {
  executeCode,
  executeCodeSchema,
} from '../controllers/code.controller'
import {
  listVersions,
  getVersion,
  compareVersions,
  createSnapshot,
  restoreVersion,
  createSnapshotSchema,
} from '../controllers/versions.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ── Room CRUD ──────────────────────────────────────────
router.post('/',              validate(createRoomSchema), asyncHandler(createRoom))
router.get('/',               asyncHandler(getRooms))
router.get('/:roomId',        asyncHandler(getRoom))
router.patch('/:roomId',      validate(updateRoomSchema), asyncHandler(updateRoom))
router.put('/:roomId',        validate(updateRoomSchema), asyncHandler(updateRoom))
router.delete('/:roomId',     asyncHandler(deleteRoom))

// ── Room Memberships ───────────────────────────────────
router.get('/:roomId/members', asyncHandler(getRoomMembers))
router.post('/:roomId/join',   asyncHandler(joinRoom))
router.post('/:roomId/leave',  asyncHandler(leaveRoom))

// ── Code Document Saving & Retrieving ──────────────────
router.get('/:roomId/code',    asyncHandler(getRoomCode))
router.put('/:roomId/code',    validate(updateCodeSchema), asyncHandler(saveRoomCode))

// ── Code execution ─────────────────────────────────────
router.post('/:roomId/execute', validate(executeCodeSchema), asyncHandler(executeCode))

// ── Snapshots & version history ────────────────────────
router.post('/:roomId/snapshots',                   validate(createSnapshotSchema), asyncHandler(createSnapshot))
router.get('/:roomId/versions',                     asyncHandler(listVersions))
router.get('/:roomId/versions/compare',             asyncHandler(compareVersions))
router.get('/:roomId/versions/:versionId',          asyncHandler(getVersion))
router.post('/:roomId/versions/:versionId/restore', asyncHandler(restoreVersion))

export default router
