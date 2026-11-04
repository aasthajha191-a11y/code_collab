/**
 * shareUrl.ts — Public Share URL Helper
 *
 * Generates absolute share URLs for rooms.
 * In production, uses VITE_PUBLIC_URL or window.location.origin, ensuring
 * that generated links never contain hardcoded localhost when deployed.
 */
export function getRoomShareUrl(roomId: string): string {
  const customBase = import.meta.env.VITE_PUBLIC_URL as string | undefined
  const baseUrl = customBase
    ? customBase.replace(/\/$/, '')
    : window.location.origin

  return `${baseUrl}/room/${roomId}`
}

