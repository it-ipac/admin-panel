import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Check,
	ChevronRight,
	ClipboardList,
	Edit,
	ExternalLink,
	Loader2,
	Plus,
	Search,
	Shield,
	Star,
	Trash2,
	UserCheck,
	UserMinus,
	UserPlus,
	Users as UsersIcon,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useRequirePageAccess } from "../hooks/usePageAccess";
import { useToast } from "../hooks/useToast";
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
	useRequirePageAccess();
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
	const [assigningPacker, setAssigningPacker] =
		useState<PackerAssignmentRow | null>(null);
	const [assigningOrderId, setAssigningOrderId] = useState("");
	const [addingToOrder, setAddingToOrder] = useState<any | null>(null);
	const toast = useToast();
	const [confirmationModal, setConfirmationModal] = useState<{
		open: boolean;
		title: string;
		description: string;
		onConfirm: () => void;
		loading?: boolean;
	}>({
		open: false,
		title: "",
		description: "",
		onConfirm: () => {},
		loading: false,
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
				client_id:
					newUser.role_name === "client" ? newUser.client_id || null : null,
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
			queryClient.invalidateQueries({ queryKey: ["orders-with-teams"] });
		},
	});

	const { data: ordersWithTeams = [] } = useQuery({
		queryKey: ["orders-with-teams"],
		queryFn: async () => {
			const { data, error } = await db.getOrdersWithTeams();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
	});

	const { data: availableOrders = [] } = useQuery({
		queryKey: ["orders"],
		queryFn: async () => {
			const { data, error } = await db.getOrders();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
	});

	const assignPackerMutation = useMutation({
		mutationFn: async ({
			orderId,
			packerId,
		}: {
			orderId: string;
			packerId: string;
		}) => {
			const { error } = await db.assignPackerToOrder(orderId, packerId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packer-assignment-status"] });
			queryClient.invalidateQueries({ queryKey: ["orders-with-teams"] });
			setAssigningPacker(null);
			setAssigningOrderId("");
			setAddingToOrder(null);
			toast.success({
				title: "Packer Assigned",
				description: "Packer has been successfully added to the order team.",
			});
		},
		onError: (error: any) => {
			toast.error({
				title: "Assignment Failed",
				description: error.message,
			});
		},
	});

	const removePackerMutation = useMutation({
		mutationFn: async ({
			orderId,
			packerId,
		}: {
			orderId: string;
			packerId: string;
		}) => {
			const { error } = await db.removePackerFromOrder(orderId, packerId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packer-assignment-status"] });
			queryClient.invalidateQueries({ queryKey: ["orders-with-teams"] });
			setConfirmationModal((prev) => ({ ...prev, open: false }));
			toast.success({
				title: "Member Removed",
				description: "Packer has been removed from the order team.",
			});
		},
		onError: (error: any) => {
			toast.error({
				title: "Removal Failed",
				description: error.message,
			});
		},
	});

	const addTeamLeadMutation = useMutation({
		mutationFn: async ({
			orderId,
			packerId,
		}: {
			orderId: string;
			packerId: string;
		}) => {
			const { error } = await db.addTeamLead(orderId, packerId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["orders-with-teams"] });
		},
	});

	const removeTeamLeadMutation = useMutation({
		mutationFn: async ({
			orderId,
			packerId,
		}: {
			orderId: string;
			packerId: string;
		}) => {
			const { error } = await db.removeTeamLead(orderId, packerId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["orders-with-teams"] });
			toast.success({
				title: "Lead Removed",
				description: "Packer has been demoted to team member.",
			});
		},
		onError: (error: any) => {
			toast.error({
				title: "Action Failed",
				description: error.message,
			});
		},
	});

	const removeAllPackersMutation = useMutation({
		mutationFn: async (orderId: string) => {
			const { error } = await db.removeAllPackersFromOrder(orderId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["packer-assignment-status"] });
			queryClient.invalidateQueries({ queryKey: ["orders-with-teams"] });
			setConfirmationModal((prev) => ({ ...prev, open: false }));
			toast.success({
				title: "Team Cleared",
				description: "All packers have been removed from the order.",
			});
		},
		onError: (error: any) => {
			toast.error({
				title: "Failed to clear team",
				description: error.message,
			});
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
			toast.info({
				title: "Packer already free",
				description: `${row.full_name} has no active project state.`,
			});
			return;
		}

		setConfirmationModal({
			open: true,
			title: `Force Free ${row.full_name}?`,
			description:
				"This will remove active team memberships, end active sessions and attendance, and complete active task assignments for this packer. This action cannot be undone.",
			onConfirm: async () => {
				setConfirmationModal((prev) => ({ ...prev, loading: true }));
				try {
					const result = await forceReleaseMutation.mutateAsync(row.packer_id);
					setConfirmationModal((prev) => ({
						...prev,
						open: false,
						loading: false,
					}));
					toast.success({
						title: "Packer Freed",
						description: `${row.full_name} has been fully released.\nRemoved: ${result?.memberships_removed ?? 0} memberships, ${result?.sessions_closed ?? 0} sessions.`,
					});
				} catch (error: any) {
					setConfirmationModal((prev) => ({ ...prev, loading: false }));
					toast.error({
						title: "Force Free Failed",
						description: error.message,
					});
				}
			},
		});
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
		admin: "bg-accent-100 text-accent-700",
		director: "bg-primary-100 text-primary-700",
		sales: "bg-success-100 text-success-700",
		packer: "bg-warning-100 text-warning-700",
		client: "bg-steel-100 text-steel-700",
	};

	const statusColors: Record<string, string> = {
		active: "bg-success-100 text-success-700",
		inactive: "bg-neutral-100 text-neutral-700",
		suspended: "bg-danger-100 text-danger-700",
	};

	if (!mounted) return null;

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-2xl font-bold text-neutral-900">Users</h1>
							<p className="text-neutral-500 mt-1">
								Manage user accounts and permissions
							</p>
						</div>
						<button
							className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
							onClick={() => {
								setFormError(null);
								setShowAddUser(true);
							}}
						>
							<Plus className="w-5 h-5" />
							Add User
						</button>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 mb-6">
						<div className="flex flex-wrap gap-4">
							<div className="flex-1 min-w-50">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
									<input
										type="text"
										placeholder="Search users..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
									/>
								</div>
							</div>
							<select
								value={roleFilter}
								onChange={(e) => setRoleFilter(e.target.value)}
								className="px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
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

					<div className="space-y-8 mb-12">
						<section>
							<div className="flex items-center justify-between mb-4">
								<div>
									<h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
										<UserPlus className="w-5 h-5 text-primary-600" />
										Available Packers
									</h2>
									<p className="text-sm text-neutral-500">
										Packers ready for new assignments
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
								{packerAssignmentsLoading ? (
									<div className="col-span-full py-8 flex items-center gap-2 text-neutral-600 justify-center">
										<Loader2 className="w-4 h-4 animate-spin" />
										Loading available packers...
									</div>
								) : packerAssignmentsError ? (
									<div className="col-span-full py-4 text-center text-danger-600 bg-danger-50 rounded-lg">
										Error loading packers
									</div>
								) : packerAssignments.filter(
										(p) =>
											p.packer_status === "available" && p.active_orders === 0,
									).length === 0 ? (
									<div className="col-span-full py-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
										<p className="text-neutral-400 text-sm">
											No available packers currently
										</p>
									</div>
								) : (
									packerAssignments
										.filter(
											(p) =>
												p.packer_status === "available" &&
												p.active_orders === 0,
										)
										.map((p) => (
											<div
												key={p.packer_id}
												className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-200 group"
											>
												<div className="flex items-center gap-3 mb-4">
													<div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold group-hover:bg-primary-100 transition-colors">
														{p.full_name.charAt(0)}
													</div>
													<div className="overflow-hidden">
														<h3 className="font-bold text-neutral-900 text-sm truncate">
															{p.full_name}
														</h3>
														<p className="text-xs text-neutral-500">
															@{p.username}
														</p>
													</div>
												</div>
												<button
													onClick={() => setAssigningPacker(p)}
													className="w-full py-2 bg-primary-50 text-primary-600 text-xs font-bold rounded-lg hover:bg-primary-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
												>
													<Plus className="w-3.5 h-3.5" />
													Assign to Order
												</button>
											</div>
										))
								)}
							</div>
						</section>

						<section>
							<div className="flex items-center justify-between mb-4">
								<div>
									<h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
										<ClipboardList className="w-5 h-5 text-success-600" />
										Active Project Teams
									</h2>
									<p className="text-sm text-neutral-500">
										Current teams assigned to orders
									</p>
								</div>
							</div>

							<div className="space-y-4">
								{ordersWithTeams.length === 0 ? (
									<div className="text-center py-12 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
										<p className="text-neutral-400 text-sm">
											No active teams currently assigned
										</p>
									</div>
								) : (
									ordersWithTeams
										.filter(
											(order: any) =>
												order.order_team_members &&
												order.order_team_members.length > 0,
										)
										.map((order: any) => (
											<div
												key={order.id}
												className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm"
											>
												<div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-200 flex items-center justify-between">
													<div className="flex items-center gap-4">
														<div className="flex items-center gap-3">
															<div className="bg-success-100 text-success-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
																{order.production_status.replace("_", " ")}
															</div>
															<h3 className="font-bold text-neutral-900">
																{order.order_name}
															</h3>
														</div>
														<div className="flex items-center gap-2 border-l border-neutral-200 pl-4">
															<button
																onClick={() => setAddingToOrder(order)}
																className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-bold rounded-lg hover:bg-primary-100 transition-colors"
															>
																<UserPlus className="w-3 h-3" />
																Add Member
															</button>
															<button
																onClick={() => {
																	setConfirmationModal({
																		open: true,
																		title: "Clear Order Team?",
																		description: `Are you sure you want to remove all packers from "${order.order_name}"? This will return all members to the available pool.`,
																		onConfirm: () =>
																			removeAllPackersMutation.mutate(order.id),
																	});
																}}
																className="flex items-center gap-1 px-3 py-1 bg-danger-50 text-danger-600 text-[10px] font-bold rounded-lg hover:bg-danger-100 transition-colors"
															>
																<UserMinus className="w-3 h-3" />
																Clear Team
															</button>
														</div>
													</div>
													<button
														onClick={() =>
															navigate({ to: `/orders/${order.id}` })
														}
														className="text-xs text-primary-600 font-bold hover:text-primary-700 flex items-center gap-1 transition-colors"
													>
														View Order <ExternalLink className="w-3 h-3" />
													</button>
												</div>
												<div className="divide-y divide-neutral-100">
													{order.order_team_members?.map((member: any) => (
														<div
															key={member.id}
															className="px-6 py-3.5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors"
														>
															<div className="flex items-center gap-3">
																<div className="relative">
																	<div className="w-9 h-9 rounded-full bg-steel-100 flex items-center justify-center text-steel-600 text-xs font-bold ring-2 ring-white">
																		{member.packer?.full_name?.charAt(0)}
																	</div>
																	{member.is_team_lead && (
																		<div className="absolute -top-1 -right-1 bg-warning-400 text-white p-0.5 rounded-full ring-2 ring-white">
																			<Star className="w-2.5 h-2.5 fill-current" />
																		</div>
																	)}
																</div>
																<div>
																	<p className="text-sm font-bold text-neutral-900 flex items-center gap-2">
																		{member.packer?.full_name}
																		{member.is_team_lead && (
																			<span className="text-[9px] bg-warning-50 text-warning-600 px-1.5 py-0.5 rounded border border-warning-100 uppercase font-extrabold tracking-tight">
																				Lead
																			</span>
																		)}
																	</p>
																	<p className="text-xs text-neutral-500">
																		@{member.packer?.username}
																	</p>
																</div>
															</div>
															<div className="flex items-center gap-1">
																<button
																	onClick={() => {
																		const assignment = packerAssignments.find(
																			(pa) => pa.packer_id === member.packer.id,
																		);
																		if (assignment) {
																			handleForceRelease(assignment);
																		} else {
																			window.alert("Assignment data not found");
																		}
																	}}
																	className="p-2 text-steel-400 hover:text-ember-500 hover:bg-ember-50 rounded-lg transition-colors group"
																	title="Force Free (Full Release)"
																>
																	<UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
																</button>
																{member.is_team_lead ? (
																	<button
																		onClick={() =>
																			removeTeamLeadMutation.mutate({
																				orderId: order.id,
																				packerId: member.packer.id,
																			})
																		}
																		className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg transition-colors group"
																		title="Demote to Packer"
																	>
																		<UserMinus className="w-4 h-4 group-hover:scale-110 transition-transform" />
																	</button>
																) : (
																	<button
																		onClick={() =>
																			addTeamLeadMutation.mutate({
																				orderId: order.id,
																				packerId: member.packer.id,
																			})
																		}
																		className="p-2 text-steel-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors group"
																		title="Make Team Lead"
																	>
																		<Star className="w-4 h-4 group-hover:scale-110 transition-transform" />
																	</button>
																)}
																<button
																	onClick={() => {
																		setConfirmationModal({
																			open: true,
																			title: "Remove from Team?",
																			description: `Remove ${member.packer.full_name} from "${order.order_name}"?`,
																			onConfirm: () =>
																				removePackerMutation.mutate({
																					orderId: order.id,
																					packerId: member.packer.id,
																				}),
																		});
																	}}
																	className="p-2 text-steel-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors group"
																	title="Remove from Team"
																>
																	<Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
																</button>
															</div>
														</div>
													))}
												</div>
											</div>
										))
								)}
							</div>
						</section>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{isLoading ? (
							<div className="col-span-full flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
							</div>
						) : filteredUsers.length === 0 ? (
							<div className="col-span-full flex flex-col items-center justify-center py-12">
								<UsersIcon className="w-12 h-12 text-neutral-300 mb-4" />
								<p className="text-neutral-500">No users found</p>
							</div>
						) : (
							filteredUsers.map((u: any) => (
								<div
									key={u.id}
									className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 card-hover"
								>
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
												<span className="text-primary-600 font-semibold text-lg">
													{u.full_name?.charAt(0) ||
														u.username?.charAt(0) ||
														"?"}
												</span>
											</div>
											<div>
												<h3 className="font-semibold text-neutral-900">
													{u.full_name || "Unnamed"}
												</h3>
												<p className="text-sm text-neutral-500">
													@{u.username || "no-username"}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-1">
											<button
												className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
												title="Edit"
											>
												<Edit className="w-4 h-4 text-neutral-500" />
											</button>
											<button
												className="p-2 hover:bg-danger-50 rounded-lg transition-colors"
												title="Delete"
											>
												<Trash2 className="w-4 h-4 text-danger-500" />
											</button>
										</div>
									</div>
									<div className="flex items-center gap-2 mb-3">
										<span
											className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${roleColors[u.roles?.name] || "bg-neutral-100 text-neutral-700"}`}
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
									<p className="text-sm text-neutral-500">
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
								<h2 className="text-lg font-semibold text-neutral-900">
									Add user
								</h2>
								<p className="text-sm text-neutral-500">
									Create a new user and profile.
								</p>
							</div>
							<button
								onClick={() => setShowAddUser(false)}
								className="text-neutral-400 hover:text-neutral-600"
							>
								✕
							</button>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="md:col-span-2">
								<label
									htmlFor="new-user-full-name"
									className="text-xs text-neutral-500"
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
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
							<div>
								<label
									htmlFor="new-user-username"
									className="text-xs text-neutral-500"
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
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
							<div>
								<label
									htmlFor="new-user-phone"
									className="text-xs text-neutral-500"
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
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
							<div className="md:col-span-2">
								<label
									htmlFor="new-user-email"
									className="text-xs text-neutral-500"
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
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
							<div className="md:col-span-2">
								<label
									htmlFor="new-user-temp-password"
									className="text-xs text-neutral-500"
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
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
							<div>
								<label
									htmlFor="new-user-role"
									className="text-xs text-neutral-500"
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
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
								>
									<option value="sales">Sales</option>
									<option value="packer">Packer</option>
									<option value="admin">Admin</option>
									<option value="director">Director</option>
									<option value="client">Client</option>
								</select>
							</div>

							{newUser.role_name === "client" && (
								<div className="md:col-span-2 p-3 bg-primary-50 border border-primary-100 rounded-lg">
									<label
										htmlFor="new-user-client"
										className="text-xs font-semibold text-primary-800"
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
										className="mt-1 w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
									>
										<option value="">-- Select a client --</option>
										{clients.map((c: any) => (
											<option key={c.id} value={c.id}>
												{c.name}
											</option>
										))}
									</select>
									<p className="text-xs text-primary-600 mt-1">
										This user will only have access to data belonging to the
										selected client.
									</p>
								</div>
							)}

							<div>
								<label
									htmlFor="new-user-status"
									className="text-xs text-neutral-500"
								>
									Status
								</label>
								<select
									id="new-user-status"
									value={newUser.status}
									onChange={(e) =>
										setNewUser((prev) => ({ ...prev, status: e.target.value }))
									}
									className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
								>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
									<option value="suspended">Suspended</option>
								</select>
							</div>
						</div>

						{formError && (
							<div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
								{formError}
							</div>
						)}

						<div className="flex justify-end gap-2 mt-6">
							<button
								onClick={() => setShowAddUser(false)}
								className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									setFormError(null);
									createUserMutation.mutate();
								}}
								disabled={createUserMutation.isPending}
								className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
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

			{assigningPacker && (
				<Dialog.Root
					open={!!assigningPacker}
					onOpenChange={() => setAssigningPacker(null)}
				>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[var(--z-modal-overlay)]" />
						<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-[var(--z-modal)] border border-neutral-100">
							<div className="flex items-center justify-between mb-6">
								<Dialog.Title className="text-xl font-bold text-neutral-900">
									Assign Packer
								</Dialog.Title>
								<Dialog.Close className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
									<X className="w-5 h-5 text-neutral-500" />
								</Dialog.Close>
							</div>

							<div className="mb-6">
								<div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
									<div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
										{assigningPacker.full_name.charAt(0)}
									</div>
									<div className="overflow-hidden">
										<p className="text-sm font-bold text-primary-900 truncate">
											{assigningPacker.full_name}
										</p>
										<p className="text-xs text-primary-600">
											@{assigningPacker.username}
										</p>
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<label
									htmlFor="order-select"
									className="text-xs font-bold text-neutral-500 uppercase tracking-wider ml-1"
								>
									Select Order
								</label>
								<div className="relative">
									<select
										id="order-select"
										value={assigningOrderId}
										onChange={(e) => setAssigningOrderId(e.target.value)}
										className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none cursor-pointer text-sm font-medium pr-10"
									>
										<option value="">-- Choose an order --</option>
										{availableOrders
											.filter((o: any) => o.production_status !== "completed")
											.map((order: any) => (
												<option key={order.id} value={order.id}>
													{order.order_name}
												</option>
											))}
									</select>
									<ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
								</div>
							</div>

							<div className="mt-8 flex gap-3">
								<Dialog.Close className="flex-1 py-3 text-sm font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
									Cancel
								</Dialog.Close>
								<button
									disabled={!assigningOrderId || assignPackerMutation.isPending}
									onClick={() =>
										assignPackerMutation.mutate({
											orderId: assigningOrderId,
											packerId: assigningPacker.packer_id,
										})
									}
									className="flex-[2] py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
								>
									{assignPackerMutation.isPending ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<Check className="w-4 h-4" />
									)}
									Confirm Assignment
								</button>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			)}

			<Dialog.Root
				open={confirmationModal.open}
				onOpenChange={(open) =>
					setConfirmationModal((prev) => ({ ...prev, open }))
				}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[var(--z-modal-elevated-overlay)]" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-[var(--z-modal-elevated)] border border-neutral-100">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 rounded-full bg-danger-50 flex items-center justify-center text-danger-600">
								<Trash2 className="w-5 h-5" />
							</div>
							<Dialog.Title className="text-xl font-bold text-neutral-900">
								{confirmationModal.title}
							</Dialog.Title>
						</div>

						<Dialog.Description className="text-neutral-500 mb-8">
							{confirmationModal.description}
						</Dialog.Description>

						<div className="flex gap-3">
							<Dialog.Close className="flex-1 py-3 text-sm font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
								Cancel
							</Dialog.Close>
							<button
								disabled={confirmationModal.loading}
								onClick={confirmationModal.onConfirm}
								className="flex-[2] py-3 bg-danger-600 hover:bg-danger-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-danger-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
							>
								{confirmationModal.loading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Trash2 className="w-4 h-4" />
								)}
								Confirm Action
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			{addingToOrder && (
				<Dialog.Root
					open={!!addingToOrder}
					onOpenChange={() => setAddingToOrder(null)}
				>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[var(--z-modal-overlay)]" />
						<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 z-[var(--z-modal)] border border-neutral-100 flex flex-col max-h-[85vh]">
							<div className="flex items-center justify-between mb-4">
								<div>
									<Dialog.Title className="text-xl font-bold text-neutral-900">
										Add Members to Team
									</Dialog.Title>
									<p className="text-xs text-neutral-500 mt-1">
										Assigning to:{" "}
										<span className="font-bold text-neutral-900">
											{addingToOrder.order_name}
										</span>
									</p>
								</div>
								<Dialog.Close className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
									<X className="w-5 h-5 text-neutral-500" />
								</Dialog.Close>
							</div>

							<div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
								<div className="grid grid-cols-1 gap-3 py-4">
									{packerAssignments.filter(
										(p) =>
											p.packer_status === "available" && p.active_orders === 0,
									).length === 0 ? (
										<div className="py-12 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
											<p className="text-neutral-400 text-sm">
												No available packers to add
											</p>
										</div>
									) : (
										packerAssignments
											.filter(
												(p) =>
													p.packer_status === "available" &&
													p.active_orders === 0,
											)
											.map((p) => (
												<div
													key={p.packer_id}
													className="flex items-center justify-between p-3 bg-white border border-neutral-100 rounded-xl hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
												>
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold group-hover:bg-primary-100 transition-colors">
															{p.full_name.charAt(0)}
														</div>
														<div>
															<p className="text-sm font-bold text-neutral-900">
																{p.full_name}
															</p>
															<p className="text-xs text-neutral-500">
																@{p.username}
															</p>
														</div>
													</div>
													<button
														disabled={assignPackerMutation.isPending}
														onClick={() =>
															assignPackerMutation.mutate({
																orderId: addingToOrder.id,
																packerId: p.packer_id,
															})
														}
														className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
													>
														{assignPackerMutation.isPending ? (
															<Loader2 className="w-4 h-4 animate-spin" />
														) : (
															"Add"
														)}
													</button>
												</div>
											))
									)}
								</div>
							</div>

							<div className="mt-6 pt-4 border-t border-neutral-100">
								<Dialog.Close className="w-full py-3 text-sm font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
									Done
								</Dialog.Close>
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			)}
		</div>
	);
}
