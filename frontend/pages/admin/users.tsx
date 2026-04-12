import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/admin/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { apiFetch, apiJson, parseResponseJson } from '@/lib/api'

interface AdminUser {
  id: number
  name: string | null
  email: string
  role: 'user' | 'admin'
  created_at: string | null
  job_count: number
  last_active: string | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [search, setSearch] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return void router.replace('/auth/login?redirect=/admin/users')
    apiJson<{ data: AdminUser[] }>('/api/admin/users')
      .then((res) => {
        setAccessDenied(false)
        setUsers(res.data ?? [])
      })
      .catch(() => setAccessDenied(true))
  }, [isLoading, isAuthenticated, router])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filter !== 'all' && u.role !== filter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })
  }, [users, filter, search])

  const updateRole = async (target: AdminUser) => {
    const nextRole = target.role === 'admin' ? 'user' : 'admin'
    const res = await apiFetch(`/api/admin/users/${target.id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: nextRole }),
    })
    const data = await parseResponseJson<{ success?: boolean }>(res)
    if (data.success) {
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, role: nextRole } : u)))
    }
  }

  const deleteUser = async (target: AdminUser) => {
    if (!confirm(`Delete user ${target.email}?`)) return
    const res = await apiFetch(`/api/admin/users/${target.id}`, { method: 'DELETE' })
    const data = await parseResponseJson<{ success?: boolean }>(res)
    if (data.success) {
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
    }
  }

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
    <AdminLayout title="Users">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'admin' | 'user')}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            <option value="all">All</option>
            <option value="admin">Admins</option>
            <option value="user">Users</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
          <table className="min-w-full text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-2 py-2 text-left">Avatar</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Email</th>
                <th className="px-2 py-2 text-left">Role</th>
                <th className="px-2 py-2 text-left">Jobs</th>
                <th className="px-2 py-2 text-left">Joined</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-zinc-800">
                  <td className="px-2 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs text-white">
                      {(u.name || u.email).slice(0, 2).toUpperCase()}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-zinc-200">{u.name ?? '-'}</td>
                  <td className="px-2 py-2 text-zinc-300">{u.email}</td>
                  <td className="px-2 py-2 text-zinc-200">{u.role}</td>
                  <td className="px-2 py-2 text-zinc-300">{u.job_count}</td>
                  <td className="px-2 py-2 text-zinc-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateRole(u)}
                        className="rounded bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-500"
                      >
                        {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500"
                      >
                        Delete
                      </button>
                    </div>
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

