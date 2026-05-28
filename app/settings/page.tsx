'use client'

import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const { user, loading, updateProfile, updateAvatar } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name ?? '')
    }
  }, [user])

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.')
      return
    }

    setUploadingAvatar(true)
    setError(null)
    setMessage(null)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    const { error: updateError } = await updateAvatar(publicUrl)

    if (updateError) {
      setError(updateError)
    } else {
      setMessage('Avatar updated successfully.')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadingAvatar(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSaving(true)

    const { error } = await updateProfile(name.trim())

    if (error) {
      setError(error)
    } else {
      setMessage('Name updated successfully.')
    }
    setSaving(false)
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/todos" className="text-sm text-gray-500 hover:text-gray-900 transition">
            ← Back to todos
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}
        {message && (
          <div className="px-4 py-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-100">
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Avatar</h2>
          <p className="text-sm text-gray-500 mb-5">Upload a profile photo. JPG, PNG, or WebP — max 2MB.</p>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  No photo
                </div>
              )}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
                disabled={uploadingAvatar}
              />
              <label
                htmlFor="avatar-upload"
                className={`inline-block px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 cursor-pointer transition ${
                  uploadingAvatar
                    ? 'opacity-40 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {uploadingAvatar ? 'Uploading...' : 'Upload photo'}
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Profile</h2>
          <p className="text-sm text-gray-500 mb-5">Update the name shown in the app.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                {user.email}
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
