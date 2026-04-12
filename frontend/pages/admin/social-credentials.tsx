import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'

const PLATFORMS = ['youtube', 'tiktok', 'instagram', 'facebook'] as const
type Platform = (typeof PLATFORMS)[number]

export default function AdminSocialCredentialsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [status, setStatus] = useState<Record<string, boolean>>({})
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await apiJson<{ platforms: Array<{ platform: string; configured: boolean }> }>(
      '/api/admin/social-credentials'
    )
    setAccessDenied(false)
    const next = Object.fromEntries(res.platforms.map((p) => [p.platform, p.configured]))
    setStatus(next)
  }

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return void router.replace('/auth/login?redirect=/admin/social-credentials')
    load().catch(() => setAccessDenied(true))
  }, [isLoading, isAuthenticated, router])

  const save = async () => {
    if (!editingPlatform || !clientId.trim() || !clientSecret.trim()) return
    setSaving(true)
    const res = await apiFetch('/api/admin/social-credentials', {
      method: 'POST',
      body: JSON.stringify({
        platform: editingPlatform,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
      }),
    })
    const data = await parseResponseJson<{ success?: boolean }>(res)
    if (data.success) {
      setClientId('')
      setClientSecret('')
      setEditingPlatform(null)
      await load()
    }
    setSaving(false)
  }

  const remove = async (target: string) => {
    const res = await apiFetch(`/api/admin/social-credentials/${target}`, { method: 'DELETE' })
    const data = await parseResponseJson<{ success?: boolean }>(res)
    if (data.success) {
      await load()
    }
  }

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0b] p-8 text-zinc-400">Loading admin…</div>
  if (!isAuthenticated) return <div className="min-h-screen bg-[#0a0a0b] p-8 text-zinc-400">Redirecting to login…</div>
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] p-8 text-zinc-300">
        Admin access required.
      </div>
    )
  }

  return (
    <AdminLayout title="Social Credentials">
      <div className="space-y-6">
        <p className="text-sm text-zinc-400">
          Platform credentials are app-wide. Once configured, all users can connect that platform.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLATFORMS.map((p) => (
            <div key={p} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="font-medium text-white">{p}</p>
              <p className={`mt-1 text-sm ${status[p] ? 'text-green-400' : 'text-amber-400'}`}>
                {status[p] ? 'Configured' : 'Not configured'}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setEditingPlatform(p)
                    setClientId('')
                    setClientSecret('')
                  }}
                  className="rounded bg-violet-600 px-3 py-1 text-xs text-white hover:bg-violet-500"
                >
                  {status[p] ? 'Reconfigure' : 'Configure'}
                </button>
                {status[p] && (
                  <button
                    onClick={() => remove(p)}
                    className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:border-red-500 hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {editingPlatform && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="mb-3 text-lg font-semibold text-white">Configure {editingPlatform}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={`${editingPlatform} client id`}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
              <input
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={`${editingPlatform} client secret`}
                type="password"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={save}
                disabled={saving || !clientId.trim() || !clientSecret.trim()}
                className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingPlatform(null)
                  setClientId('')
                  setClientSecret('')
                }}
                className="rounded border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

