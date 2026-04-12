/**
 * Billing - Subscription plans and upgrade
 */

import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Header from '@/components/Header'
import { useAuth } from '@/context/AuthContext'

export default function BillingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent('/billing')}`)
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <>
      <Head>
        <title>Billing – Cutnary</title>
        <meta name="description" content="Manage your subscription" />
      </Head>

      <div className="min-h-screen bg-[#0a0a0b]">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h1 className="mb-8 text-3xl font-bold text-white">Billing</h1>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-8">
            <h2 className="mb-4 text-xl font-semibold text-white">Subscription Plans</h2>
            <p className="mb-6 text-zinc-400">Upgrade your plan to unlock more features.</p>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <h3 className="mb-2 font-semibold text-white">Free</h3>
                <p className="mb-4 text-2xl font-bold text-white">$0</p>
                <p className="mb-4 text-sm text-zinc-500">Basic clip generation and posting</p>
                <span className="inline-block rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-400">
                  Current Plan
                </span>
              </div>
              <div className="rounded-xl border border-violet-500/50 bg-violet-500/5 p-6">
                <h3 className="mb-2 font-semibold text-white">Pro</h3>
                <p className="mb-4 text-2xl font-bold text-white">$29/mo</p>
                <p className="mb-4 text-sm text-zinc-500">More clips, priority processing, analytics</p>
                <Link
                  href="/pricing"
                  className="inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Upgrade
                </Link>
              </div>
              <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <h3 className="mb-2 font-semibold text-white">Agency</h3>
                <p className="mb-4 text-2xl font-bold text-white">$99/mo</p>
                <p className="mb-4 text-sm text-zinc-500">Team seats, white-label, API access</p>
                <Link
                  href="/pricing"
                  className="inline-block rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Contact Sales
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
