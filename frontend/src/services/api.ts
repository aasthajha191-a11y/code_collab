import axios from 'axios'

/**
 * api.ts — Centralised HTTP client
 *
 * All API calls go through this axios instance.
 * Base URL is empty — Vite's proxy forwards /api/* to http://localhost:4000
 * (see vite.config.ts). In production, Nginx handles the same proxying.
 */
const api = axios.create({
  baseURL: '',
  withCredentials: true, // send/receive cookies (JWT stored in HttpOnly cookie)
  headers: {
    'Content-Type': 'application/json',
  },
})

// -------------------------------------------------------
// Response interceptor — handle 401 globally
// -------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If any request gets a 401, the session has expired.
      // Redirect to login page (without importing react-router here).
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// -------------------------------------------------------
// Auth API
// -------------------------------------------------------
export const authApi = {
  /** Register a new user */
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post('/auth/register', data)
    return res.data
  },

  /** Login user with email and password */
  login: async (data: { email: string; password: string }) => {
    const res = await api.post('/auth/login', data)
    return res.data
  },

  /** Quick guest/demo login */
  guestLogin: async () => {
    const res = await api.post('/auth/guest')
    return res.data
  },

  /** Get the currently logged-in user (checks session) */
  me: async () => {
    const res = await api.get('/auth/me')
    return res.data
  },

  /** Log out — backend clears the cookie */
  logout: async () => {
    const res = await api.post('/auth/logout')
    return res.data
  },

  /** Redirect to GitHub OAuth — just a link, not an API call */
  githubLoginUrl: () => '/auth/github',
}

// -------------------------------------------------------
// Rooms API
// -------------------------------------------------------
export const roomsApi = {
  /** Create a new room */
  create: async (data: { name: string; language: string }) => {
    const res = await api.post('/api/rooms', data)
    return res.data
  },

  /** Get all rooms the current user is a member of */
  list: async () => {
    const res = await api.get('/api/rooms')
    return res.data
  },

  /** Get a single room by ID */
  get: async (roomId: string) => {
    const res = await api.get(`/api/rooms/${roomId}`)
    return res.data
  },

  /** Join a room using its ID */
  join: async (roomId: string) => {
    const res = await api.post(`/api/rooms/${roomId}/join`)
    return res.data
  },

  /** Leave a room */
  leave: async (roomId: string) => {
    const res = await api.post(`/api/rooms/${roomId}/leave`)
    return res.data
  },

  /** Delete a room (owner only) */
  delete: async (roomId: string) => {
    const res = await api.delete(`/api/rooms/${roomId}`)
    return res.data
  },
}

// -------------------------------------------------------
// Code execution API
// -------------------------------------------------------
export const codeApi = {
  /** Execute code via backend → Judge0 */
  execute: async (roomId: string, data: { code: string; language: string }) => {
    const res = await api.post(`/api/rooms/${roomId}/execute`, data)
    return res.data
  },
}

// -------------------------------------------------------
// Version history API
// -------------------------------------------------------
export const versionsApi = {
  /** List all snapshots for a room */
  list: async (roomId: string) => {
    const res = await api.get(`/api/rooms/${roomId}/versions`)
    return res.data
  },

  /** Get a specific snapshot */
  get: async (roomId: string, versionId: string) => {
    const res = await api.get(`/api/rooms/${roomId}/versions/${versionId}`)
    return res.data
  },

  /** Restore a snapshot as the current document */
  restore: async (roomId: string, versionId: string) => {
    const res = await api.post(`/api/rooms/${roomId}/versions/${versionId}/restore`)
    return res.data
  },

  /** Manually trigger a snapshot save */
  save: async (roomId: string, code: string, language: string) => {
    const res = await api.post(`/api/rooms/${roomId}/snapshots`, { code, language })
    return res.data
  },

  /** Compare two versions */
  compare: async (roomId: string, fromId: string, toId: string) => {
    const res = await api.get(`/api/rooms/${roomId}/versions/compare?fromId=${fromId}&toId=${toId}`)
    return res.data
  },
}

export default api
