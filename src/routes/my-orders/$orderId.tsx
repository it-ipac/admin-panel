import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
	ArrowLeft,
	Boxes,
	ChevronRight,
	Loader2,
	Package,
	PackageX,
} from "lucide-react";
import { Sidebar } from "../../components/Sidebar";
import { useRequirePageAccess } from "../../hooks/usePageAccess";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/my-orders/$orderId")({
	component: MyOrderDetailPage,
});

const statusColors: Record<string, string> = {
	pending: "bg-warning-100 text-warning-700",
	in_progress: "bg-primary-100 text-primary-700",
	completed: "bg-success-100 text-success-700",
};

interface OrderRow {
	id: string;
	order_name: string | null;
	order_number: string | null;
	production_status: string | null;
	created_at: string | null;
	project_type: string | null;
}

interface BoxRow {
	id: string;
	instance_number: number | null;
	status: string | null;
	ipac_reference: string | null;
	pkg_number: number | null;
	itemCount: number;
}

function MyOrderDetailPage() {
	const { user, loading: authLoading } = useRequirePageAccess();
	const { orderId } = useParams({ from: "/my-orders/$orderId" });

	// All queries are constrained by RLS to the client's own order data.
	const { data, isLoading } = useQuery({
		queryKey: ["my-order", orderId],
		queryFn: async (): Promise<{ order: OrderRow | null; boxes: BoxRow[] }> => {
			const { data: order, error: orderError } = await supabase
				.from("orders")
				.select(
					"id, order_name, order_number, production_status, created_at, project_type",
				)
				.eq("id", orderId)
				.maybeSingle();
			if (orderError) throw orderError;
			if (!order) return { order: null, boxes: [] };

			const { data: instances, error: boxesError } = await supabase
				.from("order_pkg_instance")
				.select(`
					id,
					instance_number,
					status,
					ipac_reference,
					order_pkg_overview!inner ( order_id, pkg_number ),
					pkd_item ( id )
				`)
				.eq("order_pkg_overview.order_id", orderId)
				.order("instance_number");
			if (boxesError) throw boxesError;

			const boxes: BoxRow[] = (instances || []).map((b: any) => ({
				id: b.id,
				instance_number: b.instance_number ?? null,
				status: b.status ?? null,
				ipac_reference: b.ipac_reference ?? null,
				pkg_number: Array.isArray(b.order_pkg_overview)
					? (b.order_pkg_overview[0]?.pkg_number ?? null)
					: (b.order_pkg_overview?.pkg_number ?? null),
				itemCount: Array.isArray(b.pkd_item) ? b.pkd_item.length : 0,
			}));

			return { order: order as OrderRow, boxes };
		},
		enabled: !!user,
	});

	if (authLoading || isLoading) {
		return (
			<div className="flex h-screen bg-neutral-50">
				<Sidebar />
				<main className="flex-1 flex items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
				</main>
			</div>
		);
	}

	if (!data?.order) {
		return (
			<div className="flex h-screen bg-neutral-50">
				<Sidebar />
				<main className="flex-1 flex flex-col items-center justify-center text-center p-8">
					<PackageX className="w-12 h-12 text-neutral-300 mb-4" />
					<h2 className="text-xl font-semibold text-neutral-900">
						Order not found
					</h2>
					<p className="text-neutral-500 mt-1">
						This order doesn't exist or you don't have access to it.
					</p>
					<Link
						to="/my-orders"
						className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to My Orders
					</Link>
				</main>
			</div>
		);
	}

	const { order, boxes } = data;

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8 max-w-5xl mx-auto">
					<Link
						to="/my-orders"
						className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 mb-6"
					>
						<ArrowLeft className="w-4 h-4" />
						Back to My Orders
					</Link>

					<div className="flex items-start justify-between mb-8">
						<div>
							<h1 className="text-2xl font-bold text-neutral-900">
								{order.order_name}
							</h1>
							<p className="text-neutral-500 mt-1">{order.order_number}</p>
						</div>
						<span
							className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full ${statusColors[order.production_status || ""] || "bg-neutral-100 text-neutral-700"}`}
						>
							{order.production_status?.replace("_", " ") || "—"}
						</span>
					</div>

					<div className="flex items-center gap-2 mb-4">
						<Boxes className="w-5 h-5 text-neutral-500" />
						<h2 className="text-lg font-semibold text-neutral-900">
							Packages ({boxes.length})
						</h2>
					</div>

					{boxes.length === 0 ? (
						<div className="bg-white rounded-xl border border-neutral-100 p-12 text-center">
							<Package className="w-12 h-12 text-neutral-300 mb-4 mx-auto" />
							<p className="text-neutral-500">
								No packages have been recorded for this order yet.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{boxes.map((box) => (
								<Link
									key={box.id}
									to="/portal/package/$id"
									params={{ id: box.id }}
									className="bg-white rounded-xl border border-neutral-100 shadow-sm p-5 hover:border-primary-300 hover:shadow-md transition-all group"
								>
									<div className="flex items-start justify-between">
										<div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
											<Package className="w-5 h-5 text-primary-600" />
										</div>
										<ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-primary-500" />
									</div>
									<p className="mt-3 font-semibold text-neutral-900">
										{box.ipac_reference ||
											`Box ${box.pkg_number ?? box.instance_number ?? ""}`}
									</p>
									<div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
										<span>{box.itemCount} items</span>
										{box.status && (
											<>
												<span>·</span>
												<span className="capitalize">
													{box.status.replace("_", " ")}
												</span>
											</>
										)}
									</div>
								</Link>
							))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
