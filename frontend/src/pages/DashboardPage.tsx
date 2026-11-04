import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, LogIn, Trash2, Users, Clock,
  Code2, Copy, Check, AlertCircle, FolderOpen
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { Navbar } from '@/components/Navbar'
import { Modal } from '@/components/Modal'
import { Spinner } from '@/components/Spinner'
import { LanguageSelector, LanguageBadge, Language } from '@/components/LanguageSelector'
import { Avatar } from '@/components/Avatar'
import { useRooms, Room } from '@/hooks/useRooms'
import { getRoomShareUrl } from '@/utils/shareUrl'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const { rooms, isLoading, error, createRoom, deleteRoom, joinRoom } = useRooms()

  // ── Create room modal state ──────────────────────────────
  const [showCreate, setShowCreate]   = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomLang, setNewRoomLang] = useState<Language>('python')
  const [creating, setCreating]       = useState(false)

  // ── Join room modal state ────────────────────────────────
  const [showJoin, setShowJoin]   = useState(false)
  const [joinId, setJoinId]       = useState('')
  const [joining, setJoining]     = useState(false)

  // ── Search ───────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Handlers ────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreating(true)
    try {
      const room = await createRoom(newRoomName.trim(), newRoomLang)
      toast.success(`Room "${room.name}" created!`)
      setShowCreate(false)
      setNewRoomName('')
      navigate(`/room/${room.id}`)
    } catch {
      toast.error('Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const id = joinId.trim()
    if (!id) return
    setJoining(true)
    try {
      await joinRoom(id)
      toast.success('Joined room!')
      setShowJoin(false)
      setJoinId('')
      navigate(`/room/${id}`)
    } catch {
      toast.error('Room not found or access denied')
    } finally {
      setJoining(false)
    }
  }

  async function handleDelete(room: Room, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete room "${room.name}"? This cannot be undone.`)) return
    try {
      await deleteRoom(room.id)
    } catch {
      toast.error('Failed to delete room')
    }
  }

  function handleOpenRoom(room: Room) {
    navigate(`/room/${room.id}`)
  }

  return (
    <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
      <Navbar />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {rooms.length === 0
                  ? 'Create your first room to start collaborating'
                  : `You have ${rooms.length} room${rooms.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJoin(true)}
                className="btn-secondary gap-2"
              >
                <LogIn className="h-4 w-4" />
                Join Room
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="btn-primary gap-2"
              >
                <Plus className="h-4 w-4" />
                New Room
              </button>
            </div>
          </div>

          {/* ── Search bar ──────────────────────────────────── */}
          {rooms.length > 0 && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search rooms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          )}

          {/* ── Room list ───────────────────────────────────── */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-red-400 font-medium">{error}</p>
              <p className="text-sm text-gray-500">Make sure the backend is running on port 4000</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              hasSearch={search.length > 0}
              onCreateClick={() => setShowCreate(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  currentUserId={user?.id ?? ''}
                  onClick={() => handleOpenRoom(room)}
                  onDelete={(e) => handleDelete(room, e)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Create Room Modal ──────────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Room">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Room Name
            </label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="e.g. CS Lab Session, Interview Prep..."
              className="input"
              autoFocus
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Programming Language
            </label>
            <LanguageSelector
              value={newRoomLang}
              onChange={setNewRoomLang}
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newRoomName.trim() || creating}
              className="btn-primary flex-1 justify-center"
            >
              {creating ? <Spinner size="sm" /> : <><Plus className="h-4 w-4" /> Create Room</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Join Room Modal ────────────────────────────────── */}
      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Join a Room">
        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Room ID or Link
            </label>
            <input
              type="text"
              value={joinId}
              onChange={(e) => {
                // Accept full URLs like http://localhost:5173/room/abc123
                const val = e.target.value
                const match = val.match(/\/room\/([a-zA-Z0-9]+)/)
                setJoinId(match ? match[1] : val)
              }}
              placeholder="Paste room ID or invite link..."
              className="input font-mono"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1.5">
              You can paste the full invite URL or just the room ID
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowJoin(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!joinId.trim() || joining}
              className="btn-primary flex-1 justify-center"
            >
              {joining ? <Spinner size="sm" /> : <><LogIn className="h-4 w-4" /> Join Room</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── Room Card ──────────────────────────────────────────────

function RoomCard({
  room, currentUserId, onClick, onDelete
}: {
  room: Room
  currentUserId: string
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [copied, setCopied] = useState(false)
  const isOwner = room.ownerId === currentUserId

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation()
    const link = getRoomShareUrl(room.id)
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClick}
      className="card group cursor-pointer hover:border-brand/50 hover:bg-editor-highlight
                 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
            <Code2 className="h-4 w-4 text-brand" />
          </div>
          <h3 className="font-semibold text-white truncate text-sm group-hover:text-brand transition-colors">
            {room.name}
          </h3>
        </div>
        {isOwner && (
          <span className="badge bg-brand/10 text-brand shrink-0">Owner</span>
        )}
      </div>

      {/* Language + stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <LanguageBadge language={room.language} />
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {room._count.members}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Owner info */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Avatar name={room.owner.name} avatarUrl={room.owner.avatarUrl} size="xs" />
        <span className="truncate">{room.owner.name}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-editor-border">
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand transition-colors px-2 py-1 rounded hover:bg-brand/10"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>

        {isOwner && (
          <button
            onClick={onDelete}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────

function EmptyState({ hasSearch, onCreateClick }: { hasSearch: boolean; onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-16 w-16 rounded-2xl bg-editor-sidebar border border-editor-border flex items-center justify-center mb-4">
        <FolderOpen className="h-8 w-8 text-gray-600" />
      </div>
      {hasSearch ? (
        <>
          <p className="text-gray-400 font-medium">No rooms match your search</p>
          <p className="text-sm text-gray-600 mt-1">Try a different name</p>
        </>
      ) : (
        <>
          <p className="text-gray-400 font-medium">No rooms yet</p>
          <p className="text-sm text-gray-600 mt-1 mb-6">
            Create a room to start coding with others
          </p>
          <button onClick={onCreateClick} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            Create your first room
          </button>
        </>
      )}
    </div>
  )
}
