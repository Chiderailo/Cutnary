import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { apiJson } from '@/lib/api'

interface AdminStats {
  total_users: number
  total_jobs: number
  total_clips: number
  jobs_today: number
  storage_used: number
}

interface AdminJob {
  id: string
  user_email: string | null
  video_url: string
  status: string
  clip_count: number
  created_at: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/admin')
      return
    }
    Promise.all([
      apiJson<AdminStats>('/api/admin/stats'),
      apiJson<{ data: AdminJob[] }>('/api/admin/jobs'),
    ])
      .then(([statsRes, jobsRes]) => {
        setAccessDenied(false)
        setStats(statsRes)
        setJobs(jobsRes.data ?? [])
      })
      .catch(() => {
        setAccessDenied(true)
      })
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
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: '👥 Total Users', value: stats?.total_users ?? 0 },
            { label: '🎬 Total Jobs', value: stats?.total_jobs ?? 0 },
            { label: '📎 Total Clips', value: stats?.total_clips ?? 0 },
            { label: '📅 Jobs Today', value: stats?.jobs_today ?? 0 },
            { label: '💰 Revenue', value: '$0' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-sm text-zinc-400">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-lg font-semibold text-white">Recent Jobs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-zinc-400">
                <tr>
                  <th className="px-2 py-2 text-left">User Email</th>
                  <th className="px-2 py-2 text-left">Video URL</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Clips</th>
                  <th className="px-2 py-2 text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 12).map((job) => (
                  <tr key={job.id} className="border-t border-zinc-800">
                    <td className="px-2 py-2 text-zinc-200">{job.user_email ?? '-'}</td>
                    <td className="max-w-[340px] truncate px-2 py-2 text-zinc-400">{job.video_url}</td>
                    <td className="px-2 py-2 text-zinc-200">{job.status}</td>
                    <td className="px-2 py-2 text-zinc-200">{job.clip_count}</td>
                    <td className="px-2 py-2 text-zinc-400">
                      {job.created_at ? new Date(job.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

