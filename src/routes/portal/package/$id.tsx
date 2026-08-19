import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
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
					destination,
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
					reference_number:
						instanceData.ipac_reference || orderPackage?.reference || null,
					status: instanceData.status || orderPackage?.status || null,
					destination: instanceData.destination || null,
					box_type: finalInfo?.box_type ?? originalInfo?.box_type ?? null,
					actual_length:
						finalInfo?.external_length ?? originalInfo?.external_length ?? null,
					actual_width:
						finalInfo?.external_width ?? originalInfo?.external_width ?? null,
					actual_height:
						finalInfo?.external_height ?? originalInfo?.external_height ?? null,
					actual_volume: null,
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
				destination: null,
				box_type: legacyPackage.box_type || null,
				actual_length:
					finalInfo?.external_length ?? originalInfo?.external_length ?? null,
				actual_width:
					finalInfo?.external_width ?? originalInfo?.external_width ?? null,
				actual_height:
					finalInfo?.external_height ?? originalInfo?.external_height ?? null,
				actual_volume: null,
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
				.is("pkd_item_id", null)
				.not("image_url", "is", null)
				.order("created_at", { ascending: true });
			if (error) throw error;
			return (data || []).filter((m: any) => !!m.image_url);
		},
		enabled: !!id,
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

	return (
		<div className="min-h-screen bg-neutral-50 pb-24">
			{/* Brand Header */}
			<header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
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
									{pkg.instance_number
										? ` • Instance #${pkg.instance_number}`
										: ""}
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

					{pkg.destination && (
						<div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
							<div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
								Destination
							</div>
							<div className="mt-1 font-semibold text-neutral-900">
								{pkg.destination}
							</div>
						</div>
					)}

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
			</main>
		</div>
	);
}
