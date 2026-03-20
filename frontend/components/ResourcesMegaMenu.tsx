/**
 * ResourcesMegaMenu - Dropdown panel with link columns + featured cards
 * Original design: sidebar links + two featured content cards
 */

import Link from 'next/link'

const LINK_GROUPS = [
  {
    title: 'Learn',
    links: [
      { href: '/resources#guides', label: 'Getting Started' },
      { href: '/resources#guides', label: 'AI Clipping Best Practices' },
      { href: '/resources#transcript', label: 'Speaker Diarization Guide' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/resources#faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact Us' },
      { href: '/resources#changelog', label: 'Changelog' },
    ],
  },
]

interface ResourcesMegaMenuProps {
  onClose?: () => void
}

export default function ResourcesMegaMenu({ onClose }: ResourcesMegaMenuProps) {
  return (
    <div className="absolute left-1/2 top-full z-50 mt-1 w-[min(90vw,680px)] -translate-x-1/2 rounded-xl border border-zinc-800 bg-[#0d0d0e] shadow-2xl shadow-black/50">
        <div className="grid grid-cols-[1fr,1.2fr] gap-0 p-4">
          <div className="flex flex-col justify-between">
            {/* Link columns */}
            <div className="flex gap-10 py-2 pl-2">
          {LINK_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {g.title}
              </p>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      onClick={onClose}
                      className="text-sm text-white transition-colors hover:text-blue-400"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
            </div>
            <Link
              href="/resources"
              onClick={onClose}
              className="mt-4 text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              View all resources →
            </Link>
          </div>

        {/* Featured cards */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/resources#guides"
            onClick={onClose}
            className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 transition-all hover:border-blue-500/40"
          >
            <div className="flex h-20 items-center justify-center bg-gradient-to-br from-blue-600/20 to-transparent">
              <svg className="h-10 w-10 text-blue-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-white group-hover:text-blue-400">
                Turn long videos into viral clips
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">AI-powered clipping in minutes</p>
            </div>
          </Link>
          <Link
            href="/resources#transcript"
            onClick={onClose}
            className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 transition-all hover:border-blue-500/40"
          >
            <div className="flex h-20 items-center justify-center bg-gradient-to-br from-sky-600/20 to-transparent">
              <svg className="h-10 w-10 text-sky-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-white group-hover:text-blue-400">
                Transcript with speaker labels
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">Identify who said what</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
