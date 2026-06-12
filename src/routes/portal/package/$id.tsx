import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Maximize,
	Package,
	Ruler,
	X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";

const getPublicUrl = (path: string | null) => {
	if (!path) return "";
	if (path.startsWith("http")) return path;
	return `https://fqynbudvpvpiljdrrvem.supabase.co/storage/v1/object/public/media/${path}`;
};

function BoxPhotoGallery({
	photos,
}: {
	photos: { id: string; image_url: string; notes: string | null }[];
}) {
	const [active, setActive] = useState(0);
	const [lightbox, setLightbox] = useState<number | null>(null);
	if (!photos.length) return null;
	const prev = () => setActive((a) => (a - 1 + photos.length) % photos.length);
	const next = () => setActive((a) => (a + 1) % photos.length);
	return (
		<section className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
			<div className="relative aspect-video bg-neutral-900">
				<img
					src={getPublicUrl(photos[active].image_url)}
					alt={photos[active].notes || `Box photo ${active + 1}`}
					className="w-full h-full object-contain cursor-zoom-in"
					onClick={() => setLightbox(active)}
				/>
				{photos.length > 1 && (
					<>
						<button
							onClick={prev}
							className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
						>
							<ChevronLeft className="w-5 h-5" />
						</button>
						<button
							onClick={next}
							className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
						>
							<ChevronRight className="w-5 h-5" />
						</button>
						<div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
							{photos.map((photo, i) => (
								<button
									key={photo.id || i}
									onClick={() => setActive(i)}
									className={`w-2 h-2 rounded-full transition-colors ${i === active ? "bg-white" : "bg-white/40"}`}
								/>
							))}
						</div>
					</>
				)}
				<div className="absolute top-3 left-3 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full">
					Box Photos
				</div>
			</div>
			{photos.length > 1 && (
				<div className="flex gap-2 p-3 overflow-x-auto">
					{photos.map((photo, i) => (
						<button
							key={photo.id}
							onClick={() => setActive(i)}
							className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === active ? "border-primary-500" : "border-neutral-200"}`}
						>
							<img
								src={getPublicUrl(photo.image_url)}
								alt=""
								className="w-full h-full object-cover"
							/>
						</button>
					))}
				</div>
			)}
			{lightbox !== null && (
				<div
					className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
					onClick={(e) => {
						if (e.target === e.currentTarget) setLightbox(null);
					}}
					onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
				>
					<button
						className="absolute top-4 right-4 text-white/70 hover:text-white"
						onClick={() => setLightbox(null)}
					>
						<X className="w-7 h-7" />
					</button>
					<img
						src={getPublicUrl(photos[lightbox].image_url)}
						alt=""
						className="max-w-full max-h-full object-contain"
					/>
					{photos.length > 1 && (
						<>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setLightbox((l) => (l! - 1 + photos.length) % photos.length);
								}}
								className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
							>
								<ChevronLeft className="w-6 h-6" />
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setLightbox((l) => (l! + 1) % photos.length);
								}}
								className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
							>
								<ChevronRight className="w-6 h-6" />
							</button>
						</>
					)}
				</div>
			)}
		</section>
	);
}

export const Route = createFileRoute("/portal/package/$id")({
	component: PackageView,
});

function PackageView() {
	const { id } = useParams({ from: "/portal/package/$id" });
	const navigate = useNavigate();

	const { data: pkg, isLoading } = useQuery({
		queryKey: ["portal-package", id],
		queryFn: async () => {
			const { data: instanceData, error: instanceError } = await supabase
				.from("order_pkg_instance")
				.select(`
					id,
					order_pkg_overview_id,
					order_package_id,
					instance_number,
					status,
					packed_at,
					ipac_reference,
					order_pkg_overview (
						id,
						order_id,
						pkg_number,
						quantity,
						quantity_packed,
						description
					),
					order_package:order_packages (
						id,
						package_number,
						reference,
						description,
						status,
						original_pkg_info:package_info!order_packages_original_pkg_info_fkey (
							external_length,
							external_width,
							external_height,
							box_type (name)
						),
						final_pkg_info:package_info!order_packages_final_pkg_info_fkey (
							external_length,
							external_width,
							external_height,
							box_type (name)
						)
					),
					pkd_item (
						id,
						quantity,
						items_db:maintenance_db_id (
							id,
							item_num,
							reference,
							description,
							length,
							width,
							height,
							net_weight,
							expected_qty,
							packed_qty,
							warehouse_location,
							pkg_category (label),
							ipac_comments
						)
					)
				`)
				.eq("id", id)
				.maybeSingle();

			if (instanceError && instanceError.code !== "PGRST116")
				throw instanceError;

			if (instanceData) {
				const orderPackage =
					(Array.isArray(instanceData.order_package)
						? instanceData.order_package[0]
						: instanceData.order_package) || null;
				const overview =
					(Array.isArray(instanceData.order_pkg_overview)
						? instanceData.order_pkg_overview[0]
						: instanceData.order_pkg_overview) || null;
				const finalInfo =
					(Array.isArray(orderPackage?.final_pkg_info)
						? orderPackage.final_pkg_info[0]
						: orderPackage?.final_pkg_info) || null;
				const originalInfo =
					(Array.isArray(orderPackage?.original_pkg_info)
						? orderPackage.original_pkg_info[0]
						: orderPackage?.original_pkg_info) || null;

				return {
					id: instanceData.id,
					source: "instance",
					orderPkgOverviewId:
						instanceData.order_pkg_overview_id || overview?.id || null,
					orderPackageId:
						instanceData.order_package_id || orderPackage?.id || null,
					instanceRow: instanceData,
					instance_number: instanceData.instance_number ?? null,
					package_number:
						(Array.isArray(instanceData.order_pkg_overview)
							? instanceData.order_pkg_overview[0]?.pkg_number
							: (instanceData.order_pkg_overview as any)?.pkg_number) ??
						orderPackage?.package_number ??
						null,
					reference_number: orderPackage?.reference || null,
					status: instanceData.status || orderPackage?.status || null,
					box_type: finalInfo?.box_type ?? originalInfo?.box_type ?? null,
					actual_length:
						finalInfo?.external_length ?? originalInfo?.external_length ?? null,
					actual_width:
						finalInfo?.external_width ?? originalInfo?.external_width ?? null,
					actual_height:
						finalInfo?.external_height ?? originalInfo?.external_height ?? null,
					actual_volume: null,
					items: instanceData.pkd_item || [],
				};
			}

			const { data: legacyPackage, error: packageError } = await supabase
				.from("order_packages")
				.select(`
					id,
					package_number,
					reference,
					description,
					status,
					box_type (name),
					original_pkg_info:package_info!order_packages_original_pkg_info_fkey (
						external_length,
						external_width,
						external_height
					),
					final_pkg_info:package_info!order_packages_final_pkg_info_fkey (
						external_length,
						external_width,
						external_height
					)
				`)
				.eq("id", id)
				.maybeSingle();

			if (packageError) throw packageError;
			if (!legacyPackage) return null;

			const { data: linkedInstances, error: linkedInstancesError } =
				await supabase
					.from("order_pkg_instance")
					.select("id")
					.eq("order_package_id", legacyPackage.id);

			if (linkedInstancesError) throw linkedInstancesError;

			const linkedInstanceIds = (linkedInstances || []).map(
				(instance: any) => instance.id,
			);

			let normalizedItems: any[] = [];
			if (linkedInstanceIds.length > 0) {
				const { data: instanceItems, error: instanceItemsError } =
					await supabase
						.from("pkd_item")
						.select(`
						id,
						quantity,
						pkg_instance_id,
						items_db:maintenance_db_id (
							id,
							item_num,
							reference,
							description,
							length,
							width,
							height,
							net_weight,
							expected_qty,
							packed_qty,
							warehouse_location,
							pkg_category (label),
							ipac_comments
						)
					`)
						.in("pkg_instance_id", linkedInstanceIds);

				if (instanceItemsError) throw instanceItemsError;
				normalizedItems = instanceItems || [];
			} else {
				const { data: legacyItems, error: legacyItemsError } = await supabase
					.from("package_items")
					.select(
						"id, quantity, designation, reference, length, width, height, net_weight",
					)
					.eq("order_package_id", legacyPackage.id);

				if (legacyItemsError) throw legacyItemsError;

				normalizedItems = (legacyItems || []).map((item: any) => ({
					id: item.id,
					quantity: item.quantity,
					items_db: {
						id: null,
						item_num: item.reference || null,
						reference: item.reference || null,
						description: item.designation || item.reference || "Legacy Item",
						length: item.length ?? null,
						width: item.width ?? null,
						height: item.height ?? null,
						net_weight: item.net_weight ?? null,
						expected_qty: item.quantity ?? null,
						packed_qty: null,
						warehouse_location: null,
						pkg_category: { label: "Legacy" },
						ipac_comments: null,
					},
				}));
			}

			const finalInfo =
				(Array.isArray(legacyPackage.final_pkg_info)
					? legacyPackage.final_pkg_info[0]
					: legacyPackage.final_pkg_info) || null;
			const originalInfo =
				(Array.isArray(legacyPackage.original_pkg_info)
					? legacyPackage.original_pkg_info[0]
					: legacyPackage.original_pkg_info) || null;

			return {
				id: legacyPackage.id,
				source: "legacy",
				orderPkgOverviewId: null,
				orderPackageId: legacyPackage.id,
				instanceRow: null,
				instance_number: null,
				package_number: legacyPackage.package_number ?? null,
				reference_number: legacyPackage.reference || null,
				status: legacyPackage.status || null,
				box_type: legacyPackage.box_type || null,
				actual_length:
					finalInfo?.external_length ?? originalInfo?.external_length ?? null,
				actual_width:
					finalInfo?.external_width ?? originalInfo?.external_width ?? null,
				actual_height:
					finalInfo?.external_height ?? originalInfo?.external_height ?? null,
				actual_volume: null,
				items: normalizedItems,
			};
		},
	});

	const { data: boxPhotos } = useQuery({
		queryKey: ["portal-package-photos", id],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("media")
				.select("id, image_url, notes, created_at")
				.eq("order_pkg_instance_id", id)
				.not("image_url", "is", null)
				.order("created_at", { ascending: true });
			if (error) throw error;
			return (data || []).filter((m: any) => !!m.image_url);
		},
		enabled: !!id,
	});

	const { data: siblingBoxes, isLoading: siblingBoxesLoading } = useQuery({
		queryKey: ["portal-package-siblings", pkg?.orderPkgOverviewId, pkg?.id],
		queryFn: async () => {
			if (!pkg?.orderPkgOverviewId) return [];

			const { data, error } = await supabase
				.from("order_pkg_instance")
				.select(`
					id,
					instance_number,
					status,
					packed_at,
					order_pkg_overview (
						pkg_number
					),
					order_package:order_packages (
						reference,
						package_number
					)
				`)
				.eq("order_pkg_overview_id", pkg.orderPkgOverviewId)
				.order("instance_number", { ascending: true });

			if (error) throw error;

			return (data || []).filter((instance: any) => instance.id !== pkg.id);
		},
		enabled: !!pkg?.orderPkgOverviewId,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	if (!pkg) {
		return (
			<div className="p-8 text-center bg-neutral-50 min-h-screen">
				Package not found
			</div>
		);
	}

	const items = pkg?.items || [];

	return (
		<div className="min-h-screen bg-neutral-50 pb-24">
			{/* Brand Header */}
			<header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
							<button
								onClick={() => navigate({ to: "/portal/projects" })}
								className="p-2 -ml-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
							>
								<ArrowLeft className="w-5 h-5" />
							</button>
							<div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
								<Package className="w-5 h-5 text-white" />
							</div>
							<h1 className="text-lg font-bold text-neutral-900">
								Package Details
							</h1>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
				{/* Box Photo Gallery */}
				{boxPhotos && boxPhotos.length > 0 && (
					<BoxPhotoGallery photos={boxPhotos} />
				)}

				<section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 sm:p-5">
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
							className="inline-flex items-center justify-center py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-sm font-semibold transition-colors"
						>
							Go Back
						</button>
						<Link
							to="/portal/projects"
							className="inline-flex items-center justify-center py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors"
						>
							View All Items
						</Link>
					</div>
				</section>

				{/* Package Hero Card */}
				<section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 sm:p-8">
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
						<div>
							<div className="flex items-center gap-2 mb-2">
								<span className="bg-primary-100 text-primary-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
									{pkg.status || "Packed"}
								</span>
								<span className="text-sm font-medium text-neutral-500">
									Box #{pkg.package_number}
								</span>
							</div>
							<h2 className="text-3xl font-black text-neutral-900 tracking-tight">
								{pkg.reference_number || `Package ${pkg.package_number}`}
							</h2>
						</div>

						<div className="text-left sm:text-right">
							<div className="text-sm text-neutral-500 font-medium">
								Box Type
							</div>
							<div className="text-lg font-bold text-neutral-900">
								{(Array.isArray(pkg.box_type)
									? pkg.box_type[0]?.name
									: (pkg.box_type as any)?.name) || "Standard Wooden Crate"}
							</div>
						</div>
					</div>

					{/* Dimensions Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-t border-neutral-100">
						<div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/60">
							<div className="flex items-center gap-2 text-neutral-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Length</span>
							</div>
							<div className="text-xl font-bold text-neutral-900">
								{pkg.actual_length || "--"}{" "}
								<span className="text-sm font-medium text-neutral-500">cm</span>
							</div>
						</div>
						<div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/60">
							<div className="flex items-center gap-2 text-neutral-500 mb-1">
								<Ruler className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Width</span>
							</div>
							<div className="text-xl font-bold text-neutral-900">
								{pkg.actual_width || "--"}{" "}
								<span className="text-sm font-medium text-neutral-500">cm</span>
							</div>
						</div>
						<div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/60">
							<div className="flex items-center gap-2 text-neutral-500 mb-1">
								<Ruler className="w-4 h-4 text-rotate-90" />
								<span className="text-xs font-semibold uppercase">Height</span>
							</div>
							<div className="text-xl font-bold text-neutral-900">
								{pkg.actual_height || "--"}{" "}
								<span className="text-sm font-medium text-neutral-500">cm</span>
							</div>
						</div>
						<div className="bg-primary-50 rounded-xl p-4 border border-primary-100/60">
							<div className="flex items-center gap-2 text-primary-600 mb-1">
								<Maximize className="w-4 h-4" />
								<span className="text-xs font-semibold uppercase">Volume</span>
							</div>
							<div className="text-xl font-bold text-primary-900">
								{pkg.actual_volume || "--"}{" "}
								<span className="text-sm font-medium text-primary-600">m³</span>
							</div>
						</div>
					</div>
				</section>

				<section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 sm:p-8">
					<h3 className="text-lg font-bold text-neutral-900">Other Boxes</h3>
					<p className="text-sm text-neutral-500 mt-1 mb-4">
						Browse other box instances from the same package group.
					</p>

					{siblingBoxesLoading ? (
						<div className="text-sm text-neutral-500 flex items-center gap-2">
							<Loader2 className="w-4 h-4 animate-spin" />
							Loading other boxes...
						</div>
					) : !siblingBoxes || siblingBoxes.length === 0 ? (
						<div className="text-sm text-neutral-500">
							No other boxes found in this group.
						</div>
					) : (
						<ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
							{siblingBoxes.map((entry: any) => {
								const orderPackage = Array.isArray(entry.order_package)
									? entry.order_package[0]
									: entry.order_package;
								const overview = Array.isArray(entry.order_pkg_overview)
									? entry.order_pkg_overview[0]
									: entry.order_pkg_overview;

								return (
									<li key={entry.id}>
										<Link
											to="/portal/package/$id"
											params={{ id: entry.id }}
											className="block p-4 hover:bg-neutral-50 transition-colors"
										>
											<div className="flex items-center justify-between gap-3">
												<div>
													<div className="text-sm font-semibold text-neutral-900">
														{orderPackage?.reference ||
															`Package ${overview?.pkg_number || orderPackage?.package_number || "-"}`}
													</div>
													<div className="text-xs text-neutral-500 mt-1">
														Instance #{entry.instance_number || "-"}
														{entry.status ? ` • ${entry.status}` : ""}
													</div>
												</div>
												<div className="text-xs font-semibold text-primary-700">
													Open
												</div>
											</div>
										</Link>
									</li>
								);
							})}
						</ul>
					)}
				</section>

				{/* Items manifest */}
				<section>
					<div className="flex items-center justify-between mb-4 mt-8 px-1">
						<h3 className="text-lg font-bold text-neutral-900">
							Contents Manifest ({items.length})
						</h3>
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
						{items.length === 0 ? (
							<div className="p-8 text-center text-neutral-500">
								No items packed in this box yet.
							</div>
						) : (
							<ul className="divide-y divide-neutral-100">
								{items.map((entry: any) => {
									const item = entry.items_db;
									if (!item) return null;

									const rowContent = (
										<div className="flex justify-between items-start gap-4">
											<div>
												<div className="flex items-center gap-2 mb-1">
													<span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
														{item?.item_num || "NO-REF"}
													</span>
													<span className="text-xs font-medium text-neutral-500">
														{item?.pkg_category?.label}
													</span>
												</div>
												<h4 className="text-base font-semibold text-neutral-900">
													{item?.description ||
														item.reference ||
														"Unnamed Item"}
												</h4>
												<div className="text-sm font-medium text-primary-700 mt-0.5">
													Packed Qty: {entry.quantity}
												</div>
												{item?.ipac_comments && (
													<p className="text-sm text-neutral-500 mt-1 line-clamp-2">
														{item.ipac_comments}
													</p>
												)}
											</div>
											<div className="text-right whitespace-nowrap">
												<div className="text-sm font-bold text-neutral-900">
													{item?.net_weight ? `${item.net_weight} kg` : "--"}
												</div>
											</div>
										</div>
									);

									return (
										<li key={entry.id}>
											{/* Use pkd_item.id (entry.id) as the link target — not items_db.id */}
											{entry.id ? (
												<Link
													to="/portal/item/$id"
													params={{ id: entry.id }}
													className="block p-4 sm:p-6 hover:bg-neutral-50 transition-colors"
												>
													{rowContent}
												</Link>
											) : (
												<div className="block p-4 sm:p-6">{rowContent}</div>
											)}
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
