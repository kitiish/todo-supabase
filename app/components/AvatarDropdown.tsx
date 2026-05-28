'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-pink-500',
]

function getAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function AvatarDropdown() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!user) return null

  const name: string = user.user_metadata?.full_name || user.email || ''
  const avatarUrl: string | undefined = user.user_metadata?.avatar_url
  const colorClass = getAvatarColor(user.email ?? name)
  const initials = name ? getInitials(name) : (user.email?.[0] ?? '?').toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    router.replace('/auth')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className={`w-full h-full ${colorClass} flex items-center justify-center text-white text-sm font-semibold`}>
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
          </div>

          <div className="border-t border-gray-100" />

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Settings
          </Link>

          <button
            role="menuitem"
            onClick={handleSignOut}
            className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
