import { ClipboardList } from "lucide-react";
import type { PackageMaterial } from "@/features/orders/types";

export interface PackageService {
	id: string;
	order_package_id: string;
	service_id: string;
	is_final: boolean;
	result: Record<string, any> | null;
	service_name: string | null;
}

interface ServicesTabProps {
	selectedPackageMaterials: {
		vacuumPacking: PackageMaterial[];
		gasPacking: PackageMaterial[];
	};
	selectedPackageServices: PackageService[];
}

export function ServicesTab({
	selectedPackageMaterials,
	selectedPackageServices,
}: ServicesTabProps) {
	return (
		<div>
			{selectedPackageServices.length > 0 ||
			selectedPackageMaterials.vacuumPacking.length > 0 ||
			selectedPackageMaterials.gasPacking.length > 0 ? (
				<div className="space-y-4">
					{/* Vacuum Packing */}
					{selectedPackageMaterials.vacuumPacking.length > 0 && (
						<div className="border rounded-lg overflow-hidden">
							<div className="bg-accent-50 px-4 py-2 font-semibold text-sm text-accent-700">
								Vacuum Packing
							</div>
							<div className="p-4">
								{selectedPackageMaterials.vacuumPacking.map((material) => (
									<div
										key={material.id}
										className="flex items-center justify-between py-2"
									>
										<span className="font-medium">
											{material.variant_name || material.material_name}
										</span>
										<span className="text-neutral-600">
											{material.quantity} {material.unit_name}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Gas Packing */}
					{selectedPackageMaterials.gasPacking.length > 0 && (
						<div className="border rounded-lg overflow-hidden">
							<div className="bg-aqua-50 px-4 py-2 font-semibold text-sm text-aqua-700">
								Gas Packing
							</div>
							<div className="p-4">
								{selectedPackageMaterials.gasPacking.map((material) => (
									<div
										key={material.id}
										className="flex items-center justify-between py-2"
									>
										<span className="font-medium">
											{material.variant_name || material.material_name}
										</span>
										<span className="text-neutral-600">
											{material.quantity} {material.unit_name}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Other Services */}
					{selectedPackageServices.length > 0 && (
						<div className="border rounded-lg overflow-hidden">
							<div className="bg-neutral-50 px-4 py-2 font-semibold text-sm text-neutral-700">
								Services
							</div>
							<div className="divide-y divide-neutral-100">
								{selectedPackageServices.map((service) => (
									<div key={service.id} className="p-4">
										<div className="flex items-center justify-between">
											<span className="font-medium">
												{service.service_name}
											</span>
											<span
												className={`px-2 py-0.5 rounded-full text-xs font-medium ${
													service.is_final
														? "bg-success-100 text-success-700"
														: "bg-warning-100 text-warning-700"
												}`}
											>
												{service.is_final ? "Completed" : "Pending"}
											</span>
										</div>
										{service.result &&
											Object.keys(service.result).length > 0 && (
												<div className="mt-2 text-sm text-neutral-600 bg-neutral-50 rounded p-2">
													<pre className="whitespace-pre-wrap">
														{JSON.stringify(service.result, null, 2)}
													</pre>
												</div>
											)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			) : (
				<div className="text-center text-neutral-500 py-8">
					<ClipboardList className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
					<p>No services for this package</p>
				</div>
			)}
		</div>
	);
}
