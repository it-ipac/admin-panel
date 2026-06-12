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
	Box,
	ChevronLeft,
	ChevronRight,
	Image,
	Info,
	Loader2,
	MapPin,
	PackageX,
	Ruler,
	Scale,
	X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";

const getPublicUrl = (path: string | null) => {
	if (!path) return "";
	if (path.startsWith("http")) return path;
	return `https://fqynbudvpvpiljdrrvem.supabase.co/storage/v1/object/public/media/${path}`;
};

export const Route = createFileRoute("/portal/item/$id")({
	component: ItemView,
});

function PhotoGallery({
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
					alt={photos[active].notes || `Photo ${active + 1}`}
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
				<div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
					<Image className="w-3 h-3" />
					{photos.length} photo{photos.length !== 1 ? "s" : ""}
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

			{photos[active].notes && (
				<p className="text-xs text-neutral-500 px-4 pb-3">
					{photos[active].notes}
				</p>
			)}

			{/* Lightbox */}
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

function ItemView() {
	const { id } = useParams({ from: "/portal/item/$id" });
	const navigate = useNavigate();

	const {
		data: record,
		isLoading,
		error: queryError,
	} = useQuery({
		queryKey: ["portal-item-v2", id],
		queryFn: async () => {
			// Try new pkd_item path first
			const { data: pkdData, error: pkdError } = await supabase
				.from("pkd_item")
				.select(`
					id,
					quantity,
					created_at,
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
						ipac_comments,
						pkg_category (label)
					),
					order_pkg_instance:pkg_instance_id (
						id,
						instance_number,
						status,
						ipac_reference,
						order_packages:order_package_id (
							id,
							package_number,
							reference,
							status,
							orders:order_id (order_name)
						),
						order_pkg_overview:order_pkg_overview_id (
							id,
							pkg_number,
							description
						)
					),
					media!pkd_item_id (
						id,
						image_url,
						notes,
						created_at
					)
				`)
				.eq("id", id)
				.maybeSingle();

			if (!pkdError && pkdData) {
				return { source: "pkd_item" as const, data: pkdData };
			}

			// Legacy fallback: token still points to items_db
			const { data: legacyData, error: legacyError } = await supabase
				.from("items_db")
				.select(`
					*,
					pkg_category (label),
					pkd_item (
						id,
						quantity,
						order_pkg_instance:pkg_instance_id (
							id,
							instance_number,
							status,
							order_pkg_overview (id, pkg_number, quantity, description),
							order_packages (id, package_number, reference, status, orders (order_name))
						)
					)
				`)
				.eq("id", id)
				.maybeSingle();

			if (legacyError) throw legacyError;
			if (!legacyData) return null;
			return { source: "legacy" as const, data: legacyData };
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

	if (queryError) {
		return (
			<div className="p-8 text-center bg-neutral-50 min-h-screen flex flex-col items-center justify-center">
				<div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mb-4">
					<PackageX className="w-8 h-8 text-danger-600" />
				</div>
				<h2 className="text-xl font-bold text-neutral-900 mb-2">
					Query Failed
				</h2>
				<p className="text-neutral-500 max-w-md mb-6">
					{(queryError as any)?.message ||
						"An error occurred while fetching the item details."}
				</p>
				<button
					onClick={() => window.location.reload()}
					className="px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl transition-colors"
				>
					Try Again
				</button>
			</div>
		);
	}

	if (!record) {
		return (
			<div className="p-8 text-center bg-neutral-50 min-h-screen">
				Item not found
			</div>
		);
	}

	// Normalise between pkd_item and legacy path
	let item: any;
	let photos: { id: string; image_url: string; notes: string | null }[] = [];
	let packageInfo: {
		id: string;
		reference: string | null;
		instanceNumber: number | null;
		orderName: string | null;
	} | null = null;

	if (record.source === "pkd_item") {
		const d = record.data as any;
		const catalog = Array.isArray(d.items_db) ? d.items_db[0] : d.items_db;
		const pkgInstance = Array.isArray(d.order_pkg_instance)
			? d.order_pkg_instance[0]
			: d.order_pkg_instance;
		const orderPackage = pkgInstance
			? Array.isArray(pkgInstance.order_packages)
				? pkgInstance.order_packages[0]
				: pkgInstance.order_packages
			: null;
		const overview = pkgInstance
			? Array.isArray(pkgInstance.order_pkg_overview)
				? pkgInstance.order_pkg_overview[0]
				: pkgInstance.order_pkg_overview
			: null;

		item = {
			...catalog,
			_packedQty: d.quantity,
		};
		photos = (d.media || []).filter((m: any) => !!m.image_url);
		if (pkgInstance) {
			packageInfo = {
				id: pkgInstance.id,
				reference:
					pkgInstance.ipac_reference ||
					orderPackage?.reference ||
					(overview?.pkg_number ? `Package ${overview.pkg_number}` : null),
				instanceNumber: pkgInstance.instance_number ?? null,
				orderName: orderPackage?.orders?.order_name || null,
			};
		}
	} else {
		const d = record.data as any;
		item = d;
		const firstPkd = (d.pkd_item || [])[0];
		if (firstPkd) {
			const pkgInstance = firstPkd.order_pkg_instance;
			const orderPackage = pkgInstance?.order_packages;
			packageInfo = {
				id: pkgInstance?.id || null,
				reference:
					orderPackage?.reference ||
					(pkgInstance?.order_pkg_overview?.pkg_number
						? `Package ${pkgInstance.order_pkg_overview.pkg_number}`
						: "Package"),
				instanceNumber: pkgInstance?.instance_number ?? null,
				orderName: orderPackage?.orders?.order_name || null,
			};
		}
	}

	const packedQty =
		record.source === "pkd_item" ? (record.data as any).quantity : null;

	return (
		<div className="min-h-screen bg-neutral-50 pb-24">
			{/* Header */}
			<header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
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
								className="p-2 -ml-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
							>
								<ArrowLeft className="w-5 h-5" />
							</button>
							<div className="w-8 h-8 bg-success-600 rounded-lg flex items-center justify-center">
								<Info className="w-5 h-5 text-white" />
							</div>
							<h1 className="text-lg font-bold text-neutral-900">
								Item Details
							</h1>
						</div>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
				{/* Photo gallery */}
				{photos.length > 0 && <PhotoGallery photos={photos} />}

				{/* Item Hero Card */}
				<section className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 sm:p-8">
					<div className="mb-6">
						<div className="flex flex-wrap items-center gap-2 mb-3">
							<span className="bg-neutral-100 text-neutral-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
								{item?.pkg_category?.label || "General"}
							</span>
							{item?.item_num && (
								<span className="text-sm font-mono font-semibold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full">
									#{item.item_num}
								</span>
							)}
						</div>
						<h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
							{item?.description || item?.reference || "Unnamed Item"}
						</h2>
						<div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
							<div className="bg-neutral-100 px-3 py-1.5 rounded-lg text-neutral-700">
								Expected:{" "}
								<span className="font-bold">{item?.expected_qty ?? "--"}</span>
							</div>
							{packedQty != null && (
								<div className="bg-primary-100 px-3 py-1.5 rounded-lg text-primary-700">
									Packed in this box:{" "}
									<span className="font-bold">{packedQty}</span>
								</div>
							)}
						</div>
					</div>

					{/* Dimensions */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5 border-y border-neutral-100">
						{[
							{
								label: "Length",
								value: item?.length,
								unit: "cm",
								icon: <Ruler className="w-4 h-4" />,
							},
							{
								label: "Width",
								value: item?.width,
								unit: "cm",
								icon: <Ruler className="w-4 h-4" />,
							},
							{
								label: "Height",
								value: item?.height,
								unit: "cm",
								icon: <Ruler className="w-4 h-4" />,
							},
							{
								label: "Net Weight",
								value: item?.net_weight,
								unit: "kg",
								icon: <Scale className="w-4 h-4" />,
								accent: true,
							},
						].map(({ label, value, unit, icon, accent }) => (
							<div
								key={label}
								className={`rounded-xl p-4 border ${accent ? "bg-success-50 border-success-100" : "bg-neutral-50 border-neutral-200/60"}`}
							>
								<div
									className={`flex items-center gap-2 mb-1 ${accent ? "text-success-600" : "text-neutral-500"}`}
								>
									{icon}
									<span className="text-xs font-semibold uppercase">
										{label}
									</span>
								</div>
								<div
									className={`text-xl font-bold ${accent ? "text-success-900" : "text-neutral-900"}`}
								>
									{value ?? "--"}{" "}
									<span
										className={`text-sm font-medium ${accent ? "text-success-600" : "text-neutral-500"}`}
									>
										{unit}
									</span>
								</div>
							</div>
						))}
					</div>

					{/* IPAC Notes */}
					{item?.ipac_comments && (
						<div className="mt-6">
							<h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide mb-3">
								IPAC Notes
							</h3>
							<div className="bg-warning-50 rounded-xl p-4 border border-warning-100 text-warning-900 text-sm leading-relaxed">
								{item.ipac_comments}
							</div>
						</div>
					)}
				</section>

				{/* Package Location */}
				{packageInfo ? (
					<section className="bg-primary-50/70 border border-primary-100/80 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
						<div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
							<div>
								<div className="flex items-center gap-2 mb-2">
									<MapPin className="w-4 h-4 text-primary-600" />
									<span className="text-xs font-bold text-primary-600 uppercase tracking-wide">
										Currently Packed In
									</span>
								</div>
								<h3 className="text-2xl font-black text-neutral-900">
									{packageInfo.reference}
								</h3>
								<p className="text-neutral-600 mt-1 text-sm font-medium">
									{packageInfo.instanceNumber
										? `Instance #${packageInfo.instanceNumber}`
										: ""}
									{packageInfo.orderName ? ` • ${packageInfo.orderName}` : ""}
								</p>
							</div>
							{packageInfo.id && (
								<Link
									to="/portal/package/$id"
									params={{ id: packageInfo.id }}
									className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md transition-all whitespace-nowrap flex-shrink-0"
								>
									<Box className="w-4 h-4" />
									View Box Contents
								</Link>
							)}
						</div>
					</section>
				) : (
					<div className="bg-warning-50 border border-warning-200 text-warning-800 px-6 py-4 rounded-xl flex items-center gap-3">
						<AlertCircle className="w-5 h-5 shrink-0 text-warning-600" />
						<div>
							<p className="font-semibold">Not Packed</p>
							<p className="text-sm">
								This item has not yet been assigned to any packages.
							</p>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
