import { CheckCircle2, Info } from "lucide-react";
import type { MappingConfig } from "@/features/orders/hooks/useInventorySync";
import type {
	Order,
	PackageInstance,
	PackageItem,
} from "@/features/orders/types";

interface UnlinkedItemsPanelProps {
	order: Order;
	packageItems: PackageItem[] | undefined;
	clientInventory: any[] | undefined;
	packageInstances: PackageInstance[] | undefined;
	mappingConfigs: Record<string, MappingConfig>;
	setMappingConfigs: React.Dispatch<
		React.SetStateAction<Record<string, MappingConfig>>
	>;
}

/** "Unlinked Custom Items" tab of the Sync & Link Inventory modal. */
export function UnlinkedItemsPanel({
	order,
	packageItems,
	clientInventory,
	packageInstances,
	mappingConfigs,
	setMappingConfigs,
}: UnlinkedItemsPanelProps) {
	const unlinkedItems = packageItems?.filter((item) => !item.items_db_id) || [];

	return (
		<div className="space-y-4">
			<div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-900 text-sm leading-relaxed flex gap-3">
				<Info className="w-5 h-5 shrink-0 text-primary-600 mt-0.5" />
				<div>
					<p className="font-bold">Linking Custom Items to Inventory</p>
					<p className="mt-1">
						Below is a list of custom items that were entered as text instead of
						linking to the client's inventory. Select a matching item from the
						inventory database below to convert them into linked inventory items
						and automatically transfer any packer photos.
					</p>
				</div>
			</div>

			{unlinkedItems.length === 0 ? (
				<div className="p-8 text-center text-neutral-500 border border-dashed rounded-lg bg-neutral-50">
					<CheckCircle2 className="w-12 h-12 text-success-500 mx-auto mb-2" />
					<p className="font-medium text-neutral-700">
						No unlinked custom items found!
					</p>
					<p className="text-sm mt-1">
						All items in this order are successfully linked to inventory.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{unlinkedItems.map((item) => {
						const pkg = order?.order_packages.find(
							(p) => p.id === item.order_package_id,
						);
						const pkgInstances =
							packageInstances?.filter(
								(inst) => inst.order_package_id === item.order_package_id,
							) || [];
						const config = mappingConfigs[item.id] || {
							itemsDbId: "",
							distributionMode: "single",
							pkgInstanceId: "",
						};
						const hasMultipleInstances =
							pkgInstances.length > 1 && item.quantity > 1;

						return (
							<div
								key={item.id}
								className="border rounded-xl p-4 bg-white shadow-xs flex flex-col md:flex-row gap-6 hover:border-accent-300 transition-colors"
							>
								{/* Left: Custom Item Details */}
								<div className="md:w-1/3 space-y-2">
									<div className="flex items-center gap-2">
										<span className="bg-neutral-100 text-neutral-800 text-xs font-bold px-2 py-0.5 rounded-full">
											Box #{pkg?.package_number || "?"}
										</span>
										<span className="bg-warning-100 text-warning-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
											Unlinked
										</span>
									</div>
									<p className="font-bold text-neutral-900 text-base leading-tight">
										{item.designation || "—"}
									</p>
									<div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
										<div>
											Qty:{" "}
											<span className="font-semibold text-neutral-800">
												{item.quantity}
											</span>
										</div>
										<div>
											L×W×H:{" "}
											<span className="font-semibold text-neutral-800">
												{item.length || "—"}×{item.width || "—"}×
												{item.height || "—"}
											</span>
										</div>
									</div>
								</div>

								{/* Right: Mapping Controls */}
								<div className="md:w-2/3 space-y-3">
									<div>
										<label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
											Match with Inventory Item
										</label>
										<select
											value={config.itemsDbId}
											onChange={(e) => {
												setMappingConfigs((prev) => ({
													...prev,
													[item.id]: {
														...prev[item.id],
														itemsDbId: e.target.value,
													},
												}));
											}}
											className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:border-accent-500 focus:ring-accent-500 outline-hidden"
										>
											<option value="">
												Do not link (leave as custom item)
											</option>
											{clientInventory?.map((dbItem) => {
												const isSuggested =
													dbItem.length === item.length &&
													dbItem.width === item.width &&
													dbItem.height === item.height;
												return (
													<option key={dbItem.id} value={dbItem.id}>
														{dbItem.item_num ? `#${dbItem.item_num}` : ""} -{" "}
														{dbItem.description} ({dbItem.length}x{dbItem.width}
														x{dbItem.height})
														{isSuggested ? " [Suggested Dimension Match]" : ""}
													</option>
												);
											})}
										</select>
									</div>

									{config.itemsDbId && hasMultipleInstances && (
										<div>
											<label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
												How to distribute {item.quantity} packed items?
											</label>
											<div className="flex gap-4">
												<label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 cursor-pointer">
													<input
														type="radio"
														name={`dist-mode-${item.id}`}
														checked={config.distributionMode === "distribute"}
														onChange={() => {
															setMappingConfigs((prev) => ({
																...prev,
																[item.id]: {
																	...prev[item.id],
																	distributionMode: "distribute",
																},
															}));
														}}
														className="w-4 h-4 text-accent-600 focus:ring-accent-500"
													/>
													Distribute evenly across all {pkgInstances.length}{" "}
													instances
												</label>
												<label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 cursor-pointer">
													<input
														type="radio"
														name={`dist-mode-${item.id}`}
														checked={config.distributionMode === "single"}
														onChange={() => {
															setMappingConfigs((prev) => ({
																...prev,
																[item.id]: {
																	...prev[item.id],
																	distributionMode: "single",
																},
															}));
														}}
														className="w-4 h-4 text-accent-600 focus:ring-accent-500"
													/>
													Place all in a single instance
												</label>
											</div>
										</div>
									)}

									{config.itemsDbId && config.distributionMode === "single" && (
										<div>
											<label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
												Target Box Instance
											</label>
											<select
												value={config.pkgInstanceId}
												onChange={(e) => {
													setMappingConfigs((prev) => ({
														...prev,
														[item.id]: {
															...prev[item.id],
															pkgInstanceId: e.target.value,
														},
													}));
												}}
												className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
											>
												{pkgInstances.map((inst) => (
													<option key={inst.id} value={inst.id}>
														Instance #{inst.instance_number} (
														{inst.ipac_reference || "No Ref"})
													</option>
												))}
											</select>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
