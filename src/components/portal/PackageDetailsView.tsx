import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	Box,
	ChevronLeft,
	ChevronRight,
	Images,
	Loader2,
	MapPin,
	Maximize,
	Ruler,
	Scale,
	ShieldCheck,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { QrScanner } from "../orders/orderId/modals/QrScanner";
import { PortalHeader } from "../PortalHeader";
import { parseQrToken } from "../../features/orders/hooks/useInstanceQr";
import { supabase } from "../../lib/supabase";

type Photo = {
	id: string;
	image_url: string;
	notes: string | null;
	created_at?: string | null;
};

type PackedItem = {
	id: string;
	itemId: string | null;
	quantity: number | string | null;
	reference: string | null;
	itemNumber: string | null;
	designation: string | null;
	length: number | string | null;
	width: number | string | null;
	height: number | string | null;
	netWeight: number | string | null;
	grossWeight: number | string | null;
	photos: Photo[];
};

const getPublicUrl = (path: string | null) => {
	if (!path) return "";
	if (path.startsWith("http")) return path;
	return `https://fqynbudvpvpiljdrrvem.supabase.co/storage/v1/object/public/media/${path}`;
};

const formatNumber = (value: unknown, decimals = 2) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return null;
	return numeric.toFixed(decimals).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

function PhotoLightbox({
	photos,
	initialIndex,
	title,
	onClose,
}: {
	photos: Photo[];
	initialIndex: number;
	title: string;
	onClose: () => void;
}) {
	const [active, setActive] = useState(initialIndex);
	const current = photos[active];

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
			if (event.key === "ArrowLeft" && photos.length > 1) {
				setActive((index) => (index - 1 + photos.length) % photos.length);
			}
			if (event.key === "ArrowRight" && photos.length > 1) {
				setActive((index) => (index + 1) % photos.length);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose, photos.length]);

	if (!current) return null;

	return (
		<div
			className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-label={`${title} photo`}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-4">
				<div className="min-w-0 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
					<span className="block max-w-[70vw] truncate text-white">{title}</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
					aria-label="Close photo"
				>
					<X className="h-5 w-5 text-white" aria-hidden="true" />
				</button>
			</div>

			<img
				src={getPublicUrl(current.image_url)}
				alt={current.notes || `${title} photo ${active + 1}`}
				className="max-h-[86vh] max-w-[96vw] object-contain shadow-2xl"
			/>

			{photos.length > 1 && (
				<>
					<button
						type="button"
						onClick={() =>
							setActive((index) => (index - 1 + photos.length) % photos.length)
						}
						className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition hover:bg-white/15 sm:left-5"
						aria-label="Previous photo"
					>
						<ChevronLeft className="h-6 w-6 text-white" aria-hidden="true" />
					</button>
					<button
						type="button"
						onClick={() => setActive((index) => (index + 1) % photos.length)}
						className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition hover:bg-white/15 sm:right-5"
						aria-label="Next photo"
					>
						<ChevronRight className="h-6 w-6 text-white" aria-hidden="true" />
					</button>
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-semibold tabular-nums text-white backdrop-blur-md">
						{active + 1} / {photos.length}
					</div>
				</>
			)}
		</div>
	);
}

