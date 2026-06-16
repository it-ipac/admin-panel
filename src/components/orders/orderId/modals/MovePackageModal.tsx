import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { useState } from "react";
import type { OrderPackage, PackageInstance } from "@/features/orders/types";
import { db } from "@/lib/supabase";

interface MovePackageModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedPackage: OrderPackage;
	instances: PackageInstance[];
	sourceOrderId: string;
	isMoving: boolean;
	onConfirm: (targetOrderId: string) => void;
}

interface OrderRow {
	id: string;
	order_name: string;
	client_name?: string;
}

export function MovePackageModal({
	open,
	onOpenChange,
	selectedPackage,
	instances,
	sourceOrderId,
	isMoving,
	onConfirm,
}: MovePackageModalProps) {
	const [search, setSearch] = useState("");
	const [targetId, setTargetId] = useState<string | null>(null);

	const { data: orders, isLoading } = useQuery({
		queryKey: ["orders"],
		queryFn: async () => {
			const { data, error } = await db.getOrders();
			if (error) throw error;
			return (data || []) as OrderRow[];
		},
		enabled: open,
		staleTime: 30_000,
	});

	if (!open) return null;

	const term = search.toLowerCase();
	const candidates = (orders || [])
		.filter((o) => o.id !== sourceOrderId)
		.filter(
			(o) =>
				!term ||
				o.order_name?.toLowerCase().includes(term) ||
				o.client_name?.toLowerCase().includes(term),
		);

	const target = candidates.find((o) => o.id === targetId) || null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden">
				<div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
					<h3 className="font-semibold text-neutral-800">
						Move Box #{selectedPackage.package_number} to another order
					</h3>
					<button
						onClick={() => onOpenChange(false)}
						className="text-neutral-400 hover:text-neutral-600"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-4 space-y-4">
					<div className="relative">
						<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
						<input
							className="w-full border border-neutral-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary-500"
							placeholder="Search target order…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>

					<div className="max-h-56 overflow-y-auto border border-neutral-100 rounded-md divide-y divide-neutral-100">
						{isLoading ? (
							<div className="p-4 text-sm text-neutral-500 flex items-center gap-2">
								<Loader2 className="w-4 h-4 animate-spin" /> Loading orders…
							</div>
						) : candidates.length === 0 ? (
							<div className="p-4 text-sm text-neutral-500">
								No other orders found.
							</div>
						) : (
							candidates.map((o) => (
								<button
									key={o.id}
									onClick={() => setTargetId(o.id)}
									className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors ${
										targetId === o.id ? "bg-primary-50" : ""
									}`}
								>
									<span className="font-medium text-neutral-800">
										{o.order_name}
									</span>
									{o.client_name ? (
										<span className="text-neutral-500"> · {o.client_name}</span>
									) : null}
								</button>
							))
						)}
					</div>

					{target && (
						<div className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-100 rounded-md p-3 space-y-1">
							<div className="flex items-center gap-2 font-medium text-neutral-800">
								Box #{selectedPackage.package_number}
								<ArrowRight className="w-4 h-4" />
								{target.order_name}
							</div>
							<p>
								Moves {instances.length} instance
								{instances.length === 1 ? "" : "s"} with all items, materials,
								securing, services, photos and task links.
							</p>
							<p>
								The box number is reassigned in the target order to avoid
								conflicts, and IPAC references are regenerated. QR codes stay
								the same.
							</p>
						</div>
					)}
				</div>

				<div className="px-4 py-3 border-t border-neutral-100 flex justify-end gap-2 bg-neutral-50">
					<button
						onClick={() => onOpenChange(false)}
						className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded"
					>
						Cancel
					</button>
					<button
						onClick={() => target && onConfirm(target.id)}
						disabled={!target || isMoving}
						className="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded flex items-center gap-2 disabled:opacity-50"
					>
						{isMoving && <Loader2 className="w-4 h-4 animate-spin" />}
						Move box
					</button>
				</div>
			</div>
		</div>
	);
}
