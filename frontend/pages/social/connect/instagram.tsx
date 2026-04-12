/**
 * Instagram OAuth connect - redirects to backend OAuth flow
 */

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { apiFetch, parseResponseJson } from '@/lib/api'

export default function ConnectInstagram() {
  const router = useRouter()

  useEffect(() => {
    apiFetch('/api/social/connect', {
      method: 'POST',
      body: JSON.stringify({ platform: 'instagram' }),
    })
      .then((r) => parseResponseJson<{ success: boolean; url?: string; error?: string }>(r))
      .then((data) => {
        if (data.success && data.url) {
          window.location.href = data.url
        } else {
          router.replace(`/social?error=${encodeURIComponent(data.error ?? 'Failed to connect Instagram')}`)
        }
      })
      .catch((e) => {
        router.replace(`/social?error=${encodeURIComponent(e instanceof Error ? e.message : 'Request failed')}`)
      })
  }, [router])

  return (
    <>
      <Head><title>Connect Instagram – Cutnary</title></Head>
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]">
        <p className="text-zinc-400">Redirecting to Instagram…</p>
      </div>
    </>
  )
}