function BoxPhotoGallery({ photos }: { photos: Photo[] }) {
	const [active, setActive] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	if (!photos.length) return null;

	const current = photos[active];
	return (
		<section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_22px_54px_-38px_rgba(15,23,42,0.5)] dark:border-steel-700 dark:bg-steel-900">
			<button
				type="button"
				onClick={() => setLightboxOpen(true)}
				className="group relative block aspect-video w-full overflow-hidden bg-neutral-950 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
				aria-label="Open package inspection photo"
			>
				<img
					src={getPublicUrl(current.image_url)}
					alt={current.notes || `Package inspection photo ${active + 1}`}
					className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.01]"
				/>
				<div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
					<Images className="h-3.5 w-3.5 text-white" aria-hidden="true" />
					<span className="text-white">Inspection photos</span>
				</div>
				<div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
					<Maximize className="h-3.5 w-3.5 text-white" aria-hidden="true" />
					<span className="text-white">Expand</span>
				</div>
			</button>
			{photos.length > 1 && (
				<div className="flex gap-2 overflow-x-auto p-3">
					{photos.map((photo, index) => (
						<button
							type="button"
							key={photo.id}
							onClick={() => setActive(index)}
							className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${index === active ? "border-primary-600 shadow-md" : "border-neutral-200 opacity-70 hover:opacity-100 dark:border-steel-700"}`}
							aria-label={`Show inspection photo ${index + 1}`}
						>
							<img
								src={getPublicUrl(photo.image_url)}
								alt=""
								className="h-full w-full object-cover"
							/>
						</button>
					))}
				</div>
			)}
			{lightboxOpen && (
				<PhotoLightbox
					photos={photos}
					initialIndex={active}
					title="Package inspection"
					onClose={() => setLightboxOpen(false)}
				/>
			)}
		</section>
	);
}

function PackingList({
	items,
	isLoading,
}: {
	items: PackedItem[];
	isLoading: boolean;
}) {
	const [viewer, setViewer] = useState<{
		photos: Photo[];
		index: number;
		title: string;
	} | null>(null);
	const [pageSize, setPageSize] = useState(5);
	const [page, setPage] = useState(1);
	const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
	const startIndex = (page - 1) * pageSize;
	const endIndex = Math.min(startIndex + pageSize, items.length);
	const visibleItems = items.slice(startIndex, endIndex);

	useEffect(() => {
		setPage((current) => Math.min(current, totalPages));
	}, [totalPages]);

	const paginationItems = useMemo(() => {
		if (totalPages <= 7) {
			return Array.from({ length: totalPages }, (_, index) => index + 1) as Array<
				number | string
			>;
		}

		const importantPages = Array.from(
			new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages)),
		).sort((a, b) => a - b);
		const result: Array<number | string> = [];
		importantPages.forEach((value, index) => {
			const previous = importantPages[index - 1];
			if (previous && value - previous > 1) result.push(`ellipsis-${previous}-${value}`);
			result.push(value);
		});
		return result;
	}, [page, totalPages]);

	return (
		<section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_50px_-38px_rgba(15,23,42,0.48)] dark:border-steel-700 dark:bg-steel-900">
			<div className="flex flex-col gap-4 border-b border-neutral-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 dark:border-steel-700">
				<div>
					<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-300">
						Packed contents
					</p>
					<h3 className="mt-1 text-xl font-bold tracking-[-0.02em] text-neutral-950 dark:text-white">
						Packing list
					</h3>
				</div>
				{!isLoading && (
					<div className="flex items-center justify-between gap-3 sm:justify-end">
						<span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-300">
							{items.length} line{items.length === 1 ? "" : "s"}
						</span>
						<label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-steel-300">
							<span>Show</span>
							<select
								value={pageSize}
								onChange={(event) => {
									setPageSize(Number(event.target.value));
									setPage(1);
								}}
								className="h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-steel-700 dark:bg-steel-800 dark:text-white"
								aria-label="Packing list entries per page"
							>
								{[5, 10, 25, 50].map((size) => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
							<span>entries</span>
						</label>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-neutral-500 dark:text-steel-400">
					<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					Loading packed items
				</div>
			) : items.length === 0 ? (
				<div className="px-5 py-10 text-center sm:px-7">
					<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-steel-700 dark:bg-steel-800 dark:text-steel-400">
						<Box className="h-5 w-5" aria-hidden="true" />
					</div>
					<p className="mt-3 text-sm font-semibold text-neutral-800 dark:text-steel-100">
						No packed items recorded yet
					</p>
					<p className="mt-1 text-xs text-neutral-500 dark:text-steel-400">
						The packing list will appear here as items are recorded in this package.
					</p>
				</div>
			) : (
				<>
					<div className="divide-y divide-neutral-200 dark:divide-steel-700">
						{visibleItems.map((item, itemIndex) => {
							const dimensions = [item.length, item.width, item.height].map((value) =>
								value == null || value === "" ? "—" : String(value),
							);
							const itemTitle = item.reference || item.itemNumber || `Item ${startIndex + itemIndex + 1}`;
							return (
								<article key={item.id} className="px-5 py-5 sm:px-7 sm:py-6">
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 dark:text-steel-400">
												Item reference
											</p>
											{item.itemId ? (
												<Link
													to="/portal/item/$id"
													params={{ id: item.itemId }}
													className="mt-1 inline-flex break-all text-base font-bold text-primary-800 underline-offset-4 hover:underline dark:text-primary-200"
												>
													{itemTitle}
												</Link>
											) : (
												<span className="mt-1 inline-flex break-all text-base font-bold text-neutral-950 dark:text-white">
													{itemTitle}
												</span>
											)}
											{item.itemNumber && item.itemNumber !== item.reference && (
												<p className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-steel-400">
													Item #{item.itemNumber}
												</p>
											)}
										</div>
										<div className="shrink-0 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-center dark:border-primary-800 dark:bg-primary-950/30">
											<p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">
												Qty
											</p>
											<p className="mt-0.5 text-lg font-black tabular-nums text-primary-950 dark:text-primary-100">
												{item.quantity ?? "—"}
											</p>
										</div>
									</div>

									<div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3.5 dark:border-steel-700 dark:bg-steel-800/55">
										<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 dark:text-steel-400">
											Item designation
										</p>
										<p className="mt-1.5 text-sm font-semibold leading-5 text-neutral-900 dark:text-steel-100">
											{item.designation || "Not specified"}
										</p>
									</div>

									<dl className={`mt-3 grid gap-2 ${item.grossWeight != null ? "grid-cols-3" : "grid-cols-2"}`}>
										<div className="rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-steel-700 dark:bg-steel-900">
											<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-neutral-500 dark:text-steel-400">
												<Ruler className="h-3.5 w-3.5" aria-hidden="true" />
												Dimensions
											</dt>
											<dd className="mt-1.5 text-sm font-bold tabular-nums text-neutral-950 dark:text-white">
												{dimensions.join(" × ")} <span className="text-[10px] font-medium text-neutral-500 dark:text-steel-400">cm</span>
											</dd>
										</div>
										<div className="rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-steel-700 dark:bg-steel-900">
											<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-neutral-500 dark:text-steel-400">
												<Scale className="h-3.5 w-3.5" aria-hidden="true" />
												Net weight
											</dt>
											<dd className="mt-1.5 text-sm font-bold tabular-nums text-neutral-950 dark:text-white">
												{item.netWeight ?? "—"} <span className="text-[10px] font-medium text-neutral-500 dark:text-steel-400">kg</span>
											</dd>
										</div>
										{item.grossWeight != null && (
											<div className="rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-steel-700 dark:bg-steel-900">
												<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-neutral-500 dark:text-steel-400">
													<Scale className="h-3.5 w-3.5" aria-hidden="true" />
													Gross weight
												</dt>
												<dd className="mt-1.5 text-sm font-bold tabular-nums text-neutral-950 dark:text-white">
													{item.grossWeight} <span className="text-[10px] font-medium text-neutral-500 dark:text-steel-400">kg</span>
												</dd>
											</div>
										)}
									</dl>

									<div className="mt-4">
										<div className="mb-2 flex items-center justify-between gap-3">
											<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 dark:text-steel-400">
												Pictures
											</p>
											{item.photos.length > 0 && (
												<span className="text-[10px] font-medium text-neutral-500 dark:text-steel-400">
													Tap to enlarge
												</span>
											)}
										</div>
										{item.photos.length > 0 ? (
											<div className="flex gap-2 overflow-x-auto pb-1">
												{item.photos.map((photo, photoIndex) => (
													<button
														type="button"
														key={photo.id}
														onClick={() =>
															setViewer({
																photos: item.photos,
																index: photoIndex,
																title: itemTitle,
															})
														}
														className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-steel-700 dark:bg-steel-800"
														aria-label={`Enlarge ${itemTitle} photo ${photoIndex + 1}`}
													>
														<img
															src={getPublicUrl(photo.image_url)}
															alt={photo.notes || `${itemTitle} photo ${photoIndex + 1}`}
															className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
														/>
														<span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm">
															<Maximize className="h-3 w-3 text-white" aria-hidden="true" />
														</span>
													</button>
												))}
											</div>
										) : (
											<p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-xs text-neutral-500 dark:border-steel-700 dark:bg-steel-800/45 dark:text-steel-400">
												No item pictures recorded.
											</p>
										)}
									</div>
								</article>
							);
						})}
					</div>

					<div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50/65 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 dark:border-steel-700 dark:bg-steel-800/35">
						<p className="text-xs font-medium text-neutral-500 dark:text-steel-400">
							Showing <span className="font-bold text-neutral-800 dark:text-steel-200">{startIndex + 1}</span>–<span className="font-bold text-neutral-800 dark:text-steel-200">{endIndex}</span> of <span className="font-bold text-neutral-800 dark:text-steel-200">{items.length}</span>
						</p>
						<nav className="flex items-center gap-1" aria-label="Packing list pages">
							<button
								type="button"
								onClick={() => setPage((current) => Math.max(1, current - 1))}
								disabled={page === 1}
								className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-200 dark:hover:border-primary-700 dark:hover:text-primary-300"
								aria-label="Previous packing list page"
							>
								<ChevronLeft className="h-4 w-4" aria-hidden="true" />
							</button>
							{paginationItems.map((entry) =>
								typeof entry === "number" ? (
									<button
										type="button"
										key={entry}
										onClick={() => setPage(entry)}
										aria-current={entry === page ? "page" : undefined}
										className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs font-bold tabular-nums shadow-sm transition ${entry === page ? "border-primary-600 bg-primary-600 text-white dark:border-primary-500 dark:bg-primary-500" : "border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:text-primary-700 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-200 dark:hover:border-primary-700 dark:hover:text-primary-300"}`}
									>
										{entry}
									</button>
								) : (
									<span key={entry} className="inline-flex h-9 min-w-6 items-center justify-center text-xs font-bold text-neutral-400 dark:text-steel-500" aria-hidden="true">
										…
									</span>
								),
							)}
							<button
								type="button"
								onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
								disabled={page === totalPages}
								className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-primary-300 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-steel-700 dark:bg-steel-900 dark:text-steel-200 dark:hover:border-primary-700 dark:hover:text-primary-300"
								aria-label="Next packing list page"
							>
								<ChevronRight className="h-4 w-4" aria-hidden="true" />
							</button>
						</nav>
					</div>
				</>
			)}

			{viewer && (
				<PhotoLightbox
					photos={viewer.photos}
					initialIndex={viewer.index}
					title={viewer.title}
					onClose={() => setViewer(null)}
				/>
			)}
		</section>
	);
}

