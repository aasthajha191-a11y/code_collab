import { useState, useEffect, useCallback } from 'react'
import { roomsApi } from '@/services/api'
import toast from 'react-hot-toast'

export interface Room {
  id: string
  name: string
  language: string
  createdAt: string
  updatedAt: string
  ownerId: string
  role: string
  owner: { id: string; name: string; avatarUrl: string | null }
  _count: { members: number; snapshots: number }
}

export function useRooms() {
  const [rooms, setRooms]     = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await roomsApi.list()
      setRooms(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load rooms'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  const createRoom = useCallback(async (name: string, language: string) => {
    const room = await roomsApi.create({ name, language })
    setRooms((prev) => [room, ...prev])
    return room
  }, [])

  const deleteRoom = useCallback(async (roomId: string) => {
    await roomsApi.delete(roomId)
    setRooms((prev) => prev.filter((r) => r.id !== roomId))
    toast.success('Room deleted')
  }, [])

  const joinRoom = useCallback(async (roomId: string) => {
    await roomsApi.join(roomId)
    await fetchRooms()
  }, [fetchRooms])

  return { rooms, isLoading, error, fetchRooms, createRoom, deleteRoom, joinRoom }
}
