import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Edit,
	Loader2,
	Plus,
	Search,
	Shield,
	Trash2,
	UserCheck,
	Users as UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { db } from "../lib/supabase";

export const Route = createFileRoute("/users")({
	component: UsersPage,
});

interface PackerAssignmentRow {
	packer_id: string;
	full_name: string;
	username: string | null;
	packer_status: string | null;
	current_order_id: string | null;
	current_order_name: string | null;
	active_orders: number;
	active_sessions: number;
	open_attendance: number;
	active_tasks: number;
}

function UsersPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const [roleFilter, setRoleFilter] = useState("all");
	const [showAddUser, setShowAddUser] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [newUser, setNewUser] = useState({
		full_name: "",
		username: "",
		email: "",
		phone_number: "",
		password: "",
		role_name: "sales",
		status: "active",
		client_id: "",
	});

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	const { data: users, isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const { data, error } = await db.getUsers();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const {
		data: packerAssignments = [],
		isLoading: packerAssignmentsLoading,
		error: packerAssignmentsError,
	} = useQuery({
		queryKey: ["packer-assignment-status"],
		queryFn: async () => {
			const { data, error } = await db.getPackerAssignmentStatus();
			if (error) throw error;
			return (data || []) as PackerAssignmentRow[];
		},
		enabled: !!user,
		staleTime: 15000,
	});

	const { data: roles = [] } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await db.getRoles();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 60000,
	});

	const { data: clients = [] } = useQuery({
		queryKey: ["clients"],
		queryFn: async () => {
			const { data, error } = await db.getClients();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 60000,
	});

	const createUserMutation = useMutation({
		mutationFn: async () => {
			const payload = {
				email: newUser.email.trim(),
				password: newUser.password,
				full_name: newUser.full_name.trim(),
				username: newUser.username.trim() || null,
				phone_number: newUser.phone_number.trim() || null,
				role_name: newUser.role_name,
				status: newUser.status || "active",
				client_id: newUser.role_name === 'client' ? (newUser.client_id || null) : null,
			};

			const { data, error } = await db.createUserWithProfile(payload);
			if (error) throw error;
			if ((data as any)?.error) throw new Error((data as any).error);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setShowAddUser(false);
			setFormError(null);
			setNewUser({
				full_name: "",
				username: "",
				email: "",
				phone_number: "",
				password: "",
				role_name: "sales",
				status: "active",
				client_id: "",
			});
		},
		onError: (error: any) => {
			setFormError(error?.message || "Failed to create user");
		},
	});

	const forceReleaseMutation = useMutation({
		mutationFn: async (packerId: string) => {
			const { data, error } = await db.forceReleasePacker(packerId);
			if (error) throw error;
			return data as {
				success?: boolean;
				memberships_removed?: number;
				sessions_closed?: number;
				attendance_closed?: number;
				assignments_completed?: number;
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({ queryKey: ["packer-assignment-status"] });
		},
	});

	const handleForceRelease = async (row: PackerAssignmentRow) => {
		const hasRuntimeState =
			row.active_orders > 0 ||
			row.active_sessions > 0 ||
			row.open_attendance > 0 ||
			row.active_tasks > 0 ||
			row.packer_status === "busy" ||
			Boolean(row.current_order_id);

		if (!hasRuntimeState) {
			window.alert(`${row.full_name} is already free.`);
			return;
		}

		const confirmed = window.confirm(
			`Free ${row.full_name}? This will remove active team memberships, end active sessions and attendance, and complete active task assignments for this packer.`,
		);

		if (!confirmed) return;

		try {
			const result = await forceReleaseMutation.mutateAsync(row.packer_id);
			window.alert(
				`${row.full_name} has been freed.\n\nMemberships removed: ${result?.memberships_removed ?? 0}\nSessions closed: ${result?.sessions_closed ?? 0}\nAttendance rows closed: ${result?.attendance_closed ?? 0}\nTask assignments completed: ${result?.assignments_completed ?? 0}`,
			);
		} catch (error: any) {
			window.alert(error?.message || "Failed to free packer");
		}
	};

	const filteredUsers =
		users?.filter((u: any) => {
			const searchLower = debouncedSearch.toLowerCase();
			const matchesSearch =
				u.full_name?.toLowerCase().includes(searchLower) ||
				u.username?.toLowerCase().includes(searchLower);
			const matchesRole = roleFilter === "all" || u.roles?.name === roleFilter;
			return matchesSearch && matchesRole;
		}) || [];

	const roleColors: Record<string, string> = {
		admin: "bg-purple-100 text-purple-700",
		director: "bg-blue-100 text-blue-700",
		sales: "bg-emerald-100 text-emerald-700",
		packer: "bg-amber-100 text-amber-700",
		client: "bg-slate-100 text-slate-700",
	};

	const statusColors: Record<string, string> = {
		active: "bg-emerald-100 text-emerald-700",
		inactive: "bg-gray-100 text-gray-700",
		suspended: "bg-red-100 text-red-700",
	};

	if (!mounted) return null;

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Users</h1>
							<p className="text-gray-500 mt-1">
								Manage user accounts and permissions
							</p>
						</div>
						<button
							className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							onClick={() => {
								setFormError(null);
								setShowAddUser(true);
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
								<option value="client">Client</option>
							</select>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100">
							<h2 className="text-lg font-semibold text-gray-900">Packer Project Control</h2>
							<p className="text-sm text-gray-500 mt-1">
								See who is currently tied to projects and force-free a packer when reassignment is required.
							</p>
						</div>

						{packerAssignmentsLoading ? (
							<div className="px-6 py-8 flex items-center gap-2 text-gray-600">
								<Loader2 className="w-4 h-4 animate-spin" />
								Loading packer assignment status...
							</div>
						) : packerAssignmentsError ? (
							<div className="px-6 py-6 text-sm text-red-700 bg-red-50 border-t border-red-100">
								Failed to load packer assignment status.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm">
									<thead className="bg-gray-50 text-gray-600">
										<tr>
											<th className="text-left px-4 py-3 font-semibold">Packer</th>
											<th className="text-left px-4 py-3 font-semibold">Current Order</th>
											<th className="text-right px-4 py-3 font-semibold">Orders</th>
											<th className="text-right px-4 py-3 font-semibold">Sessions</th>
											<th className="text-right px-4 py-3 font-semibold">Open Attendance</th>
											<th className="text-right px-4 py-3 font-semibold">Active Tasks</th>
											<th className="text-right px-4 py-3 font-semibold">Action</th>
										</tr>
									</thead>
									<tbody>
										{packerAssignments.map((row) => {
											const isBusy = row.packer_status === "busy" || row.active_orders > 0;
											const hasRuntimeState =
												row.active_orders > 0 ||
												row.active_sessions > 0 ||
												row.open_attendance > 0 ||
												row.active_tasks > 0 ||
												row.packer_status === "busy" ||
												Boolean(row.current_order_id);

											return (
												<tr key={row.packer_id} className="border-t border-gray-100">
													<td className="px-4 py-3">
														<div className="font-medium text-gray-900">{row.full_name}</div>
														<div className="text-xs text-gray-500">@{row.username || "no-username"}</div>
														<div className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
															isBusy ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
														}`}>
															{row.packer_status || "available"}
														</div>
													</td>
													<td className="px-4 py-3 text-gray-700">{row.current_order_name || "-"}</td>
													<td className="px-4 py-3 text-right text-gray-900">{row.active_orders}</td>
													<td className="px-4 py-3 text-right text-gray-900">{row.active_sessions}</td>
													<td className="px-4 py-3 text-right text-gray-900">{row.open_attendance}</td>
													<td className="px-4 py-3 text-right text-gray-900">{row.active_tasks}</td>
													<td className="px-4 py-3 text-right">
														<button
															onClick={() => handleForceRelease(row)}
															disabled={forceReleaseMutation.isPending || !hasRuntimeState}
															className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
														>
															Free Packer
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
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
								<div
									key={u.id}
									className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
												<span className="text-blue-600 font-semibold text-lg">
													{u.full_name?.charAt(0) ||
														u.username?.charAt(0) ||
														"?"}
												</span>
											</div>
											<div>
												<h3 className="font-semibold text-gray-900">
													{u.full_name || "Unnamed"}
												</h3>
												<p className="text-sm text-gray-500">
													@{u.username || "no-username"}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-1">
											<button
												className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
												title="Edit"
											>
												<Edit className="w-4 h-4 text-gray-500" />
											</button>
											<button
												className="p-2 hover:bg-red-50 rounded-lg transition-colors"
												title="Delete"
											>
												<Trash2 className="w-4 h-4 text-red-500" />
											</button>
										</div>
									</div>
									<div className="flex items-center gap-2 mb-3">
										<span
											className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${roleColors[u.roles?.name] || "bg-gray-100 text-gray-700"}`}
										>
											<Shield className="w-3 h-3" />
											{u.roles?.name || "No Role"}
										</span>
										<span
											className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[u.status] || statusColors.active}`}
										>
											<UserCheck className="w-3 h-3" />
											{u.status || "active"}
										</span>
									</div>
									<p className="text-sm text-gray-500">
										Joined{" "}
										{new Date(u.created_at || Date.now()).toLocaleDateString()}
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
								<h2 className="text-lg font-semibold text-gray-900">
									Add user
								</h2>
								<p className="text-sm text-gray-500">
									Create a new user and profile.
								</p>
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
								<label
									htmlFor="new-user-full-name"
									className="text-xs text-gray-500"
								>
									Full name
								</label>
								<input
									id="new-user-full-name"
									type="text"
									value={newUser.full_name}
									onChange={(e) =>
										setNewUser((prev) => ({
											...prev,
											full_name: e.target.value,
										}))
									}
									className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label
									htmlFor="new-user-username"
									className="text-xs text-gray-500"
								>
									Username
								</label>
								<input
									id="new-user-username"
									type="text"
									value={newUser.username}
									onChange={(e) =>
										setNewUser((prev) => ({
											...prev,
											username: e.target.value,
										}))
									}
									className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label
									htmlFor="new-user-phone"
									className="text-xs text-gray-500"
								>
									Phone
								</label>
								<input
									id="new-user-phone"
									type="text"
									value={newUser.phone_number}
									onChange={(e) =>
										setNewUser((prev) => ({
											...prev,
											phone_number: e.target.value,
										}))
									}
									className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div className="md:col-span-2">
								<label
									htmlFor="new-user-email"
									className="text-xs text-gray-500"
								>
									Email
								</label>
								<input
									id="new-user-email"
									type="email"
									value={newUser.email}
									onChange={(e) =>
										setNewUser((prev) => ({ ...prev, email: e.target.value }))
									}
									className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div className="md:col-span-2">
								<label
									htmlFor="new-user-temp-password"
									className="text-xs text-gray-500"
								>
									Temporary password
								</label>
								<input
									id="new-user-temp-password"
									type="password"
									value={newUser.password}
									onChange={(e) =>
										setNewUser((prev) => ({
											...prev,
											password: e.target.value,
										}))
									}
									className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
							<div>
								<label
									htmlFor="new-user-role"
									className="text-xs text-gray-500"
								>
									Role
								</label>
								<select
									id="new-user-role"
									value={newUser.role_name}
									onChange={(e) =>
										setNewUser((prev) => ({
											...prev,
											role_name: e.target.value,
										}))
									}
									className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
								>
									<option value="sales">Sales</option>
									<option value="packer">Packer</option>
									<option value="admin">Admin</option>
									<option value="director">Director</option>
									<option value="client">Client</option>
								</select>
							</div>

							{newUser.role_name === 'client' && (
								<div className="md:col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
									<label
										htmlFor="new-user-client"
										className="text-xs font-semibold text-blue-800"
									>
										Assign to Client Company
									</label>
									<select
										id="new-user-client"
										value={newUser.client_id}
										onChange={(e) =>
											setNewUser((prev) => ({
												...prev,
												client_id: e.target.value,
											}))
										}
										className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
									>
										<option value="">-- Select a client --</option>
										{clients.map((c: any) => (
											<option key={c.id} value={c.id}>{c.name}</option>
										))}
									</select>
									<p className="text-xs text-blue-600 mt-1">This user will only have access to data belonging to the selected client.</p>
								</div>
							)}

							<div>
								<label
									htmlFor="new-user-status"
									className="text-xs text-gray-500"
								>
									Status
								</label>
								<select
									id="new-user-status"
									value={newUser.status}
									onChange={(e) =>
										setNewUser((prev) => ({ ...prev, status: e.target.value }))
									}
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
									setFormError(null);
									createUserMutation.mutate();
								}}
								disabled={createUserMutation.isPending}
								className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>
								{createUserMutation.isPending && (
									<Loader2 className="w-4 h-4 animate-spin" />
								)}
								Create user
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
