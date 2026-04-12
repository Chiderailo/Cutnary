import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-white">Cutnary</span>
            </div>
            <p className="text-sm text-zinc-400">AI-powered video clipping for creators</p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="text-zinc-400 transition-colors hover:text-violet-400" aria-label="Twitter / X">X</a>
              <a href="#" className="text-zinc-400 transition-colors hover:text-violet-400" aria-label="Instagram">Instagram</a>
              <a href="#" className="text-zinc-400 transition-colors hover:text-violet-400" aria-label="TikTok">TikTok</a>
            </div>
            <p className="mt-4 text-xs text-zinc-500">By Hustle Hive Technologies</p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-zinc-400 transition-colors hover:text-violet-400">Features</Link></li>
              <li><Link href="/pricing" className="text-zinc-400 transition-colors hover:text-violet-400">Pricing</Link></li>
              <li><Link href="/library" className="text-zinc-400 transition-colors hover:text-violet-400">Library</Link></li>
              <li><Link href="/editor/demo" className="text-zinc-400 transition-colors hover:text-violet-400">Editor</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="text-zinc-400 transition-colors hover:text-violet-400">Help Center</Link></li>
              <li><Link href="/resources" className="text-zinc-400 transition-colors hover:text-violet-400">Blog</Link></li>
              <li><Link href="/resources" className="text-zinc-400 transition-colors hover:text-violet-400">Changelog</Link></li>
              <li><span className="text-zinc-500">API Docs (coming soon)</span></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-zinc-400 transition-colors hover:text-violet-400">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-zinc-400 transition-colors hover:text-violet-400">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-zinc-400 transition-colors hover:text-violet-400">Cookie Policy</Link></li>
              <li><Link href="/contact" className="text-zinc-400 transition-colors hover:text-violet-400">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-zinc-800 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Cutnary by Hustle Hive Technologies. All rights reserved.</p>
          <p>Made with ❤️ in Nigeria 🇳🇬</p>
        </div>
      </div>
    </footer>
  )
}
