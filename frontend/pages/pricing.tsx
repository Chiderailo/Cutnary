/**
 * Pricing – Clean tier cards, black/white + blue accent
 */

import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Get started with AI clipping and transcripts',
    features: ['3 videos per month', 'AI clip generation', 'Transcript with speaker labels', 'Export .txt & .srt'],
    cta: 'Get Started',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    desc: 'For creators and small teams',
    features: ['Unlimited videos', 'Priority processing', 'All export formats', 'Caption styles (Karaoke, Glitch)', 'Priority support'],
    cta: 'Start Free Trial',
    href: '/auth/register',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    desc: 'For agencies and larger teams',
    features: ['Everything in Pro', 'Team workspaces', 'API access', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact Sales',
    href: '/contact',
    highlighted: false,
  },
]

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>Pricing – Cutnary</title>
        <meta name="description" content="Simple pricing for AI video clipping and transcripts" />
      </Head>
      <Header />

      <div className="min-h-screen bg-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <header className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Simple pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              Start free. Upgrade when you need more.
            </p>
          </header>

          <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.highlighted
                    ? 'border-blue-500/50 bg-zinc-900/80 shadow-lg shadow-blue-500/10'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                    Popular
                  </div>
                )}
                <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{plan.desc}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-8 block w-full rounded-lg py-3 text-center font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'border border-zinc-600 text-white hover:border-blue-500 hover:text-blue-400'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
