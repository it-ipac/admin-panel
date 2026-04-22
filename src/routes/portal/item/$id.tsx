import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Info,
	Loader2,
	MapPin,
	Ruler,
	Scale,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/portal/item/$id")({
	component: ItemView,
});

function ItemView() {
	const { id } = useParams({ from: "/portal/item/$id" });
	const navigate = useNavigate();

	const { data: record, isLoading } = useQuery({
		queryKey: ["portal-item", id],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("items_db")
				.select(`
					*,
					pkg_category (label),
					pkd_item (
						*,
						pkg_instance:order_pkg_instance (
							*,
							order_pkg_overview (
								id,
								pkg_number,
								quantity,
								quantity_packed,
								description,
								order_id
							),
							order_package:order_packages (
								id,
								package_number,
								reference,
								reference_number,
								status,
								orders (order_name)
							)
						)
					)
				`)
				.eq("id", id)
				.single();

			if (error) throw error;
			return data;
		},
	});

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!record) {
		return (
			<div className="p-8 text-center bg-gray-50 min-h-screen">
				Item not found
			</div>
		);
	}

	const item = record;
	const packingHistory = (record.pkd_item || [])
		.map((entry: any) => {
			const pkgInstance = entry?.pkg_instance;
			const pkgOverview = pkgInstance?.order_pkg_overview;
			const orderPackage = pkgInstance?.order_package;

			const packageId = pkgInstance?.id || orderPackage?.id || null;
			if (!packageId) return null;

			const packageNumber =
				pkgOverview?.pkg_number ?? orderPackage?.package_number ?? null;

			return {
				id: entry.id,
				quantity: entry.quantity,
				packageId,
				packageNumber,
				instanceNumber: pkgInstance?.instance_number ?? null,
				pkdItemRow: entry,
				pkgInstanceRow: pkgInstance || null,
				label:
					orderPackage?.reference ||
					orderPackage?.reference_number ||
					(packageNumber ? `Package ${packageNumber}` : "Package"),
				orderName: orderPackage?.orders?.order_name || null,
			};
		})
		.filter(Boolean) as Array<{
		id: string;
		quantity: number;
		packageId: string;
		packageNumber: number | null;
		instanceNumber: number | null;
		pkdItemRow: Record<string, any>;
		pkgInstanceRow: Record<string, any> | null;
		label: string;
		orderName: string | null;
	}>;

	return (
		<div className="min-h-screen bg-gray-50 pb-24">
			{/* Brand Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
							<button
								onClick={() => navigate({ to: "/portal/projects" })}
								className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
							>
								<ArrowLeft className="w-5 h-5" />
							</button>
							<div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
								<Info className="w-5 h-5 text-white" />
							</div>
							<h1 className="text-lg font-bold text-gray-900">Item Details</h1>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
				<section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
					<div className="flex flex-wrap items-center gap-3">
						<button
							onClick={() => {
								if (
									typeof window !== "undefined" &&
									window.history.length > 1
								) {
									window.history.back();
									return;
								}
								navigate({ to: "/portal/projects" });
							}}
							className="inline-flex items-center justify-center py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
						>
							Go Back
						</button>
						<Link
							to="/portal/projects"
							className="inline-flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
						>
							View All Items
						</Link>
					</div>
					<p className="text-sm text-gray-600 mt-3">
						Need another box? Use the package links below to browse other boxes
						this item appears in.
					</p>
				</section>

				{/* Location Banner (If packed) */}
				{packingHistory.length > 0 ? (
					<div className="space-y-4">
						<h3 className="text-lg font-bold text-gray-900 px-1">
							Packing Locations
						</h3>
						{packingHistory.map((historyItem) => {
							return (
								<div
									key={historyItem.id}
									className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 relative overflow-hidden"
								>
									<div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-blue-100 rounded-full opacity-50"></div>
									<div className="absolute right-0 top-0 mt-8 mr-12 w-32 h-32 bg-blue-200 rounded-full opacity-30"></div>

									<div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
										<div>
											<div className="flex items-center gap-2 mb-2">
												<MapPin className="w-5 h-5 text-blue-600" />
												<span className="text-sm font-bold text-blue-800 uppercase tracking-wide">
													Packed Qty: {historyItem.quantity}
												</span>
											</div>
											<h3 className="text-xl font-bold text-gray-900">
												Inside {historyItem.label}
											</h3>
											<p className="text-blue-700 mt-1">
												{historyItem.instanceNumber
													? `Instance #${historyItem.instanceNumber}`
													: `Package #${historyItem.packageNumber ?? "-"}`}
												{historyItem.orderName
													? ` • Order: ${historyItem.orderName}`
													: ""}
											</p>
										</div>

										<Link
											to="/portal/package/$id"
											params={{ id: historyItem.packageId }}
											className="inline-flex items-center justify-center py-2.5 px-5 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200/60 rounded-xl font-bold shadow-sm transition-colors whitespace-nowrap"
										>
											View Package Contents
										</Link>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl flex items-center gap-3">
						<AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
						<div>
							<p className="font-semibold">Not Packed</p>
							<p className="text-sm">
								This item has not yet been assigned to any packages.
							</p>
						</div>
					</div>
				)}

				{/* Item Hero Card */}
				<section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
					<div className="mb-8">
						<div className="flex items-center gap-2 mb-2">
							<span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
								{item.pkg_category?.label || "General"}
							</span>
							<span className="text-sm font-medium text-gray-500">
								REF: {item.item_num || "None"}
							</span>
						</div>
						<h2 className="text-3xl font-black text-gray-900 tracking-tight">
							{item.description || item.reference || "Unnamed Item"}
						</h2>
						<div className="mt-4 flex gap-4 text-sm font-medium">
							<div className="bg-gray-100 px-3 py-1 rounded-lg text-gray-700">
								Expected: <span className="font-bold">{item.expected_qty}</span>
							</div>
							<div className="bg-blue-100 px-3 py-1 rounded-lg text-blue-700">
								Packed:{" "}
								<span className="font-bold">{item.packed_qty || 0}</span>
							</div>
						</div>
					</div>

					{/* Dimensions Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-gray-100">
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Length</span>
							</div>
							<div className="text-xl font-bold text-gray-900">
								{item.length || "--"}{" "}
								<span className="text-sm font-medium text-gray-500">cm</span>
							</div>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Width</span>
							</div>
							<div className="text-xl font-bold text-gray-900">
								{item.width || "--"}{" "}
								<span className="text-sm font-medium text-gray-500">cm</span>
							</div>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4 text-rotate-90" />
								<span className="text-xs font-semibold uppercase">Height</span>
							</div>
							<div className="text-xl font-bold text-gray-900">
								{item.height || "--"}{" "}
								<span className="text-sm font-medium text-gray-500">cm</span>
							</div>
						</div>
						<div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100/60">
							<div className="flex items-center gap-2 text-emerald-600 mb-1">
								<Scale className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">
									Net Weight
								</span>
							</div>
							<div className="text-xl font-bold text-emerald-900">
								{item.net_weight || "--"}{" "}
								<span className="text-sm font-medium text-emerald-600">kg</span>
							</div>
						</div>
					</div>

					{/* Notes section if they exist */}
					{record.ipac_comments && (
						<div className="mt-8">
							<h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">
								IPAC Notes
							</h3>
							<div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 italic text-gray-600 shadow-inner">
								"{record.ipac_comments}"
							</div>
						</div>
					)}
				</section>

				<section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
					<h3 className="text-lg font-bold text-gray-900">Database Rows</h3>
					<p className="text-sm text-gray-500 mt-1 mb-4">
						Full records for this item and its packing rows.
					</p>

					<details className="rounded-xl border border-gray-200 bg-gray-50 p-4">
						<summary className="cursor-pointer text-sm font-semibold text-gray-800">
							View full item row (items_db)
						</summary>
						<pre className="mt-3 text-xs text-gray-700 overflow-auto whitespace-pre-wrap wrap-break-word">
							{JSON.stringify(item, null, 2)}
						</pre>
					</details>

					{packingHistory.length === 0 ? (
						<div className="mt-4 text-sm text-gray-500">
							No `pkd_item` rows found for this item yet.
						</div>
					) : (
						<div className="mt-4 space-y-4">
							{packingHistory.map((historyItem) => (
								<div
									key={`db-${historyItem.id}`}
									className="rounded-xl border border-gray-200 p-4"
								>
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
											pkd_item #{historyItem.id}
										</span>
										<span className="text-xs text-gray-600">
											Qty: {historyItem.quantity}
										</span>
										{historyItem.packageId && (
											<Link
												to="/portal/package/$id"
												params={{ id: historyItem.packageId }}
												className="text-xs font-semibold text-blue-700 hover:text-blue-800"
											>
												Open Box
											</Link>
										)}
									</div>

									<details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
										<summary className="cursor-pointer text-xs font-semibold text-gray-800">
											View full pkd_item row
										</summary>
										<pre className="mt-2 text-xs text-gray-700 overflow-auto whitespace-pre-wrap wrap-break-word">
											{JSON.stringify(historyItem.pkdItemRow, null, 2)}
										</pre>
									</details>

									<details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
										<summary className="cursor-pointer text-xs font-semibold text-gray-800">
											View full order_pkg_instance row
										</summary>
										<pre className="mt-2 text-xs text-gray-700 overflow-auto whitespace-pre-wrap wrap-break-word">
											{historyItem.pkgInstanceRow
												? JSON.stringify(historyItem.pkgInstanceRow, null, 2)
												: "No linked order_pkg_instance row."}
										</pre>
									</details>
								</div>
							))}
						</div>
					)}
				</section>
			</main>
		</div>
	);
}
