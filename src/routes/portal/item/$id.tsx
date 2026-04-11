import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Maximize, Ruler, Info, MapPin, Scale } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/portal/item/$id")({
	component: ItemView,
});

function ItemView() {
	const { id } = useParams({ from: '/portal/item/$id' });
	const navigate = useNavigate();

	const { data: record, isLoading } = useQuery({
		queryKey: ['portal-item', id],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('maintenance_db')
				.select(`
					*,
					maintenance_package_categories (label),
					maintenance_package_items (
						id,
                        quantity,
						order_packages (
							id,
							package_number,
							reference_number,
							orders (order_name)
						)
					)
				`)
				.eq('id', id)
				.single();
			
			if (error) throw error;
			return data;
		}
	});

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (!record) {
		return <div className="p-8 text-center bg-gray-50 min-h-screen">Item not found</div>;
	}

	const item = record; // The record IS the item now!
	const packingHistory = record.maintenance_package_items || [];

	return (
		<div className="min-h-screen bg-gray-50 pb-24">
			{/* Brand Header */}
			<header className="bg-white border-b border-gray-200 sticky top-0 z-30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
							<button onClick={() => navigate({ to: '/portal/projects' })} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
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
				
				{/* Location Banner (If packed) */}
				{packingHistory.length > 0 ? (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 px-1">Packing Locations</h3>
                        {packingHistory.map((historyItem: any) => {
                            const pkg = historyItem.order_packages;
                            if (!pkg) return null;
                            
                            return (
                                <div key={historyItem.id} className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
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
                                            <h3 className="text-xl font-bold text-gray-900">Inside {pkg.reference_number || `Package ${pkg.package_number}`}</h3>
                                            <p className="text-blue-700 mt-1">Part of order: {pkg.orders?.order_name}</p>
                                        </div>
                                        
                                        <Link 
                                            to={`/portal/package/${pkg.id}`}
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
						<AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
						<div>
							<p className="font-semibold">Not Packed</p>
							<p className="text-sm">This item has not yet been assigned to any packages.</p>
						</div>
					</div>
				)}

				{/* Item Hero Card */}
				<section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
					<div className="mb-8">
						<div className="flex items-center gap-2 mb-2">
							<span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
								{item.maintenance_package_categories?.label || 'General'}
							</span>
							<span className="text-sm font-medium text-gray-500">REF: {item.item_num || 'None'}</span>
						</div>
						<h2 className="text-3xl font-black text-gray-900 tracking-tight">
							{item.description || item.reference || 'Unnamed Item'}
						</h2>
                        <div className="mt-4 flex gap-4 text-sm font-medium">
                            <div className="bg-gray-100 px-3 py-1 rounded-lg text-gray-700">
                                Expected: <span className="font-bold">{item.expected_qty}</span>
                            </div>
                            <div className="bg-blue-100 px-3 py-1 rounded-lg text-blue-700">
                                Packed: <span className="font-bold">{item.packed_qty || 0}</span>
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
							<div className="text-xl font-bold text-gray-900">{item.length || '--'} <span className="text-sm font-medium text-gray-500">cm</span></div>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Width</span>
							</div>
							<div className="text-xl font-bold text-gray-900">{item.width || '--'} <span className="text-sm font-medium text-gray-500">cm</span></div>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4 text-rotate-90" />
								<span className="text-xs font-semibold uppercase">Height</span>
							</div>
							<div className="text-xl font-bold text-gray-900">{item.height || '--'} <span className="text-sm font-medium text-gray-500">cm</span></div>
						</div>
						<div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100/60">
							<div className="flex items-center gap-2 text-emerald-600 mb-1">
								<Scale className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Net Weight</span>
							</div>
							<div className="text-xl font-bold text-emerald-900">{item.net_weight || '--'} <span className="text-sm font-medium text-emerald-600">kg</span></div>
						</div>
					</div>

					{/* Notes section if they exist */}
					{(record.ipac_comments) && (
						<div className="mt-8">
							<h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">IPAC Notes</h3>
							<div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 italic text-gray-600 shadow-inner">
								"{record.ipac_comments}"
							</div>
						</div>
					)}
				</section>
			</main>
		</div>
	);
}

// Ensure AlertCircle is defined since it is used in the UI
import { AlertCircle } from "lucide-react";
