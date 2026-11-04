import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate } from '../middleware/validate'
import {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
  createRoomSchema,
} from '../controllers/rooms.controller'
import {
  executeCode,
  executeCodeSchema,
} from '../controllers/code.controller'
import {
  listVersions,
  getVersion,
  createSnapshot,
  restoreVersion,
  createSnapshotSchema,
} from '../controllers/versions.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ── Room CRUD ──────────────────────────────────────────
router.post('/',          validate(createRoomSchema), createRoom)
router.get('/',           getRooms)
router.get('/:roomId',    getRoom)
router.post('/:roomId/join',  joinRoom)
router.post('/:roomId/leave', leaveRoom)
router.delete('/:roomId',     deleteRoom)

// ── Code execution ─────────────────────────────────────
router.post('/:roomId/execute', validate(executeCodeSchema), executeCode)

// ── Snapshots & version history ────────────────────────
router.post('/:roomId/snapshots',                     validate(createSnapshotSchema), createSnapshot)
router.get('/:roomId/versions',                       listVersions)
router.get('/:roomId/versions/:versionId',            getVersion)
router.post('/:roomId/versions/:versionId/restore',   restoreVersion)

export default router
