import Head from 'next/head'
import type { ReactNode } from 'react'
import Header from '@/components/Header'

const sections = [
  { id: 'acceptance-of-terms', title: 'Acceptance of Terms' },
  { id: 'description-of-service', title: 'Description of Service' },
  { id: 'user-accounts', title: 'User Accounts' },
  { id: 'acceptable-use', title: 'Acceptable Use' },
  { id: 'content-ownership', title: 'Content Ownership' },
  { id: 'prohibited-content', title: 'Prohibited Content' },
  { id: 'payment-terms', title: 'Payment Terms' },
  { id: 'limitation-of-liability', title: 'Limitation of Liability' },
  { id: 'termination', title: 'Termination' },
  { id: 'contact-information', title: 'Contact Information' },
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3 text-zinc-300">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service - Cutnary</title>
        <meta name="description" content="Terms of Service for Cutnary by Hustle Hive Technologies." />
      </Head>
      <Header />
      <div className="min-h-screen bg-black">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight text-white">Terms of Service</h1>
              <p className="mt-3 text-zinc-400">Last updated: April 2026</p>
            </div>

            <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Table of Contents</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-sm text-zinc-400 transition-colors hover:text-violet-400">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-10 leading-7">
              <Section id="acceptance-of-terms" title="Acceptance of Terms">
                <p>By using Cutnary, you agree to these Terms of Service. If you do not agree, you must stop using the platform.</p>
              </Section>

              <Section id="description-of-service" title="Description of Service">
                <ul className="list-disc space-y-2 pl-6">
                  <li>Cutnary is an AI-powered video clipping tool.</li>
                  <li>Cutnary supports social media auto-posting workflows.</li>
                  <li>Cutnary offers transcript generation and AI-assisted editing features.</li>
                </ul>
              </Section>

              <Section id="user-accounts" title="User Accounts">
                <ul className="list-disc space-y-2 pl-6">
                  <li>You must be at least 18 years old to use Cutnary.</li>
                  <li>You are responsible for keeping account credentials secure.</li>
                  <li>One account per person is permitted unless approved otherwise.</li>
                </ul>
              </Section>

              <Section id="acceptable-use" title="Acceptable Use">
                <ul className="list-disc space-y-2 pl-6">
                  <li>No copyright infringement.</li>
                  <li>No spam posting.</li>
                  <li>No illegal content.</li>
                  <li>No abuse of API limits or automation limits.</li>
                </ul>
              </Section>

              <Section id="content-ownership" title="Content Ownership">
                <ul className="list-disc space-y-2 pl-6">
                  <li>You retain ownership of your original content.</li>
                  <li>You grant us a limited license to process your videos to provide the service.</li>
                  <li>Generated clips are yours to use, subject to third-party platform and copyright rules.</li>
                </ul>
              </Section>

              <Section id="prohibited-content" title="Prohibited Content">
                <ul className="list-disc space-y-2 pl-6">
                  <li>Adult content.</li>
                  <li>Hate speech.</li>
                  <li>Violence or content promoting violence.</li>
                  <li>Misinformation that may cause harm.</li>
                </ul>
              </Section>

              <Section id="payment-terms" title="Payment Terms">
                <ul className="list-disc space-y-2 pl-6">
                  <li>When Stripe billing is enabled, subscriptions renew automatically unless canceled.</li>
                  <li>No refunds are issued for credits already used.</li>
                  <li>You can cancel according to the plan cancellation policy shown at checkout.</li>
                </ul>
              </Section>

              <Section id="limitation-of-liability" title="Limitation of Liability">
                <p>Cutnary is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, Hustle Hive Technologies is not liable for indirect, incidental, or consequential damages arising from use of the service.</p>
              </Section>

              <Section id="termination" title="Termination">
                <p>We may suspend or terminate access for violations of these Terms, abuse, or legal obligations. You may stop using the service at any time.</p>
              </Section>

              <Section id="contact-information" title="Contact Information">
                <p>Email: legal@cutnary.com</p>
                <p>Company: Hustle Hive Technologies, Nigeria</p>
              </Section>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
