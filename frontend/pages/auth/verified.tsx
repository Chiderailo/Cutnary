/**
 * Landing page after email verification link is used successfully.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function VerifiedPage() {
  const { query } = useRouter()
  const email = typeof query.email === 'string' ? query.email : ''

  return (
    <>
      <Head>
        <title>Email verified – Cutnary</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-4">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">You&apos;re verified</h1>
          <p className="mt-3 text-sm text-zinc-400">
            {email ? (
              <>
                <span className="text-zinc-200">{email}</span> is confirmed. You can sign in now.
              </>
            ) : (
              'Your email is confirmed. You can sign in now.'
            )}
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  )
}
