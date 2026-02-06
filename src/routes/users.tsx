import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '../components/Sidebar'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { Search, Plus, Edit, Trash2, Users as UsersIcon, Loader2, Shield, UserCheck } from 'lucide-react'

export const Route = createFileRoute('/users')({
  component: UsersPage,
})

function UsersPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAddUser, setShowAddUser] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    full_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    role_name: 'sales',
    status: 'active',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [user, authLoading, navigate])

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await db.getUsers()
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 30000,
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await db.getRoles()
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 60000,
  })

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        email: newUser.email.trim(),
        password: newUser.password,
        full_name: newUser.full_name.trim(),
        username: newUser.username.trim() || null,
        phone_number: newUser.phone_number.trim() || null,
        role_name: newUser.role_name,
        status: newUser.status || 'active',
      }

      const { data, error } = await db.createUserWithProfile(payload)
      if (error) throw error
      if ((data as any)?.error) throw new Error((data as any).error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddUser(false)
      setFormError(null)
      setNewUser({
        full_name: '',
        username: '',
        email: '',
        phone_number: '',
        password: '',
        role_name: 'sales',
        status: 'active',
      })
    },
    onError: (error: any) => {
      setFormError(error?.message || 'Failed to create user')
    },
  })

  const filteredUsers = users?.filter((u: any) => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.roles?.name === roleFilter
    return matchesSearch && matchesRole
  }) || []

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    director: 'bg-blue-100 text-blue-700',
    sales: 'bg-emerald-100 text-emerald-700',
    packer: 'bg-amber-100 text-amber-700',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700',
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Users</h1>
              <p className="text-gray-500 mt-1">Manage user accounts and permissions</p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => {
                setFormError(null)
                setShowAddUser(true)
              }}
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="director">Director</option>
                <option value="sales">Sales</option>
                <option value="packer">Packer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <UsersIcon className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              filteredUsers.map((u: any) => (
                <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {u.full_name?.charAt(0) || u.username?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{u.full_name || 'Unnamed'}</h3>
                        <p className="text-sm text-gray-500">@{u.username || 'no-username'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${roleColors[u.roles?.name] || 'bg-gray-100 text-gray-700'}`}>
                      <Shield className="w-3 h-3" />
                      {u.roles?.name || 'No Role'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[u.status] || statusColors.active}`}>
                      <UserCheck className="w-3 h-3" />
                      {u.status || 'active'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Joined {new Date(u.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add user</h2>
                <p className="text-sm text-gray-500">Create a new user and profile.</p>
              </div>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Full name</label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Phone</label>
                <input
                  type="text"
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, phone_number: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500">Temporary password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Role</label>
                <select
                  value={newUser.role_name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {roles.map((role: any) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Status</label>
                <select
                  value={newUser.status}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddUser(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setFormError(null)
                  createUserMutation.mutate()
                }}
                disabled={createUserMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createUserMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create user
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
