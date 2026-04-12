/**
 * Facebook Page Selector - Shown after OAuth when user has multiple Facebook Pages
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from '@/components/Header'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface PendingPage {
  id: string
  name: string
  picture: string | null
}

export default function FacebookSelectPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { pendingId } = router.query
  const [pages, setPages] = useState<PendingPage[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`)
      return
    }
    const id = typeof pendingId === 'string' ? Number(pendingId) : NaN
    if (!Number.isFinite(id)) {
      setError('Invalid page selection. Please try connecting again.')
      setLoading(false)
      return
    }
    apiJson<{ success: boolean; pages?: PendingPage[]; error?: string }>(
      `/api/social/facebook/pending-pages?id=${id}`
    )
      .then((data) => {
        if (data.success && data.pages) setPages(data.pages)
        else setError(data.error ?? 'Could not load pages')
      })
      .catch(() => setError('Failed to load your Facebook Pages'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, pendingId, router])

  const handleSelect = async (pageId: string) => {
    const id = typeof pendingId === 'string' ? Number(pendingId) : NaN
    if (!Number.isFinite(id)) return
    setSelecting(pageId)
    setError(null)
    try {
      const res = await apiFetch('/api/social/facebook/select-page', {
        method: 'POST',
        body: JSON.stringify({ pending_id: id, page_id: pageId }),
      })
      const data = await parseResponseJson<{ success?: boolean; error?: string }>(res)
      if (data.success) {
        router.replace('/social?connected=facebook')
      } else {
        setError(data.error ?? 'Failed to connect page')
      }
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setSelecting(null)
    }
  }

  if (!isAuthenticated) return null

  return (
    <>
      <Head>
        <title>Select Facebook Page – Cutnary</title>
      </Head>
      <div className="min-h-screen bg-[#0a0a0b]">
        <Header />
        <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
          <h1 className="mb-2 text-2xl font-bold text-white">Select Facebook Page</h1>
          <p className="mb-6 text-zinc-400">
            You manage multiple Facebook Pages. Choose which one to post to from Cutnary.
          </p>

          {loading ? (
            <p className="text-zinc-500">Loading your pages…</p>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
              {error}
              <a href="/social" className="mt-4 block text-violet-400 hover:underline">
                ← Back to Social
              </a>
            </div>
          ) : pages.length === 0 ? (
            <p className="text-zinc-500">No pages found.</p>
          ) : (
            <div className="space-y-3">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleSelect(page.id)}
                  disabled={selecting !== null}
                  className="flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition-colors hover:border-violet-500/50 hover:bg-zinc-900 disabled:opacity-50"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800">
                    {page.picture ? (
                      <img
                        src={page.picture}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">📄</span>
                    )}
                  </div>
                  <span className="font-medium text-white">{page.name}</span>
                  {selecting === page.id && (
                    <span className="ml-auto text-sm text-zinc-400">Connecting…</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
