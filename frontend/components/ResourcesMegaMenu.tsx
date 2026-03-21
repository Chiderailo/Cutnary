/**
 * ResourcesMegaMenu - Opus Clip-style dropdown: links left, featured cards right
 */

import Link from 'next/link'

const LINKS = [
  { href: '/resources#stories', label: 'Customer stories' },
  { href: '/resources#learn', label: 'Learning center' },
  { href: '/resources#changelog', label: 'Product changelog' },
  { href: '/resources#blog', label: 'Blog' },
  { href: '/resources#help', label: 'Help center' },
]

const FEATURED_CARDS = [
  {
    href: '/resources#stories',
    headline: 'How Cutnary helps creators go viral faster',
  },
  {
    href: '/resources#guides',
    headline: 'How creators are growing 10M+ views using AI clipping',
  },
]

interface ResourcesMegaMenuProps {
  onClose?: () => void
  variant?: 'dropdown' | 'accordion'
}

export default function ResourcesMegaMenu({ onClose, variant = 'dropdown' }: ResourcesMegaMenuProps) {
  const content = (
    <div className={variant === 'accordion' ? 'space-y-4 px-4 py-4 pl-6' : 'grid grid-cols-[1fr,1.4fr] gap-8 p-6'}>
      {/* Left: links */}
      <ul className="space-y-3">
        {LINKS.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              onClick={onClose}
              className="text-sm text-white transition-colors hover:text-violet-400"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Right: featured cards */}
      <div className={variant === 'accordion' ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
        {FEATURED_CARDS.map((card) => (
          <Link
            key={card.headline}
            href={card.href}
            onClick={onClose}
            className="group relative flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all hover:border-violet-500/40"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
            <div className="relative flex h-24 shrink-0 items-center justify-center bg-zinc-800/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700/80">
                <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                </svg>
              </div>
            </div>
            <div className="relative flex flex-1 items-center justify-between gap-3 p-4">
              <p className="text-sm font-bold text-white group-hover:text-violet-400">{card.headline}</p>
              <span className="shrink-0 text-violet-400 transition-transform group-hover:translate-x-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )

  if (variant === 'accordion') {
    return <div className="border-t border-zinc-800 bg-zinc-900/50">{content}</div>
  }

  return (
    <div className="absolute left-0 top-full z-[100] mt-1 min-w-[480px] animate-dropdown-fade rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
      {content}
    </div>
  )
}
