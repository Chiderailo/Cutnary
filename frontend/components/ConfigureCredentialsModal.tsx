/**
 * ConfigureCredentialsModal - Platform-specific API credentials configuration
 */

import { useState } from 'react'
import { apiFetch, parseResponseJson } from '@/lib/api'

export type CredentialsPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook'

const META_NOTE =
  'Instagram and Facebook use the same Meta App. Configuring one will configure both.'

const PLATFORM_CONFIG: Record<
  CredentialsPlatform,
  {
    title: string
    icon: string
    fields: { key: string; label: string; placeholder: string; type?: string }[]
    helperText: string
    linkUrl: string
    linkLabel: string
    metaNote?: string
  }
> = {
  youtube: {
    title: 'Configure YouTube',
    icon: '▶️',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'xxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-xxx', type: 'password' },
    ],
    helperText: 'Get from console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs',
    linkUrl: 'https://console.cloud.google.com',
    linkLabel: 'Open Google Cloud Console →',
  },
  tiktok: {
    title: 'Configure TikTok',
    icon: '🎵',
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'Your client key' },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'Your client secret', type: 'password' },
    ],
    helperText: 'Get from developers.tiktok.com → Manage Apps → your app',
    linkUrl: 'https://developers.tiktok.com',
    linkLabel: 'Open TikTok Developer Portal →',
  },
  instagram: {
    title: 'Configure Instagram',
    icon: '📸',
    fields: [
      { key: 'app_id', label: 'Meta App ID', placeholder: 'Your Meta App ID' },
      { key: 'app_secret', label: 'Meta App Secret', placeholder: 'Your Meta App Secret', type: 'password' },
    ],
    helperText: 'Get from developers.facebook.com → My Apps → your app → Settings → Basic',
    linkUrl: 'https://developers.facebook.com',
    linkLabel: 'Open Meta Developer Portal →',
    metaNote: 'Also used for Facebook',
  },
  facebook: {
    title: 'Configure Facebook',
    icon: '👤',
    fields: [
      { key: 'app_id', label: 'Meta App ID', placeholder: 'Your Meta App ID' },
      { key: 'app_secret', label: 'Meta App Secret', placeholder: 'Your Meta App Secret', type: 'password' },
    ],
    helperText: 'Get from developers.facebook.com → My Apps → your app → Settings → Basic',
    linkUrl: 'https://developers.facebook.com',
    linkLabel: 'Open Meta Developer Portal →',
    metaNote: 'Also used for Instagram',
  },
}

interface ConfigureCredentialsModalProps {
  platform: CredentialsPlatform | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  /** Which platforms have credentials configured. Used to show "Meta already configured" for Instagram/Facebook. */
  credentialsConfigured?: Record<string, boolean> | null
}

export default function ConfigureCredentialsModal({
  platform,
  isOpen,
  onClose,
  onSaved,
  credentialsConfigured,
}: ConfigureCredentialsModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!isOpen || !platform) return null

  const config = PLATFORM_CONFIG[platform]
  const isMetaPlatform = platform === 'instagram' || platform === 'facebook'
  const metaAlreadyConfigured =
    isMetaPlatform && (credentialsConfigured?.instagram === true || credentialsConfigured?.facebook === true)

  const updateField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleSave = async () => {
    const body: Record<string, string> = { platform }
    if (platform === 'youtube') {
      body.client_id = (values.client_id ?? '').trim()
      body.client_secret = (values.client_secret ?? '').trim()
    } else if (platform === 'tiktok') {
      body.client_key = (values.client_key ?? '').trim()
      body.client_secret = (values.client_secret ?? '').trim()
    } else {
      body.app_id = (values.app_id ?? '').trim()
      body.app_secret = (values.app_secret ?? '').trim()
    }
    const clientId = body.client_id ?? body.client_key ?? body.app_id ?? ''
    const clientSecret = body.client_secret ?? body.app_secret ?? ''
    if (!clientId || !clientSecret) {
      setError('Please fill in all fields')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch('/api/settings/social-credentials', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const data = await parseResponseJson<{ success?: boolean; error?: string }>(res)
      if (data.success) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          onSaved()
          onClose()
        }, 1200)
      } else {
        setError(data.error ?? 'Failed to save')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setValues({})
      setError(null)
      setSaved(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
              {config.icon}
            </div>
            <h3 className="text-lg font-semibold text-white">{config.title}</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-2xl text-green-400">
              ✓
            </div>
            <p className="text-lg font-medium text-green-400">Credentials saved!</p>
          </div>
        ) : metaAlreadyConfigured ? (
          <div className="py-6">
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-400">
              ✅ Meta App already configured. Just click Connect.
            </div>
            <p className="mb-4 text-sm text-zinc-500">{META_NOTE}</p>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            {isMetaPlatform && (
              <p className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
                {META_NOTE}
              </p>
            )}
            {config.metaNote && (
              <p className="mb-3 text-xs text-zinc-500">{config.metaNote}</p>
            )}
            <div className="space-y-4">
              {config.fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-sm font-medium text-zinc-400">
                    {field.label}
                  </label>
                  <input
                    type={field.type ?? 'text'}
                    value={values[field.key] ?? ''}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">{config.helperText}</p>
            <a
              href={config.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              {config.linkLabel}
            </a>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleClose}
                disabled={saving}
                className="flex-1 rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
