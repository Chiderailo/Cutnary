/**
 * Settings - User Profile, Security, Account, Preferences
 * Social media configuration moved to /social
 */

import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
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

      <div className="min-h-screen bg-[#0a0a0b]">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
          <h1 className="mb-8 text-3xl font-bold text-white">Profile & Settings</h1>

          {loading ? (
            <p className="text-zinc-500">Loading…</p>
          ) : (
            <div className="space-y-6">
              {/* PROFILE SECTION */}
              <Card title="Profile">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={savingProfile}
                    className="relative shrink-0 self-start overflow-hidden rounded-full ring-2 ring-zinc-600 hover:ring-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                    aria-label="Change profile picture"
                  >
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <div className="flex h-24 w-24 items-center justify-center bg-zinc-800 text-2xl font-medium text-white">
                      {profile?.profilePictureUrl ? (
                        <img
                          src={profile.profilePictureUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user?.initials ?? user?.email?.slice(0, 2).toUpperCase() ?? '?'
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <span className="text-xs text-white">Change</span>
                    </div>
                  </button>
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-400">Display name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-400">Email</label>
                      <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-zinc-400">
                        {isGoogleUser ? (
                          <>
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            <span>Signed in with Google</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            <span>Email cannot be changed</span>
                          </>
                        )}
                        <span className="ml-auto text-white">{profile?.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </Card>

              {/* SECURITY SECTION - only for email/password users */}
              <Card title="Security">
                {isGoogleUser ? (
                  <p className="flex items-center gap-2 text-zinc-400">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    </svg>
                    Password managed by Google
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-400">Current password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-400">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-400">Confirm new password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      onClick={handleSavePassword}
                      disabled={savingPassword}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {savingPassword ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                )}
              </Card>

              {/* ACCOUNT SECTION */}
              <Card title="Account">
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Account created{' '}
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-zinc-700 px-3 py-1 text-sm font-medium text-white">
                      {PLAN_LABELS[profile?.subscriptionPlan ?? 'free'] ?? 'Free'}
                    </span>
                    <a
                      href="/billing"
                      className="rounded-lg border border-violet-500 px-4 py-2 text-sm font-medium text-violet-400 hover:bg-violet-500/10"
                    >
                      Upgrade Plan
                    </a>
                  </div>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                  >
                    Delete Account
                  </button>
                </div>
              </Card>

              {/* PREFERENCES SECTION */}
              <Card title="Preferences">
                <p className="mb-4 text-sm text-zinc-500">
                  These defaults are used when creating new clips on the home page.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-400">Default aspect ratio</label>
                    <select
                      value={preferences.default_aspect_ratio}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, default_aspect_ratio: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                    >
                      {ASPECT_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-400">Default clip length</label>
                    <select
                      value={preferences.default_clip_length}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, default_clip_length: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                    >
                      {CLIP_LENGTHS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-400">Default language</label>
                    <select
                      value={preferences.default_language}
                      onChange={(e) =>
                        setPreferences((p) => ({ ...p, default_language: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-violet-500 focus:outline-none"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {savingPreferences ? 'Saving…' : 'Save Preferences'}
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Delete Account Modal */}
          {deleteModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => !deleting && setDeleteModalOpen(false)}
            >
              <div
                className="mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-2 text-lg font-semibold text-white">Delete Account</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  This will permanently delete your account and all data. This cannot be undone.
                </p>
                <p className="mb-2 text-sm text-zinc-400">
                  Type <strong className="text-white">DELETE</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                    className="flex-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirm.toLowerCase() !== 'delete'}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
        </main>
      </div>
    </>
  )
}
