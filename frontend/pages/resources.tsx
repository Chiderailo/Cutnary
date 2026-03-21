/**
 * Resources – Learn, guides, support. Original layout: sidebar + featured blocks
 */

import Head from 'next/head'
import Link from 'next/link'
import Header from '@/components/Header'

const SIDEBAR_LINKS = [
  { id: 'stories', label: 'Customer Stories', icon: '📖' },
  { id: 'learn', label: 'Learning Center', icon: '🎓' },
  { id: 'guides', label: 'Guides & Tutorials', icon: '📖' },
  { id: 'transcript', label: 'Video Transcript', icon: '🎙' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'help', label: 'Help Center', icon: '❓' },
  { id: 'faq', label: 'FAQ', icon: '❓' },
  { id: 'changelog', label: 'Changelog', icon: '📋' },
]

const GUIDES = [
  {
    title: 'Getting Started with AI Clipping',
    desc: 'Paste a YouTube link, pick your aspect ratio and clip length, and let AI find the best moments.',
    href: '/',
  },
  {
    title: 'Speaker Diarization Explained',
    desc: 'How we identify and label different speakers in your video transcripts.',
    href: '/#tools',
  },
  {
    title: 'Export Formats & Workflows',
    desc: 'Download clips, transcripts as .txt or .srt, and integrate with your editing pipeline.',
    href: '/',
  },
]

const FAQ = [
  { q: 'What video platforms are supported?', a: 'Currently YouTube. More platforms coming soon.' },
  { q: 'How accurate is speaker diarization?', a: 'We use pyannote.audio for industry-leading accuracy. Results depend on audio quality.' },
  { q: 'Can I edit clips after generation?', a: 'Yes. Use our built-in editor to trim, add captions, and export.' },
]

export default function ResourcesPage() {
  return (
    <>
      <Head>
        <title>Resources – Cutnary</title>
        <meta name="description" content="Guides, FAQ, and support for Cutnary – AI video clipping and transcripts" />
      </Head>
      <Header />

      <div className="min-h-screen bg-black">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-40 top-1/4 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Resources
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              Everything you need to get the most out of AI clipping and transcripts
            </p>
          </header>

          <div className="grid gap-12 lg:grid-cols-[200px,1fr]">
            {/* Sidebar nav */}
            <aside className="hidden lg:block">
              <nav className="sticky top-24 space-y-1">
                {SIDEBAR_LINKS.map((l) => (
                  <a
                    key={l.id}
                    href={`#${l.id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                  >
                    <span>{l.icon}</span>
                    {l.label}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main content */}
            <div className="space-y-20">
              <section id="stories" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Customer Stories</h2>
                <p className="text-zinc-400">See how creators use Cutnary to grow. Coming soon.</p>
              </section>

              <section id="learn" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Learning Center</h2>
                <p className="text-zinc-400">Tutorials and courses to master AI clipping and transcripts.</p>
              </section>

              {/* Guides – two featured cards + list */}
              <section id="guides" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Guides & Tutorials</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Link
                    href="/"
                    className="group block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-blue-500/50"
                  >
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-blue-600/20 via-transparent to-transparent">
                      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                        <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-white group-hover:text-blue-400">AI Clipping in 3 Steps</h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        Paste, configure, generate. Learn how to create shareable clips from any long-form video.
                      </p>
                    </div>
                  </Link>
                  <Link
                    href="/"
                    className="group block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-blue-500/50"
                  >
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-sky-600/20 via-transparent to-transparent">
                      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
                        <svg className="h-12 w-12 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-white group-hover:text-blue-400">Transcripts with Speaker Labels</h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        Export .txt or .srt with Speaker 1, Speaker 2, and word-level timestamps.
                      </p>
                    </div>
                  </Link>
                </div>
                <ul className="mt-8 space-y-4">
                  {GUIDES.map((g) => (
                    <li key={g.title}>
                      <Link href={g.href} className="flex items-start gap-4 rounded-lg p-4 transition-colors hover:bg-zinc-900/60">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium text-white hover:text-blue-400">{g.title}</p>
                          <p className="mt-1 text-sm text-zinc-500">{g.desc}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Transcript section */}
              <section id="transcript" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Video Transcript</h2>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8">
                  <p className="text-zinc-300">
                    Our transcript feature transcribes your video with Whisper and uses speaker diarization to
                    identify who said what. Toggle speaker separation on or off, export as plain text or SRT
                    subtitles, and click any segment to jump to that moment in the video.
                  </p>
                  <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                  >
                    Try it now
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </section>

              <section id="blog" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Blog</h2>
                <p className="text-zinc-400">Tips, updates, and insights from the Cutnary team.</p>
              </section>

              <section id="help" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Help Center</h2>
                <p className="text-zinc-400">Find answers and get support. Visit our FAQ or contact us.</p>
              </section>

              {/* FAQ */}
              <section id="faq" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">FAQ</h2>
                <dl className="space-y-6">
                  {FAQ.map((item) => (
                    <div key={item.q} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
                      <dt className="font-medium text-white">{item.q}</dt>
                      <dd className="mt-2 text-zinc-400">{item.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Changelog */}
              <section id="changelog" className="scroll-mt-24">
                <h2 className="mb-8 text-2xl font-semibold text-white">Changelog</h2>
                <div className="space-y-6">
                  <div className="rounded-lg border border-zinc-800 p-6">
                    <p className="text-xs font-medium text-blue-400">Latest</p>
                    <h3 className="mt-1 font-medium text-white">Video Transcript with Speaker Diarization</h3>
                    <p className="mt-2 text-sm text-zinc-500">
                      New tool to transcribe videos and separate by speaker. Export as .txt or .srt, edit speaker names, and sync playback.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
