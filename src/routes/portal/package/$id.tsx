import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, ArrowLeft, Maximize, Ruler } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/portal/package/$id")({
	component: PackageView,
});

function PackageView() {
	const { id } = useParams({ from: '/portal/package/$id' });
	const navigate = useNavigate();

	const { data: pkg, isLoading } = useQuery({
		queryKey: ['portal-package', id],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('order_packages')
				.select(`
					*,
					box_type (name),
					maintenance_package_items (
						id, quantity, ipac_comments,
						maintenance_db (
							id, item_num, reference, description, length, width, height, net_weight, expected_qty, packed_qty, warehouse_location,
							maintenance_package_categories (label)
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

	if (!pkg) {
		return <div className="p-8 text-center bg-gray-50 min-h-screen">Package not found</div>;
	}

	const items = pkg.maintenance_package_items || [];

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
							<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
								<Package className="w-5 h-5 text-white" />
							</div>
							<h1 className="text-lg font-bold text-gray-900">Package Details</h1>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
				{/* Package Hero Card */}
				<section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
						<div>
							<div className="flex items-center gap-2 mb-2">
								<span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
									{pkg.status || 'Packed'}
								</span>
								<span className="text-sm font-medium text-gray-500">Box #{pkg.package_number}</span>
							</div>
							<h2 className="text-3xl font-black text-gray-900 tracking-tight">
								{pkg.reference_number || `Package ${pkg.package_number}`}
							</h2>
						</div>
                        
                        <div className="text-left sm:text-right">
                            <div className="text-sm text-gray-500 font-medium">Box Type</div>
                            <div className="text-lg font-bold text-gray-900">{pkg.box_type?.name || 'Standard Wooden Crate'}</div>
                        </div>
					</div>

					{/* Dimensions Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-t border-gray-100">
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Length</span>
							</div>
							<div className="text-xl font-bold text-gray-900">{pkg.actual_length || '--'} <span className="text-sm font-medium text-gray-500">cm</span></div>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Width</span>
							</div>
							<div className="text-xl font-bold text-gray-900">{pkg.actual_width || '--'} <span className="text-sm font-medium text-gray-500">cm</span></div>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 border border-gray-200/60">
							<div className="flex items-center gap-2 text-gray-500 mb-1">
								<Ruler className="w-4 h-4 text-rotate-90" />
								<span className="text-xs font-semibold uppercase">Height</span>
							</div>
							<div className="text-xl font-bold text-gray-900">{pkg.actual_height || '--'} <span className="text-sm font-medium text-gray-500">cm</span></div>
						</div>
						<div className="bg-blue-50 rounded-xl p-4 border border-blue-100/60">
							<div className="flex items-center gap-2 text-blue-600 mb-1">
								<Maximize className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Volume</span>
							</div>
							<div className="text-xl font-bold text-blue-900">{pkg.actual_volume || '--'} <span className="text-sm font-medium text-blue-600">m³</span></div>
						</div>
					</div>
				</section>

				{/* Items manifest */}
				<section>
					<div className="flex items-center justify-between mb-4 mt-8 px-1">
						<h3 className="text-lg font-bold text-gray-900">Contents Manifest ({items.length})</h3>
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
						{items.length === 0 ? (
							<div className="p-8 text-center text-gray-500">No items packed in this box yet.</div>
						) : (
							<ul className="divide-y divide-gray-100">
								{items.map((entry: any) => {
									const item = entry.maintenance_db;
                                    if (!item) return null;
									return (
										<li key={entry.id}>
											<Link 
												to={`/portal/item/${item.id}`} 
												className="block p-4 sm:p-6 hover:bg-gray-50 transition-colors"
											>
												<div className="flex justify-between items-start gap-4">
													<div>
														<div className="flex items-center gap-2 mb-1">
															<span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
																{item?.item_num || 'NO-REF'}
															</span>
                                                            <span className="text-xs font-medium text-gray-500">
                                                                {item?.maintenance_package_categories?.label}
                                                            </span>
														</div>
														<h4 className="text-base font-semibold text-gray-900">{item?.description || item.reference || 'Unnamed Item'}</h4>
                                                        <div className="text-sm font-medium text-blue-700 mt-0.5">
                                                            Packed Qty: {entry.quantity}
                                                        </div>
														{entry.ipac_comments && (
															<p className="text-sm text-gray-500 mt-1 line-clamp-2">{entry.ipac_comments}</p>
														)}
													</div>
													<div className="text-right whitespace-nowrap">
														<div className="text-sm font-bold text-gray-900">{item?.net_weight ? `${item.net_weight} kg` : '--'}</div>
													</div>
												</div>
											</Link>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
