import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, PackageX, QrCode, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { auth, db, supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/portal/projects/")({
	component: PortalProjects,
});

const QR_DRIVEN_PORTAL = true;

function PortalProjects() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	// Redirect to portal login if unauthenticated
	useEffect(() => {
		if (!loading && !user) {
			navigate({
				to: "/portal/login",
				search: { returnUrl: window.location.pathname },
			});
		}
	}, [user, loading, navigate]);

	// Fetch current user's profile to extract their client_id and role
	const { data: profile, isLoading: profileLoading } = useQuery({
		queryKey: ["currentUserProfile", user?.id],
		queryFn: async () => {
			if (!user) return null;
			const { data, error } = await db.getProfile(user.id);
			if (error) throw error;
			return data;
		},
		enabled: !!user,
	});

	const clientId = profile?.client_id;
	const roleName = profile?.roles?.name;
	const isStaffUser =
		roleName === "admin" ||
		roleName === "director" ||
		roleName === "project_lead" ||
		roleName === "sales";
	const [itemSearch, setItemSearch] = useState("");

	const {
		data: items,
		isLoading: itemsLoading,
		error: itemsError,
	} = useQuery({
		queryKey: ["portal-items", clientId],
		queryFn: async () => {
			if (!clientId) return [];

			const { data, error } = await supabase
				.from("items_db")
				.select(`
					id,
					item_num,
					reference,
					description,
					expected_qty,
					packed_qty,
					pkg_category (label)
				`)
				.eq("client_id", clientId)
				.order("item_num", { ascending: true })
				.limit(1000);

			if (error) throw error;
			return data || [];
		},
		enabled: !QR_DRIVEN_PORTAL && !!clientId,
	});

	const searchToken = itemSearch.trim().toLowerCase();
	const filteredItems = useMemo(() => {
		const source = items || [];
		if (!searchToken) return source;

		return source.filter((item: any) => {
			const searchable = [
				item.item_num,
				item.reference,
				item.description,
				item.pkg_category?.label,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return searchable.includes(searchToken);
		});
	}, [items, searchToken]);

	if (loading || profileLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	// Staff/admin accidentally landed on the client portal
	if (isStaffUser && !clientId) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
				<ShieldAlert className="w-16 h-16 text-warning-400 mb-4" />
				<h2 className="text-xl font-bold text-neutral-900 mb-2">
					Staff Account Detected
				</h2>
				<p className="text-neutral-500 max-w-md mb-6">
					You're logged in as a staff member (
					<span className="font-semibold">
						{profile?.full_name || profile?.username}
					</span>
					). This portal is for clients only.
				</p>
				<div className="flex gap-3">
					<Link
						to="/dashboard"
						className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
					>
						Go to Admin Panel
					</Link>
					<button
						onClick={async () => {
							await auth.signOut();
							navigate({ to: "/portal/login" });
						}}
						className="px-5 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors"
					>
						Sign out
					</button>
				</div>
			</div>
		);
	}

	if (!clientId) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
				<PackageX className="w-16 h-16 text-neutral-300 mb-4" />
				<h2 className="text-xl font-bold text-neutral-900 mb-2">
					No Client Assigned
				</h2>
				<p className="text-neutral-500 max-w-md mb-6">
					Your user profile is not linked to any client company. Please contact
					support.
				</p>
				<button
					onClick={async () => {
						await auth.signOut();
						navigate({ to: "/portal/login" });
					}}
					className="px-5 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors"
				>
					Sign out & try again
				</button>
			</div>
		);
	}

	if (QR_DRIVEN_PORTAL) {
		return (
			<div className="min-h-screen bg-neutral-50">
				<header className="bg-white border-b border-neutral-200">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between items-center h-16">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
									<QrCode className="w-5 h-5 text-white" />
								</div>
								<h1 className="text-lg font-bold text-neutral-900">
									IPAC Portal
								</h1>
							</div>
							<button
								className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
								onClick={async () => {
									await auth.signOut();
									navigate({ to: "/portal/login" });
								}}
							>
								Log out
							</button>
						</div>
					</div>
				</header>

				<main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
					<section className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
						<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
							<QrCode className="h-8 w-8" />
						</div>
						<h2 className="text-2xl font-bold text-neutral-900">
							Scan a QR code to view package details.
						</h2>
						<p className="mt-3 text-neutral-500">
							Use the camera on your device to scan the QR code attached to a
							box or package.
						</p>
					</section>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50">
			{/* Portal Header */}
			<header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="w-5 h-5 text-white"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
									role="img"
									aria-labelledby="portal-logo-title"
								>
									<title id="portal-logo-title">IPAC Portal Logo</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
									/>
								</svg>
							</div>
							<h1 className="text-lg font-bold text-neutral-900">
								IPAC Portal
							</h1>
						</div>
						<div className="flex items-center gap-4">
							<button
								className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
								onClick={async () => {
									await auth.signOut();
									navigate({ to: "/portal/login" });
								}}
							>
								Log out
							</button>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h2 className="text-2xl font-bold text-neutral-900">
						Your Inventory Projects
					</h2>
					<p className="text-neutral-500 mt-1">
						Browse all items and open detailed records for each item.
					</p>
				</div>

				<div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 sm:p-6">
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
						<input
							type="search"
							value={itemSearch}
							onChange={(event) => setItemSearch(event.target.value)}
							placeholder="Search item number, reference, or description"
							className="w-full sm:max-w-xl px-4 py-2.5 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
						/>
						<div className="text-sm text-neutral-500">
							{filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
						</div>
					</div>

					{itemsLoading ? (
						<div className="py-14 flex items-center justify-center text-neutral-500">
							<Loader2 className="w-5 h-5 mr-2 animate-spin" />
							Loading items...
						</div>
					) : itemsError ? (
						<div className="py-10 px-4 rounded-xl border border-danger-200 bg-danger-50 text-danger-700 text-sm">
							Failed to load items. Please refresh and try again.
						</div>
					) : filteredItems.length === 0 ? (
						<div className="py-10 px-4 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 text-center">
							No items found for this client.
						</div>
					) : (
						<ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
							{filteredItems.map((item: any) => {
								const packedQty = Number(item?.packed_qty ?? 0);
								const expectedQty = Number(item?.expected_qty ?? 0);
								const fullyPacked = expectedQty > 0 && packedQty >= expectedQty;

								return (
									<li key={item.id}>
										<Link
											to="/portal/item/$id"
											params={{ id: item.id }}
											className="block p-4 sm:p-5 hover:bg-neutral-50 transition-colors"
										>
											<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
												<div>
													<div className="flex items-center gap-2 mb-1.5">
														<span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
															{item.item_num || item.reference || "NO-REF"}
														</span>
														<span className="text-xs text-neutral-500">
															{item.pkg_category?.label || "General"}
														</span>
													</div>
													<h3 className="text-base font-semibold text-neutral-900">
														{item.description ||
															item.reference ||
															"Unnamed Item"}
													</h3>
												</div>
												<div className="sm:text-right text-sm">
													<div className="text-neutral-700">
														Packed {packedQty} / {expectedQty || "-"}
													</div>
													<div
														className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
															fullyPacked
																? "bg-success-100 text-success-700"
																: "bg-warning-100 text-warning-700"
														}`}
													>
														{fullyPacked ? "Packed" : "Pending"}
													</div>
												</div>
											</div>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</div>
			</main>
		</div>
	);
}
