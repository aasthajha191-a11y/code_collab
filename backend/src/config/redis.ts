import { Redis } from 'ioredis'
import { env } from './env'

/**
 * redis.ts — Redis client setup.
 *
 * Two clients needed because Socket.IO Redis adapter
 * requires separate pub and sub connections.
 *
 * If Redis is not running, the app continues in
 * single-instance mode — no errors, no spam.
 */

function createRedisClient(label: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    enableReadyCheck:     false,
    lazyConnect:          true,
    maxRetriesPerRequest: null,
    // Stop retrying after 3 attempts — prevents log spam when Redis isn't running
    retryStrategy: (times: number) => {
      if (times >= 3) return null   // null = stop retrying
      return times * 300
    },
  })

  // Only log on first connect and permanent failures — not every retry
  client.on('connect',  () => console.log(`[Redis ${label}] Connected`))
  client.on('error',    () => { /* silently ignore — expected when Redis not running */ })
  client.on('close',    () => { /* silently ignore */ })

  return client
}

export const pubClient = createRedisClient('pub')
// subClient is a duplicate of pubClient — silence its errors the same way
export const subClient = pubClient.duplicate()
subClient.on('error', () => { /* silently ignore */ })

/** Connect both Redis clients. Called once during server startup. */
export async function connectRedis(): Promise<void> {
  await Promise.all([pubClient.connect(), subClient.connect()])
  console.log('[Redis] Both pub/sub clients connected')
}