export function PackageDetailsView({ id }: { id: string }) {
	const navigate = useNavigate();
	const [scannerOpen, setScannerOpen] = useState(false);

	const handleQrSubmit = (raw: string) => {
		const token = parseQrToken(raw);
		if (!token) return;
		setScannerOpen(false);
		navigate({ to: "/portal/scan/$token", params: { token } });
	};

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

			if (instanceError && instanceError.code !== "PGRST116") throw instanceError;

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
					source: "instance" as const,
					orderPackageId: instanceData.order_package_id || orderPackage?.id || null,
					instance_number: instanceData.instance_number ?? null,
					package_number:
						overview?.pkg_number ?? orderPackage?.package_number ?? null,
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
				source: "legacy" as const,
				orderPackageId: legacyPackage.id,
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
			};
		},
	});

	const { data: boxPhotos = [] } = useQuery({
		queryKey: ["portal-package-photos", pkg?.source, pkg?.id],
		queryFn: async () => {
			let query = supabase
				.from("media")
				.select("id, image_url, notes, created_at")
				.is("pkd_item_id", null)
				.not("image_url", "is", null)
				.order("created_at", { ascending: true });

			query =
				pkg?.source === "instance"
					? query.eq("order_pkg_instance_id", pkg.id)
					: query.eq("order_package_id", pkg?.orderPackageId || pkg?.id || "");

			const { data, error } = await query;
			if (error) throw error;
			return ((data || []) as Photo[]).filter((photo) => !!photo.image_url);
		},
		enabled: !!pkg,
	});

	const { data: packedItems = [], isLoading: packedItemsLoading } = useQuery({
		queryKey: ["portal-package-packed-items", pkg?.source, pkg?.id, pkg?.orderPackageId],
		queryFn: async () => {
			let instanceIds: string[] = [];
			if (pkg?.source === "instance") {
				instanceIds = [pkg.id];
			} else if (pkg?.orderPackageId) {
				const { data: instances, error: instanceListError } = await supabase
					.from("order_pkg_instance")
					.select("id")
					.eq("order_package_id", pkg.orderPackageId);
				if (instanceListError) throw instanceListError;
				instanceIds = (instances || []).map((instance: any) => instance.id);
			}

			if (!instanceIds.length) return [] as PackedItem[];

			const { data, error } = await supabase
				.from("pkd_item")
				.select(`
					id,
					quantity,
					created_at,
					items_db:maintenance_db_id (*),
					media!pkd_item_id (
						id,
						image_url,
						notes,
						created_at
					)
				`)
				.in("pkg_instance_id", instanceIds)
				.order("created_at", { ascending: true });

			if (error) throw error;
			return (data || []).map((row: any) => {
				const catalog = Array.isArray(row.items_db) ? row.items_db[0] : row.items_db;
				return {
					id: row.id,
					itemId: catalog?.id ?? null,
					quantity: row.quantity ?? null,
					reference: catalog?.reference ?? null,
					itemNumber: catalog?.item_num ?? null,
					designation: catalog?.description ?? null,
					length: catalog?.length ?? null,
					width: catalog?.width ?? null,
					height: catalog?.height ?? null,
					netWeight: catalog?.net_weight ?? null,
					grossWeight: catalog?.gross_weight ?? null,
					photos: ((row.media || []) as Photo[]).filter((photo) => !!photo.image_url),
				} satisfies PackedItem;
			});
		},
		enabled: !!pkg,
	});

	const metrics = useMemo(() => {
		if (!pkg) return null;
		const length = Number(pkg.actual_length);
		const width = Number(pkg.actual_width);
		const height = Number(pkg.actual_height);
		const valid = [length, width, height].every(
			(value) => Number.isFinite(value) && value > 0,
		);
		const volume = valid ? formatNumber((length * width * height) / 1_000_000) : null;
		const externalArea = valid
			? formatNumber((2 * (length * width + length * height + width * height)) / 10_000)
			: null;
		return { volume, externalArea };
	}, [pkg]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-steel-950">
				<Loader2 className="h-8 w-8 animate-spin text-primary-600" />
			</div>
		);
	}

	if (!pkg) {
		return (
			<div className="min-h-screen bg-neutral-50 p-8 text-center dark:bg-steel-950">
				Package not found
			</div>
		);
	}

	const boxTypeName =
		(Array.isArray(pkg.box_type)
			? pkg.box_type[0]?.name
			: (pkg.box_type as any)?.name) || "Standard wooden crate";
	const packageContext = [
		pkg.package_number ? `Package #${pkg.package_number}` : null,
		pkg.instance_number ? `Instance #${pkg.instance_number}` : null,
	]
		.filter(Boolean)
		.join(" • ");
	const reference =
		pkg.reference_number ||
		(pkg.package_number ? `Package ${pkg.package_number}` : "Package record");

	const dimensionRow = [
		{ label: "Length", value: pkg.actual_length, unit: "cm", icon: Ruler },
		{ label: "Width", value: pkg.actual_width, unit: "cm", icon: Ruler },
		{ label: "Height", value: pkg.actual_height, unit: "cm", icon: Ruler },
	];
	const summaryRow = [
		{ label: "Volume", value: metrics?.volume, unit: "m³", icon: Maximize },
		{ label: "External m²", value: metrics?.externalArea, unit: "m²", icon: Maximize },
	];

	return (
		<div className="portal-brand min-h-screen bg-neutral-50 pb-24 dark:bg-steel-950">
			<PortalHeader
				title="Package Details"
				onScan={() => setScannerOpen(true)}
				activePage="package"
			/>

			<main className="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50/70 px-3 py-2.5 shadow-sm sm:px-4 dark:border-primary-800/70 dark:bg-primary-950/25">
					<div className="flex min-w-0 items-center gap-2.5">
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm ring-1 ring-primary-100 dark:bg-steel-900 dark:text-primary-300 dark:ring-primary-800">
							<ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
						</span>
						<div className="min-w-0">
							<p className="truncate text-xs font-semibold text-primary-950 dark:text-primary-100">
								Verified package record
							</p>
							<p className="truncate text-[11px] text-primary-700 dark:text-primary-300">
								Authenticated in the client portal
							</p>
						</div>
					</div>
					<span className="shrink-0 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800 shadow-sm dark:border-primary-800 dark:bg-steel-900 dark:text-primary-200">
						{pkg.status || "Packed"}
					</span>
				</div>

				{boxPhotos.length > 0 && <BoxPhotoGallery photos={boxPhotos} />}

				<section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_22px_54px_-38px_rgba(15,23,42,0.5)] dark:border-steel-700 dark:bg-steel-900">
					<div className="p-5 sm:p-7">
						<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300">
							Package identity
						</p>
						<h2 className="mt-2 break-words text-2xl font-bold leading-tight tracking-[-0.025em] text-neutral-950 sm:text-3xl dark:text-white">
							{reference}
						</h2>
						{packageContext && (
							<p className="mt-2 text-sm font-medium text-neutral-500 dark:text-steel-400">
								{packageContext}
							</p>
						)}
					</div>

					<div className="grid gap-px border-y border-neutral-200 bg-neutral-200 sm:grid-cols-2 dark:border-steel-700 dark:bg-steel-700">
						<div className="flex items-start gap-3 bg-neutral-50 px-5 py-4 sm:px-7 dark:bg-steel-800/65">
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm dark:bg-steel-900 dark:text-primary-300">
								<Box className="h-4 w-4" aria-hidden="true" />
							</span>
							<div className="min-w-0">
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-steel-400">
									Package type
								</p>
								<p className="mt-1 text-sm font-semibold leading-5 text-neutral-900 dark:text-white">
									{boxTypeName}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 bg-neutral-50 px-5 py-4 sm:px-7 dark:bg-steel-800/65">
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm dark:bg-steel-900 dark:text-primary-300">
								<MapPin className="h-4 w-4" aria-hidden="true" />
							</span>
							<div className="min-w-0">
								<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-steel-400">
									Destination
								</p>
								<p className="mt-1 text-sm font-semibold leading-5 text-neutral-900 dark:text-white">
									{pkg.destination || "Not specified"}
								</p>
							</div>
						</div>
					</div>

					<div className="p-5 sm:p-7">
						<div className="mb-4 flex items-end justify-between gap-3">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-steel-400">
									Measurements
								</p>
								<h3 className="mt-1 text-lg font-bold text-neutral-950 dark:text-white">
									External dimensions
								</h3>
							</div>
							<span className="text-[11px] text-neutral-500 dark:text-steel-400">
								Recorded in centimetres
							</span>
						</div>

						<dl className="grid grid-cols-6 gap-2 sm:gap-3">
							{dimensionRow.map(({ label, value, unit, icon: Icon }) => (
								<div
									key={label}
									className="col-span-2 min-w-0 rounded-xl border border-neutral-200 bg-white px-2.5 py-4 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.45)] sm:px-4 sm:py-5 dark:border-steel-700 dark:bg-steel-900"
								>
									<dt className="flex min-w-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-neutral-500 sm:gap-1.5 sm:text-[10px] sm:tracking-[0.13em] dark:text-steel-400">
										<Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
										<span className="truncate">{label}</span>
									</dt>
									<dd className="mt-2 whitespace-nowrap text-[clamp(1.35rem,5.5vw,2rem)] font-black leading-none tabular-nums tracking-[-0.035em] text-neutral-950 dark:text-white">
										{value ?? "—"}{" "}
										<span className="text-[10px] font-semibold tracking-normal text-neutral-500 sm:text-xs dark:text-steel-400">
											{unit}
										</span>
									</dd>
								</div>
							))}

							{summaryRow.map(({ label, value, unit, icon: Icon }, index) => (
								<div
									key={label}
									className={`col-span-3 rounded-xl border px-4 py-4 sm:px-5 sm:py-5 ${index === 0 ? "border-primary-200 bg-primary-50/80 dark:border-primary-800 dark:bg-primary-950/25" : "border-neutral-200 bg-neutral-50 dark:border-steel-700 dark:bg-steel-800/55"}`}
								>
									<dt className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] ${index === 0 ? "text-primary-700 dark:text-primary-300" : "text-neutral-500 dark:text-steel-400"}`}>
										<Icon className="h-3.5 w-3.5" aria-hidden="true" />
										{label}
									</dt>
									<dd className="mt-2 text-[clamp(1.55rem,5.5vw,2.15rem)] font-black leading-none tabular-nums tracking-[-0.035em] text-neutral-950 dark:text-white">
										{value ?? "—"}{" "}
										<span className="text-xs font-semibold tracking-normal text-neutral-500 dark:text-steel-400">
											{unit}
										</span>
									</dd>
								</div>
							))}
						</dl>
						<p className="mt-2 text-right text-[10px] text-neutral-500 dark:text-steel-400">
							Volume and external m² calculated from the recorded external dimensions
						</p>
					</div>
				</section>

				<PackingList items={packedItems} isLoading={packedItemsLoading} />
			</main>

			<QrScanner
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onResult={handleQrSubmit}
			/>
		</div>
	);
}
