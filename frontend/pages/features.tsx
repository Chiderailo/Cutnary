import Head from 'next/head'
import Header from '@/components/Header'
import Link from 'next/link'

export default function FeaturesPage() {
  const features = [
    {
      title: 'AI Curation',
      description: 'Our AI analyzes your long-form videos to identify the most engaging hooks and viral-worthy moments automatically.',
      icon: (
        <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      title: 'AI Virality Score™',
      description: 'Get an instant prediction of how likely your clip is to perform well on platforms like TikTok, Reels, and Shorts.',
      icon: (
        <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      title: 'AI B-Roll',
      description: 'Enhance your storytelling with automatically added context-relevant B-roll to keep your audience engaged longer.',
      icon: (
        <svg className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'AI Dynamic Captions',
      description: 'Generate high-accuracy captions with stylish animations and automatic keyword highlighting to boost accessibility.',
      icon: (
        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    },
    {
      title: 'One-Click Post',
      description: 'Schedule and publish your clips directly to Instagram, TikTok, and YouTube without leaving Cutnary.',
      icon: (
        <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      )
    },
    {
      title: 'Active Speaker Detection',
      description: 'Our AI automatically reframes your video to keep the speaker centered in 9:16 portrait mode.',
      icon: (
        <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    }
  ]

  return (
    <>
      <Head>
        <title>Features – Cutnary AI</title>
        <meta name="description" content="Discover the powerful AI features of Cutnary" />
      </Head>
      <div className="min-h-screen bg-[#0a0a0b] text-white">
        <Header />
        
        <main className="relative mx-auto max-w-7xl px-6 py-20 lg:py-32">
          {/* Background Glows */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
            <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[140px]" />
          </div>

          <div className="relative text-center mb-24">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-6">
              Powering your <span className="text-[#6112ff]">content growth</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-zinc-400">
              Cutnary combines state-of-the-art generative AI with professional video editing tools to help you scale your presence across all social platforms.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div key={i} className="group relative rounded-3xl border border-zinc-800 bg-zinc-900/40 p-10 transition-all hover:border-zinc-700 hover:bg-zinc-900/60">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed text-lg">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-32 rounded-[40px] border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-transparent p-12 lg:p-24 text-center">
            <h2 className="text-4xl font-bold mb-8">Ready to transform your content?</h2>
            <Link href="/auth/register" className="inline-flex rounded-full bg-[#6112ff] px-8 py-4 text-lg font-bold text-white transition-all hover:bg-[#7226ff] hover:scale-105">
              Get started for free
            </Link>
          </div>
        </main>
      </div>
    </>
  )
}
