/**
 * Error feedback when verification link is invalid (optional intermediate page).
 */

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

const MESSAGES: Record<string, string> = {
  missing_token: 'This verification link is incomplete.',
  invalid_token: 'This verification link is invalid or has already been used.',
}

export default function VerifyEmailErrorPage() {
  const router = useRouter()
  const err = typeof router.query.error === 'string' ? router.query.error : ''
  const message = MESSAGES[err] ?? 'Email verification could not be completed.'

  return (
    <>
      <Head>
        <title>Verification issue – Cutnary</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-4">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Verification failed</h1>
          <p className="mt-3 text-sm text-red-200/90">{message}</p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-sm text-violet-400 hover:text-violet-300"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </>
  )
}
