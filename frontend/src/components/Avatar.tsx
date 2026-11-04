import clsx from 'clsx'

// Deterministic color per user based on their name
const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500',
  'bg-purple-500', 'bg-red-500', 'bg-yellow-500',
  'bg-pink-500', 'bg-teal-500',
]

function getColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface AvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  showTooltip?: boolean
}

export function Avatar({ name, avatarUrl, size = 'md', className, showTooltip = false }: AvatarProps) {
  const sizeClass = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  }[size]

  return (
    <div className={clsx('relative group', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={clsx('rounded-full object-cover ring-2 ring-editor-border', sizeClass)}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-editor-border',
            sizeClass,
            getColor(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded
                        whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {name}
        </div>
      )}
    </div>
  )
}

/** Stacked list of avatars with overflow count */
export function AvatarGroup({ users, max = 4 }: { users: { name: string; avatarUrl?: string | null }[]; max?: number }) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={i} name={u.name} avatarUrl={u.avatarUrl} size="sm" showTooltip />
      ))}
      {overflow > 0 && (
        <div className="h-8 w-8 rounded-full bg-editor-toolbar border-2 border-editor-border
                        flex items-center justify-center text-xs text-gray-400 font-medium">
          +{overflow}
        </div>
      )}
    </div>
  )
}
