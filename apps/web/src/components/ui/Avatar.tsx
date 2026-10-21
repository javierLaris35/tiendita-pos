import { useState } from 'react'
import { initials } from '../../utils/format'

const PALETTE = ['bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700']

interface AvatarProps {
  src?: string
  name?: string
  size?: string
  className?: string
}

export default function Avatar({ src, name = '', size = 'size-10', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const color = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length]
  if (!src || failed) {
    return (
      <div className={`${size} ${color} grid shrink-0 place-items-center rounded-lg text-xs font-semibold ${className}`}>
        {initials(name) || '?'}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-lg object-cover ${className}`}
    />
  )
}
