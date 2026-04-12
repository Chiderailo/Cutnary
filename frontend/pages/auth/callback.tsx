/**
 * OAuth return handler: stores token from query and redirects (used by Google sign-in).
 */

import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import { requestClipDashboardScroll } from '@/lib/clip_dashboard'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [message, setMessage] = useState('Signing you in…')

  useEffect(() => {
    if (!router.isReady) return
    const token = typeof router.query.token === 'string' ? router.query.token : ''
    const redirectRaw = typeof router.query.redirect === 'string' ? router.query.redirect : '/dashboard'
    const redirect =
      redirectRaw.startsWith('/') && !redirectRaw.startsWith('//') ? redirectRaw : '/dashboard'

    if (!token) {
      setMessage('Missing token. Try signing in again.')
      return
    }

    localStorage.setItem('cutnary_token', token)
    refreshUser()
      .then(() => {
        if (redirect === '/dashboard') {
          requestClipDashboardScroll()
        }
        router.replace(redirect)
      })
      .catch(() => {
        setMessage('Could not complete sign-in. Try again.')
      })
  }, [router.isReady, router.query.token, router.query.redirect, router, refreshUser])

  return (
    <>
      <Head>
        <title>Signing in – Cutnary</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-4">
        <p className="text-zinc-400">{message}</p>
      </div>
    </>
  )
}
