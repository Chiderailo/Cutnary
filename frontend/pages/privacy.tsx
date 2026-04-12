import Head from 'next/head'
import type { ReactNode } from 'react'
import Header from '@/components/Header'

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'information-we-collect', title: 'Information We Collect' },
  { id: 'how-we-use-your-information', title: 'How We Use Your Information' },
  { id: 'data-storage', title: 'Data Storage' },
  { id: 'social-media-connections', title: 'Social Media Connections' },
  { id: 'data-sharing', title: 'Data Sharing' },
  { id: 'your-rights', title: 'Your Rights' },
  { id: 'contact', title: 'Contact' },
]

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3 text-zinc-300">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Cutnary</title>
        <meta name="description" content="Privacy Policy for Cutnary by Hustle Hive Technologies." />
      </Head>
      <Header />
      <div className="min-h-screen bg-black">
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight text-white">Privacy Policy</h1>
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
              <Section id="introduction" title="Introduction">
                <p>Cutnary is operated by Hustle Hive Technologies. We respect your privacy and are committed to protecting your personal information.</p>
                <p>This Privacy Policy explains how we collect, use, and protect your data when you use Cutnary.</p>
                <p>Effective date: April 2026.</p>
              </Section>

              <Section id="information-we-collect" title="Information We Collect">
                <ul className="list-disc space-y-2 pl-6">
                  <li>Account information such as your name and email address.</li>
                  <li>Videos you submit for processing, including YouTube URLs.</li>
                  <li>Generated clips stored on our servers.</li>
                  <li>Usage data and analytics about how you use the service.</li>
                  <li>Social media OAuth tokens when you connect external accounts.</li>
                </ul>
              </Section>

              <Section id="how-we-use-your-information" title="How We Use Your Information">
                <ul className="list-disc space-y-2 pl-6">
                  <li>To process videos and generate clips.</li>
                  <li>To post content on your behalf only when you authorize it.</li>
                  <li>To improve our AI models and overall product quality.</li>
                  <li>To send important service notifications and account messages.</li>
                </ul>
              </Section>

              <Section id="data-storage" title="Data Storage">
                <ul className="list-disc space-y-2 pl-6">
                  <li>Videos and clips are stored on Cloudflare R2.</li>
                  <li>Processed clips are deleted after 30 days.</li>
                  <li>Account data is retained until account deletion.</li>
                </ul>
              </Section>

              <Section id="social-media-connections" title="Social Media Connections">
                <ul className="list-disc space-y-2 pl-6">
                  <li>We store OAuth tokens so we can publish content on your behalf.</li>
                  <li>We never post without your explicit action.</li>
                  <li>You can disconnect connected accounts at any time.</li>
                  <li>We do not access your direct messages or followers lists.</li>
                </ul>
              </Section>

              <Section id="data-sharing" title="Data Sharing">
                <ul className="list-disc space-y-2 pl-6">
                  <li>We never sell your data.</li>
                  <li>We use OpenAI for transcription and AI processing.</li>
                  <li>We use AssemblyAI for speaker diarization.</li>
                  <li>We use Google Gemini for AI features.</li>
                  <li>These providers maintain their own privacy policies.</li>
                </ul>
              </Section>

              <Section id="your-rights" title="Your Rights">
                <ul className="list-disc space-y-2 pl-6">
                  <li>Access your data.</li>
                  <li>Delete your account and associated data.</li>
                  <li>Disconnect social media accounts.</li>
                  <li>Export your generated clips.</li>
                </ul>
              </Section>

              <Section id="contact" title="Contact">
                <p>Email: privacy@cutnary.com</p>
                <p>Company: Hustle Hive Technologies, Nigeria</p>
              </Section>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
