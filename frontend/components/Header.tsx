/**
 * Header - Top navigation bar with logo and branding
 * Uses glass morphism effect (backdrop-blur) for a modern SaaS look
 */

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-[#0a0a0b]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Cutnary
          </span>
        </div>

        {/* Optional: nav links or user menu */}
        <nav className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">AI Video Clipper</span>
        </nav>
      </div>
    </header>
  )
}
