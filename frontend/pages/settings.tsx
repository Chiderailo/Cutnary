/**
 * Settings page - placeholder
 */

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import Header from '@/components/Header'

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/auth/login')
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return null

  return (
    <>
      <Head>
        <title>Settings – Cutnary</title>
      </Head>
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-zinc-400">Settings coming soon.</p>
        <Link href="/" className="mt-4 inline-block text-violet-400 hover:text-violet-300">
          ← Back to home
        </Link>
      </div>
    </>
  )
}
