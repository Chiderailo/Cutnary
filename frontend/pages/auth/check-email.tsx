/**
 * Shown after registration when email verification is required.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function CheckEmailPage() {
  const router = useRouter()
  const email = typeof router.query.email === 'string' ? router.query.email : ''

  return (
    <>
      <Head>
        <title>Check your email – Cutnary</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0b] px-4">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Verify your email</h1>
          <p className="mt-3 text-sm text-zinc-400">
            We sent a confirmation link
            {email ? (
              <>
                {' '}
                to <span className="text-zinc-200">{email}</span>
              </>
            ) : (
              ''
            )}
            . Open it to activate your account, then sign in.
          </p>
          <p className="mt-6 text-sm text-zinc-500">
            Wrong email?{' '}
            <Link href="/auth/register" className="text-violet-400 hover:text-violet-300">
              Register again
            </Link>
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            Already verified?{' '}
            <Link href="/auth/login" className="text-violet-400 hover:text-violet-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
