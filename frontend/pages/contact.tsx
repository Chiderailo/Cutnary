/**
 * Contact Us – Form + info, black/white + blue accent
 */

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate submit – wire to your backend when ready
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Contact Us – Cutnary</title>
        <meta name="description" content="Get in touch with the Cutnary team" />
      </Head>
      <Header />

      <div className="min-h-screen bg-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-40 top-1/3 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <header className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Contact Us
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              Have a question or feedback? We’d love to hear from you.
            </p>
          </header>

          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8">
                <h3 className="font-semibold text-white">Other ways to reach us</h3>
                <ul className="mt-6 space-y-4">
                  <li>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Email</p>
                    <a href="mailto:hello@cutnary.com" className="text-blue-400 hover:text-blue-300">
                      hello@cutnary.com
                    </a>
                  </li>
                  <li>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Support</p>
                    <Link href="/resources#faq" className="text-blue-400 hover:text-blue-300">
                      FAQ & Help
                    </Link>
                  </li>
                  <li>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Pricing</p>
                    <Link href="/pricing" className="text-blue-400 hover:text-blue-300">
                      View plans
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-3">
              {submitted ? (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20">
                    <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Message sent</h3>
                  <p className="mt-2 text-zinc-400">
                    We’ll get back to you as soon as we can.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8">
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-white">
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-white">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-white">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        required
                        className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="How can we help?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Sending...' : 'Send message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
