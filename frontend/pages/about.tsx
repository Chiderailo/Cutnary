import Head from 'next/head'
import Header from '@/components/Header'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About Us – Cutnary AI</title>
        <meta name="description" content="Learn more about Cutnary and our mission to empower creators" />
      </Head>
      <div className="min-h-screen bg-[#0a0a0b] text-white">
        <Header />
        
        <main className="relative mx-auto max-w-5xl px-6 py-20 lg:py-32">
          {/* Background Glows */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
            <div className="absolute -right-40 top-1/2 h-96 w-96 rounded-full bg-blue-500/10 blur-[140px]" />
          </div>

          <div className="relative">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl mb-12 text-center">
              Our mission is to <span className="text-[#6112ff]">empower every creator</span>
            </h1>
            
            <div className="prose prose-invert prose-lg max-w-none space-y-8 text-zinc-400">
              <p>
                At Cutnary, we believe that great stories deserve to be heard. However, in today's fast-paced digital landscape, the barrier to reaching a wide audience is no longer just quality—it's volume and format.
              </p>
              <p>
                Founded in 2024, Cutnary was born out of a simple observation: creators spend dozens of hours producing high-quality long-form content, only to see it reach a fraction of its potential because they don't have the time to repurpose it for every platform.
              </p>
              
              <div className="grid gap-12 py-12 lg:grid-cols-2">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-10">
                  <h3 className="text-2xl font-bold text-white mb-4">Why we do it</h3>
                  <p>
                    We want to level the playing field. By using AI to handle the tedious parts of video editing—finding hooks, framing, and captioning—we allow creators to focus on what they do best: storytelling and connecting with their community.
                  </p>
                </div>
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-10">
                  <h3 className="text-2xl font-bold text-white mb-4">How we do it</h3>
                  <p>
                    We leverage the latest advancements in Large Language Models and Computer Vision to understand content contextually. Our algorithms don't just "cut" video; they understand why a moment is engaging.
                  </p>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mt-16 mb-6">Our Values</h2>
              <ul className="space-y-4 list-none pl-0">
                <li className="flex gap-4">
                  <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-[#6112ff] flex items-center justify-center text-xs font-bold text-white">1</div>
                  <div>
                    <strong className="text-white">Creator-First:</strong> Every feature we build starts with the question: "How does this make a creator's life easier?"
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-[#6112ff] flex items-center justify-center text-xs font-bold text-white">2</div>
                  <div>
                    <strong className="text-white">Innovation with Purpose:</strong> We don't chase AI hype. We apply technology where it solves real-world workflow bottlenecks.
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-[#6112ff] flex items-center justify-center text-xs font-bold text-white">3</div>
                  <div>
                    <strong className="text-white">Accessibility:</strong> Professional-grade tools should be accessible to everyone, from solo creators to large media houses.
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-32 text-center">
              <h2 className="text-3xl font-bold mb-8">Join us on our journey</h2>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/auth/register" className="rounded-full bg-[#6112ff] px-8 py-4 font-bold text-white transition-all hover:bg-[#7226ff]">
                  Start creating today
                </Link>
                <Link href="/contact" className="rounded-full border border-zinc-700 px-8 py-4 font-bold text-white transition-all hover:bg-zinc-800">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
