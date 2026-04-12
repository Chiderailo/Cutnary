import { useEffect } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { apiJson } from '@/lib/api'

export default function AdminSettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return void router.replace('/auth/login?redirect=/admin/settings')
    apiJson('/api/admin/stats')
      .then(() => setAccessDenied(false))
      .catch(() => setAccessDenied(true))
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0b] p-8 text-zinc-400">Loading admin…</div>
  if (!isAuthenticated) return <div className="min-h-screen bg-[#0a0a0b] p-8 text-zinc-400">Redirecting to login…</div>
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] p-8 text-zinc-300">
        Admin access required.
      </div>
    )
  }

  return (
    <AdminLayout title="Admin Settings">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-300">
        Additional admin settings can be added here.
      </div>
    </AdminLayout>
  )
}

