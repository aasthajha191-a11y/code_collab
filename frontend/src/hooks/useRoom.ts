import { useState, useEffect, useCallback } from 'react'
import { roomsApi } from '@/services/api'

export interface RoomMember {
  id: string
  role: string
  user: { id: string; name: string; avatarUrl: string | null }
}

export interface RoomDetail {
  id: string
  name: string
  language: string
  currentCode: string
  createdAt: string
  updatedAt: string
  ownerId: string
  owner: { id: string; name: string; avatarUrl: string | null }
  members: RoomMember[]
  _count: { snapshots: number }
}

export function useRoom(roomId: string | undefined) {
  const [room, setRoom]         = useState<RoomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchRoom = useCallback(async () => {
    if (!roomId) return
    try {
      setIsLoading(true)
      setError(null)
      // Attempt to auto-join the room if accessed via shareable link
      try {
        await roomsApi.join(roomId)
      } catch {
        // If join fails (e.g. already joined), continue to fetch room details
      }
      const data = await roomsApi.get(roomId)
      setRoom(data)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } }
      if (e.response?.status === 403) setError('You are not authorized to view this room.')
      else if (e.response?.status === 404) setError('Room not found.')
      else setError('Failed to load room.')
    } finally {
      setIsLoading(false)
    }
  }, [roomId])

  useEffect(() => { fetchRoom() }, [fetchRoom])

  return { room, isLoading, error, refetch: fetchRoom, setRoom }
}
