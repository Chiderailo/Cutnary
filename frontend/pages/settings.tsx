/**
 * Settings - User Profile, Security, Account, Preferences
 * Social media configuration moved to /social
 */

import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '@/components/Header'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const ASPECT_RATIOS = [
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
] as const

const CLIP_LENGTHS = [
  { value: 'auto', label: 'Auto' },
  { value: '30s', label: '30s' },
  { value: '60s', label: '60s' },
  { value: '90s', label: '90s' },
] as const

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
] as const

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  agency: 'Agency',
}

function Toast({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 shadow-xl ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {message}
      <button onClick={onDismiss} className="ml-3 underline hover:no-underline">
        Dismiss
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, refreshUser } = useAuth()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{
    fullName: string
    email: string
    profilePictureUrl: string | null
    authProvider: string | null
    createdAt: string
    subscriptionPlan: string | null
  } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [preferences, setPreferences] = useState({
    default_aspect_ratio: '9:16',
    default_clip_length: 'auto',
    default_language: 'en',
  })
  const [savingPreferences, setSavingPreferences] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const isGoogleUser = profile?.authProvider === 'google'

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent('/settings')}`)
      return
    }
    Promise.all([
      apiJson<{ data?: { fullName?: string; email?: string; profilePictureUrl?: string | null; authProvider?: string | null; createdAt?: string; subscriptionPlan?: string | null }; fullName?: string; email?: string }>('/api/auth/me'),
      apiJson<{ success: boolean; preferences?: { default_aspect_ratio: string; default_clip_length: string; default_language: string } }>('/api/user/preferences'),
    ])
      .then(([meRes, prefRes]) => {
        const raw = meRes as { data?: Record<string, unknown> }
        const u = raw.data ?? meRes
        setProfile({
          fullName: u.fullName ?? '',
          email: u.email ?? '',
          profilePictureUrl: u.profilePictureUrl ?? null,
          authProvider: u.authProvider ?? null,
          createdAt: u.createdAt ?? new Date().toISOString(),
          subscriptionPlan: u.subscriptionPlan ?? 'free',
        })
        setDisplayName(u.fullName ?? '')
        if (prefRes.success && prefRes.preferences) {
          setPreferences(prefRes.preferences)
        }
      })
      .catch(() => setToast({ type: 'error', message: 'Failed to load profile' }))
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setToast(null)
    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: displayName.trim() || null }),
      })
      const data = await parseResponseJson<{ success?: boolean; error?: string }>(res)
      if (data.success) {
        setToast({ type: 'success', message: 'Profile updated' })
        setProfile((p) => (p ? { ...p, fullName: displayName.trim() } : null))
        refreshUser()
      } else {
        setToast({ type: 'error', message: data.error ?? 'Failed to save' })
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to save' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Please select an image file' })
      return
    }
    if (file.size > 500 * 1024) {
      setToast({ type: 'error', message: 'Image must be under 500KB' })
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setSavingProfile(true)
      setToast(null)
      try {
        const res = await apiFetch('/api/user/profile', {
          method: 'PATCH',
          body: JSON.stringify({ profile_picture_url: dataUrl }),
        })
        const data = await parseResponseJson<{ success?: boolean; error?: string }>(res)
        if (data.success) {
          setToast({ type: 'success', message: 'Profile picture updated' })
          setProfile((p) => (p ? { ...p, profilePictureUrl: dataUrl } : null))
          refreshUser()
        } else {
          setToast({ type: 'error', message: data.error ?? 'Failed to save' })
        }
      } catch (err) {
        setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save' })
      } finally {
        setSavingProfile(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match' })
      return
    }
    if (newPassword.length < 8) {
      setToast({ type: 'error', message: 'New password must be at least 8 characters' })
      return
    }
    setSavingPassword(true)
    setToast(null)
    try {
      const res = await apiFetch('/api/user/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      const data = await parseResponseJson<{ success?: boolean; error?: string }>(res)
      if (data.success) {
        setToast({ type: 'success', message: 'Password updated' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setToast({ type: 'error', message: data.error ?? 'Failed to update password' })
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to update password' })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSavePreferences = async () => {
    setSavingPreferences(true)
    setToast(null)
    try {
      const res = await apiFetch('/api/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      })
      const data = await parseResponseJson<{ success?: boolean; error?: string }>(res)
      if (data.success) {
        setToast({ type: 'success', message: 'Preferences saved' })
      } else {
        setToast({ type: 'error', message: data.error ?? 'Failed to save' })
      }
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to save' })
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm.toLowerCase() !== 'delete') {
      setToast({ type: 'error', message: 'Type DELETE to confirm' })
      return
    }
    setDeleting(true)
    setToast(null)
    try {
      await apiFetch('/api/user', { method: 'DELETE' })
      logout()
      router.replace('/')
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to delete account' })
    } finally {
      setDeleting(false)
      setDeleteModalOpen(false)
      setDeleteConfirm('')
    }
  }

  if (!isAuthenticated) return null

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  )

  return (
    <>
      <Head>
        <title>Profile & Settings – Cutnary</title>
        <meta name="description" content="Manage your profile and preferences" />
      </Head>

      <div className="min-h-screen bg-[#060607] text-zinc-100">
        <Header />
        
        {/* Ambient Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        </div>

        <main className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="mb-10 text-center sm:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Settings</h1>
            <p className="mt-3 text-lg text-zinc-400">Manage your account, preferences, and security.</p>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-[32px] border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            <div className="grid gap-8">
              {/* PROFILE SECTION */}
              <div className="group overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-zinc-700">
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-xl">👤</div>
                  <h2 className="text-2xl font-bold text-white">Profile Details</h2>
                </div>
                
                <div className="flex flex-col gap-10 sm:flex-row sm:items-start">
                  <div className="relative shrink-0 self-center sm:self-start">
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      disabled={savingProfile}
                      className="relative overflow-hidden rounded-[32px] ring-4 ring-zinc-800/50 transition-all hover:ring-violet-500/50 disabled:opacity-50 group/avatar shadow-2xl"
                      aria-label="Change profile picture"
                    >
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                      <div className="flex h-32 w-32 items-center justify-center bg-zinc-800 text-3xl font-bold text-white">
                        {profile?.profilePictureUrl ? (
                          <img
                            src={profile.profilePictureUrl}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/avatar:scale-110"
                          />
                        ) : (
                          user?.initials ?? user?.email?.slice(0, 2).toUpperCase() ?? '?'
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover/avatar:opacity-100">
                        <span className="text-xs font-bold uppercase tracking-widest text-white">Update</span>
                      </div>
                    </button>
                  </div>
                  
                  <div className="min-w-0 flex-1 space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your name"
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3.5 text-white placeholder-zinc-600 transition-all focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
                        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/20 px-5 py-3.5 text-zinc-500">
                          {isGoogleUser ? (
                            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          <span className="truncate text-sm font-medium">{profile?.email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="rounded-2xl bg-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving Changes…' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECURITY & PREFERENCES GRID */}
              <div className="grid gap-8 lg:grid-cols-2">
                {/* PREFERENCES */}
                <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-zinc-700">
                  <div className="mb-8 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-xl">⚙️</div>
                    <h2 className="text-2xl font-bold text-white">Preferences</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Default Aspect Ratio</label>
                      <select
                        value={preferences.default_aspect_ratio}
                        onChange={(e) => setPreferences((p) => ({ ...p, default_aspect_ratio: e.target.value }))}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3.5 text-white transition-all focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        {ASPECT_RATIOS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Default Clip Length</label>
                      <select
                        value={preferences.default_clip_length}
                        onChange={(e) => setPreferences((p) => ({ ...p, default_clip_length: e.target.value }))}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3.5 text-white transition-all focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        {CLIP_LENGTHS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleSavePreferences}
                      disabled={savingPreferences}
                      className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
                    >
                      {savingPreferences ? 'Saving…' : 'Save Preferences'}
                    </button>
                  </div>
                </div>

                {/* SECURITY */}
                <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-zinc-700">
                  <div className="mb-8 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-600/20 text-xl">🔒</div>
                    <h2 className="text-2xl font-bold text-white">Security</h2>
                  </div>

                  {isGoogleUser ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                       <svg className="mb-4 h-12 w-12 text-zinc-700" viewBox="0 0 24 24" fill="currentColor">
                         <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                       </svg>
                       <p className="text-sm font-medium text-zinc-400">Your account is secured via Google.</p>
                       <p className="mt-1 text-xs text-zinc-600">Password management is handled by your Google account.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-white transition-all focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-3 text-white transition-all focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                      <button
                        onClick={handleSavePassword}
                        disabled={savingPassword}
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
                      >
                        {savingPassword ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ACCOUNT / DANGER ZONE */}
              <div className="overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-zinc-700">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Account Management</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      Created on {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-zinc-800/50 px-5 py-3 border border-zinc-700/30">
                       <span className="h-2 w-2 rounded-full bg-green-500" />
                       <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                         {PLAN_LABELS[profile?.subscriptionPlan ?? 'free'] ?? 'Free'} Plan
                       </span>
                    </div>
                    <Link
                      href="/pricing"
                      className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-zinc-200 active:scale-95"
                    >
                      Upgrade Plan
                    </Link>
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-95"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Account Modal */}
          {deleteModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
              onClick={() => !deleting && setDeleteModalOpen(false)}
            >
              <div
                className="mx-4 w-full max-w-md overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 p-8 shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-3xl">⚠️</div>
                <h3 className="mb-2 text-2xl font-bold text-white">Delete Account?</h3>
                <p className="mb-6 text-zinc-500">
                  This action is permanent and will delete all your viral clips, settings, and social data.
                </p>
                
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-600">Type <span className="text-white">DELETE</span> to confirm</label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="mb-8 w-full rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-white placeholder-red-500/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                
                <div className="flex gap-4">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                    className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white transition-all hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirm.toLowerCase() !== 'delete'}
                    className="flex-1 rounded-2xl bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-all hover:bg-red-500 active:scale-95 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div className={`fixed bottom-8 right-8 z-50 flex animate-in slide-in-from-right-10 items-center gap-4 rounded-[20px] px-6 py-4 shadow-2xl backdrop-blur-xl border ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <span className="font-bold">{toast.message}</span>
              <button onClick={() => setToast(null)} className="ml-4 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100">Close</button>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
