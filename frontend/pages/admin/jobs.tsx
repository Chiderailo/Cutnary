import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { apiJson } from '@/lib/api'

interface AdminJob {
  id: string
  user_email: string | null
  video_url: string
  status: string
  clip_count: number
  created_at: string
}

export default function AdminJobsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [status, setStatus] = useState('all')
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return void router.replace('/auth/login?redirect=/admin/jobs')
    apiJson<{ data: AdminJob[] }>(`/api/admin/jobs?status=${encodeURIComponent(status)}`).then((res) => {
      setAccessDenied(false)
      setJobs(res.data ?? [])
    })
    .catch(() => setAccessDenied(true))
  }, [isLoading, isAuthenticated, router, status])

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
    <AdminLayout title="Jobs">
      <div className="space-y-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">All</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
          <table className="min-w-full text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-2 py-2 text-left">Job ID</th>
                <th className="px-2 py-2 text-left">User</th>
                <th className="px-2 py-2 text-left">Video URL</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Clips</th>
                <th className="px-2 py-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-zinc-800">
                  <td className="px-2 py-2 text-zinc-200">{job.id}</td>
                  <td className="px-2 py-2 text-zinc-300">{job.user_email ?? '-'}</td>
                  <td className="max-w-[380px] truncate px-2 py-2 text-zinc-400" title={job.video_url}>
                    {job.video_url}
                  </td>
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
    </AdminLayout>
  )
}

