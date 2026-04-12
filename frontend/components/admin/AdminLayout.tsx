import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '@/components/Header'

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/social-credentials', label: 'Social Credentials' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">{title}</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <nav className="space-y-1">
              {LINKS.map((link) => {
                const active = router.pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      active
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
          <section>{children}</section>
        </div>
      </main>
    </div>
  )
}

