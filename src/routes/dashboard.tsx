import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Sidebar } from '../components/Sidebar'
import { useQuery } from '@tanstack/react-query'
import { db } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useEffect } from 'react'
import { 
  ShoppingCart, 
  Users, 
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red'
  loading?: boolean
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
}

function StatCard({ title, value, subtitle, icon: Icon, color, loading }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : value}
          </p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
}

function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [user, authLoading, navigate])

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await db.getOrders()
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 30000,
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await db.getUsers()
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 30000,
  })

  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o: any) => o.production_status === 'pending').length || 0,
    inProgress: orders?.filter((o: any) => o.production_status === 'in_progress').length || 0,
    completed: orders?.filter((o: any) => o.production_status === 'completed').length || 0,
  }

  const pieData = [
    { name: 'Pending', value: stats.pending, color: CHART_COLORS.warning },
    { name: 'In Progress', value: stats.inProgress, color: CHART_COLORS.primary },
    { name: 'Completed', value: stats.completed, color: CHART_COLORS.success },
  ].filter(d => d.value > 0)

  // Weekly data - empty until real data is implemented
  const weeklyData: { name: string; orders: number; completed: number }[] = []

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
        <div className="p-8 animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name || 'Admin'}!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Orders" value={stats.total} icon={ShoppingCart} color="blue" loading={ordersLoading} />
            <StatCard title="In Progress" value={stats.inProgress} subtitle={`${stats.pending} pending`} icon={Clock} color="amber" loading={ordersLoading} />
            <StatCard title="Completed" value={stats.completed} icon={CheckCircle} color="green" loading={ordersLoading} />
            <StatCard title="Active Users" value={users?.length || 0} icon={Users} color="purple" loading={usersLoading} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Orders</h2>
              <div className="h-80">
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Weekly orders chart coming soon</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            </div>
            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Order</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Client</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders?.slice(0, 5).map((order: any) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate({ to: '/orders/$orderId', params: { orderId: order.id } })}
                    >
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">{order.order_name}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">{order.client_name}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          order.production_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          order.production_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{order.production_status?.replace('_', ' ')}</span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
