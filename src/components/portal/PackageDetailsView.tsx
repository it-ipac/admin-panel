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
import { parseQrToken } from "../../features/orders/hooks/useInstanceQr";
import { supabase } from "../../lib/supabase";
import { QrScanner } from "../orders/orderId/modals/QrScanner";
import { PortalHeader } from "../PortalHeader";

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
	return numeric
		.toFixed(decimals)
		.replace(/\.00$/, "")
		.replace(/(\.\d)0$/, "$1");
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
					<span className="block max-w-[70vw] truncate text-white">
						{title}
					</span>
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
		<section className="overflow-hidden rounded-3xl border border-[var(--package-border)] bg-[var(--package-card-bg)] shadow-[0_2px_5px_var(--package-shadow-key),0_18px_44px_-22px_var(--package-shadow-secondary)]">
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
				<div className="flex gap-2.5 overflow-x-auto border-t border-[var(--package-border-soft)] bg-[var(--package-tile-bg)] p-3.5">
					{photos.map((photo, index) => (
						<button
							type="button"
							key={photo.id}
							onClick={() => setActive(index)}
							className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[var(--package-card-bg)] transition-[transform,box-shadow,border-color,opacity] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${index === active ? "border-primary-600 shadow-[0_5px_14px_-7px_rgba(0,94,168,0.5)]" : "border-[var(--package-card-bg)] opacity-75 shadow-[0_2px_7px_rgba(15,23,42,0.12)] hover:opacity-100 hover:shadow-md"}`}
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
			return Array.from(
				{ length: totalPages },
				(_, index) => index + 1,
			) as Array<number | string>;
		}

		const importantPages = Array.from(
			new Set(
				[1, totalPages, page - 1, page, page + 1].filter(
					(value) => value >= 1 && value <= totalPages,
				),
			),
		).sort((a, b) => a - b);
		const result: Array<number | string> = [];
		importantPages.forEach((value, index) => {
			const previous = importantPages[index - 1];
			if (previous && value - previous > 1)
				result.push(`ellipsis-${previous}-${value}`);
			result.push(value);
		});
		return result;
	}, [page, totalPages]);

	return (
		<section className="overflow-hidden rounded-3xl border border-[var(--package-border)] bg-[var(--package-card-bg)] shadow-[0_2px_4px_var(--package-shadow-key),0_16px_40px_-24px_var(--package-shadow-secondary)]">
			<div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
				<div>
					<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700">
						Packed contents
					</p>
					<h3 className="mt-1 text-xl font-bold tracking-[-0.02em] text-app-text-strong">
						Packing list
					</h3>
				</div>
				{!isLoading && (
					<div className="flex flex-wrap items-center justify-between gap-2.5 sm:justify-end">
						<span className="rounded-xl bg-[var(--package-chip-bg)] px-3 py-2 text-xs font-semibold text-app-text-subtle">
							{items.length} line{items.length === 1 ? "" : "s"}
						</span>
						<label className="inline-flex items-center gap-2 rounded-xl border border-[var(--package-border)] bg-[var(--package-control-bg)] py-1 pl-3 pr-1 text-xs font-semibold text-app-text-subtle shadow-sm">
							<span>Rows</span>
							<select
								value={pageSize}
								onChange={(event) => {
									setPageSize(Number(event.target.value));
									setPage(1);
								}}
								className="h-8 rounded-lg border-0 bg-[var(--package-card-bg)] px-2.5 text-xs font-bold text-app-text-strong shadow-sm outline-none ring-1 ring-inset ring-[var(--package-border)] transition focus:ring-2 focus:ring-primary-500"
								aria-label="Packing list entries per page"
							>
								{[5, 10, 25, 50].map((size) => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
						</label>
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center gap-2 border-t border-[var(--package-border-soft)] bg-[var(--package-canvas-bg)] px-5 py-12 text-sm text-app-text-muted">
					<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					Loading packed items
				</div>
			) : items.length === 0 ? (
				<div className="border-t border-[var(--package-border-soft)] bg-[var(--package-canvas-bg)] px-5 py-12 text-center sm:px-7">
					<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--package-card-bg)] text-app-text-muted shadow-sm">
						<Box className="h-5 w-5" aria-hidden="true" />
					</div>
					<p className="mt-3 text-sm font-semibold text-app-text-strong">
						No packed items recorded yet
					</p>
					<p className="mt-1 text-xs text-app-text-muted">
						The packing list will appear here as items are recorded in this
						package.
					</p>
				</div>
			) : (
				<>
					<div className="space-y-4 border-y border-[var(--package-border-soft)] bg-[var(--package-canvas-bg)] p-3 sm:p-5">
						{visibleItems.map((item, itemIndex) => {
							const dimensions = [item.length, item.width, item.height].map(
								(value) =>
									value == null || value === "" ? "—" : String(value),
							);
							const hasDimensions = dimensions.some((value) => value !== "—");
							const hasNetWeight =
								item.netWeight != null && item.netWeight !== "";
							const hasGrossWeight =
								item.grossWeight != null && item.grossWeight !== "";
							const hasQuantity = item.quantity != null && item.quantity !== "";
							const itemTitle =
								item.reference ||
								item.itemNumber ||
								`Item ${startIndex + itemIndex + 1}`;
							return (
								<article
									key={item.id}
									className="rounded-2xl border border-[var(--package-border)] bg-[var(--package-card-bg)] p-4 shadow-[0_1px_2px_var(--package-shadow-key),0_9px_24px_-18px_var(--package-shadow-inner)] sm:p-5"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-app-text-muted">
												Item reference
											</p>
											{item.itemId ? (
												<Link
													to="/portal/item/$id"
													params={{ id: item.itemId }}
													className="mt-1 inline-flex break-all text-base font-bold text-primary-800 underline-offset-4 hover:underline"
												>
													{itemTitle}
												</Link>
											) : (
												<span className="mt-1 inline-flex break-all text-base font-bold text-app-text-strong">
													{itemTitle}
												</span>
											)}
											{item.itemNumber &&
												item.itemNumber !== item.reference && (
													<p className="mt-0.5 text-[11px] font-medium text-app-text-muted">
														Item #{item.itemNumber}
													</p>
												)}
										</div>
										<div className="min-w-14 shrink-0 rounded-xl bg-primary-50 px-3 py-2 text-center">
											<p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary-700">
												Qty
											</p>
											<p
												className={`mt-0.5 text-lg tabular-nums ${hasQuantity ? "font-bold text-app-text-strong" : "font-medium text-[var(--package-quiet-text)]"}`}
											>
												{hasQuantity ? item.quantity : "—"}
											</p>
										</div>
									</div>

									<div className="mt-4 rounded-xl bg-[var(--package-tile-bg)] px-4 py-3.5">
										<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-app-text-muted">
											Item designation
										</p>
										<p className="mt-1.5 text-sm font-semibold leading-5 text-app-text-strong">
											{item.designation || "Not specified"}
										</p>
									</div>

									<dl
										className={`mt-3 grid grid-cols-2 gap-2 ${hasGrossWeight ? "sm:grid-cols-3" : ""}`}
									>
										<div
											className={`rounded-xl bg-[var(--package-tile-bg)] px-3 py-3 ${hasGrossWeight ? "col-span-2 sm:col-span-1" : ""}`}
										>
											<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-app-text-muted">
												<Ruler
													className="h-3.5 w-3.5 text-primary-700"
													aria-hidden="true"
												/>
												Dimensions
											</dt>
											<dd
												className={`mt-1.5 text-sm tabular-nums ${hasDimensions ? "font-bold text-app-text-strong" : "font-medium text-[var(--package-quiet-text)]"}`}
											>
												{hasDimensions ? dimensions.join(" × ") : "—"}{" "}
												{hasDimensions && (
													<span className="text-[10px] font-medium text-app-text-muted">
														cm
													</span>
												)}
											</dd>
										</div>
										<div className="rounded-xl bg-[var(--package-tile-bg)] px-3 py-3">
											<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-app-text-muted">
												<Scale
													className="h-3.5 w-3.5 text-primary-700"
													aria-hidden="true"
												/>
												Net weight
											</dt>
											<dd
												className={`mt-1.5 text-sm tabular-nums ${hasNetWeight ? "font-bold text-app-text-strong" : "font-medium text-[var(--package-quiet-text)]"}`}
											>
												{hasNetWeight ? item.netWeight : "—"}{" "}
												{hasNetWeight && (
													<span className="text-[10px] font-medium text-app-text-muted">
														kg
													</span>
												)}
											</dd>
										</div>
										{hasGrossWeight && (
											<div className="rounded-xl bg-[var(--package-tile-bg)] px-3 py-3">
												<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-app-text-muted">
													<Scale
														className="h-3.5 w-3.5 text-primary-700"
														aria-hidden="true"
													/>
													Gross weight
												</dt>
												<dd className="mt-1.5 text-sm font-bold tabular-nums text-app-text-strong">
													{item.grossWeight}{" "}
													<span className="text-[10px] font-medium text-app-text-muted">
														kg
													</span>
												</dd>
											</div>
										)}
									</dl>

									<div className="mt-4 border-t border-[var(--package-border-soft)] pt-4">
										<div className="mb-2 flex items-center justify-between gap-3">
											<p className="text-[10px] font-bold uppercase tracking-[0.15em] text-app-text-muted">
												Pictures
											</p>
											{item.photos.length > 0 && (
												<span className="text-[10px] font-medium text-app-text-muted">
													Tap to enlarge
												</span>
											)}
										</div>
										{item.photos.length > 0 ? (
											<div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
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
														className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-[var(--package-card-bg)] bg-[var(--package-tile-bg)] shadow-[0_3px_10px_rgba(15,23,42,0.14)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_7px_16px_rgba(15,23,42,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:h-24 sm:w-24"
														aria-label={`Enlarge ${itemTitle} photo ${photoIndex + 1}`}
													>
														<img
															src={getPublicUrl(photo.image_url)}
															alt={
																photo.notes ||
																`${itemTitle} photo ${photoIndex + 1}`
															}
															className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
														/>
														<span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 text-primary-800 shadow-sm backdrop-blur-sm dark:bg-black/65 dark:text-white">
															<Maximize
																className="h-3 w-3 text-primary-800 dark:text-white"
																aria-hidden="true"
															/>
														</span>
													</button>
												))}
											</div>
										) : (
											<p className="flex items-center gap-1.5 text-[11px] text-[var(--package-quiet-text)]">
												<Images className="h-3.5 w-3.5" aria-hidden="true" />
												No photos recorded
											</p>
										)}
									</div>
								</article>
							);
						})}
					</div>

					<div className="flex flex-col gap-3 bg-[var(--package-card-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
						<p className="text-xs font-medium text-app-text-muted">
							Showing{" "}
							<span className="font-bold text-app-text-strong">
								{startIndex + 1}
							</span>
							–
							<span className="font-bold text-app-text-strong">{endIndex}</span>{" "}
							of{" "}
							<span className="font-bold text-app-text-strong">
								{items.length}
							</span>
						</p>
						<nav
							className="flex w-full max-w-full items-center gap-1 overflow-x-auto pb-1 sm:w-auto"
							aria-label="Packing list pages"
						>
							<button
								type="button"
								onClick={() => setPage((current) => Math.max(1, current - 1))}
								disabled={page === 1}
								className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--package-border)] bg-[var(--package-control-bg)] text-app-text transition-[transform,box-shadow,border-color,color] hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
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
										className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2 text-xs font-bold tabular-nums transition-[transform,box-shadow,border-color,color,background-color] ${entry === page ? "border-primary-600 bg-primary-600 text-white shadow-[0_5px_12px_-7px_rgba(0,94,168,0.7)]" : "border-[var(--package-border)] bg-[var(--package-control-bg)] text-app-text hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-700 hover:shadow-sm"}`}
									>
										{entry}
									</button>
								) : (
									<span
										key={entry}
										className="inline-flex h-9 min-w-6 items-center justify-center text-xs font-bold text-[var(--package-quiet-text)]"
										aria-hidden="true"
									>
										…
									</span>
								),
							)}
							<button
								type="button"
								onClick={() =>
									setPage((current) => Math.min(totalPages, current + 1))
								}
								disabled={page === totalPages}
								className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--package-border)] bg-[var(--package-control-bg)] text-app-text transition-[transform,box-shadow,border-color,color] hover:-translate-y-0.5 hover:border-primary-300 hover:text-primary-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
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
					source: "instance" as const,
					orderPackageId:
						instanceData.order_package_id || orderPackage?.id || null,
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
		queryKey: [
			"portal-package-packed-items",
			pkg?.source,
			pkg?.id,
			pkg?.orderPackageId,
		],
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
				const catalog = Array.isArray(row.items_db)
					? row.items_db[0]
					: row.items_db;
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
					photos: ((row.media || []) as Photo[]).filter(
						(photo) => !!photo.image_url,
					),
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
		const volume = valid
			? formatNumber((length * width * height) / 1_000_000)
			: null;
		const externalArea = valid
			? formatNumber(
					(2 * (length * width + length * height + width * height)) / 10_000,
				)
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
		{
			label: "External m²",
			value: metrics?.externalArea,
			unit: "m²",
			icon: Maximize,
		},
	];

	return (
		<div className="portal-brand portal-package-details min-h-screen bg-[var(--package-page-bg)] pb-24">
			<PortalHeader
				title="Package Details"
				onScan={() => setScannerOpen(true)}
				activePage="package"
			/>

			<main className="mx-auto max-w-4xl space-y-6 px-3 py-6 sm:px-6 sm:py-9 lg:px-8">
				{boxPhotos.length > 0 && <BoxPhotoGallery photos={boxPhotos} />}

				<section className="relative overflow-hidden rounded-3xl border border-[var(--package-border)] bg-[var(--package-card-bg)] shadow-[0_2px_5px_var(--package-shadow-key),0_22px_52px_-26px_var(--package-shadow-primary)]">
					<span
						className="absolute left-6 top-0 h-[3px] w-16 rounded-b-full bg-primary-500 sm:left-7"
						aria-hidden="true"
					/>
					<div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0">
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700">
									Package identity
								</p>
								<h1 className="mt-2 break-words text-2xl font-bold leading-tight tracking-[-0.025em] text-app-text-strong sm:text-3xl">
									{reference}
								</h1>
								{packageContext && (
									<p className="mt-2 text-sm font-medium text-app-text-muted">
										{packageContext}
									</p>
								)}
							</div>
							<span className="shrink-0 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800">
								{pkg.status || "Packed"}
							</span>
						</div>
						<div className="mt-4 flex items-center gap-2 text-xs text-app-text-muted">
							<ShieldCheck
								className="h-4 w-4 text-primary-700"
								aria-hidden="true"
							/>
							<span>Verified client portal record</span>
						</div>
					</div>

					<div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 sm:px-7 sm:pb-7">
						<div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--package-border)] bg-[var(--package-tile-bg)] px-4 py-4 shadow-[0_1px_2px_var(--package-shadow-key),0_8px_18px_-16px_var(--package-shadow-inner)]">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--package-card-bg)] text-primary-700 shadow-sm">
								<Box className="h-5 w-5" aria-hidden="true" />
							</span>
							<div className="min-w-0">
								<p className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-text-muted">
									Package type
								</p>
								<p className="mt-1 truncate text-sm font-bold text-app-text-strong">
									{boxTypeName}
								</p>
							</div>
						</div>
						<div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--package-border)] bg-[var(--package-tile-bg)] px-4 py-4 shadow-[0_1px_2px_var(--package-shadow-key),0_8px_18px_-16px_var(--package-shadow-inner)]">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--package-card-bg)] text-primary-700 shadow-sm">
								<MapPin className="h-5 w-5" aria-hidden="true" />
							</span>
							<div className="min-w-0">
								<p className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-text-muted">
									Destination
								</p>
								<p className="mt-1 truncate text-sm font-bold text-app-text-strong">
									{pkg.destination || "Not specified"}
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="rounded-3xl border border-[var(--package-border)] bg-[var(--package-card-bg)] p-5 shadow-[0_2px_4px_var(--package-shadow-key),0_16px_40px_-24px_var(--package-shadow-secondary)] sm:p-7">
					<div className="mb-5 flex items-end justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-700">
								Measurements
							</p>
							<h2 className="mt-1 text-xl font-bold tracking-[-0.02em] text-app-text-strong">
								External dimensions
							</h2>
						</div>
						<span className="text-[10px] font-medium text-app-text-muted">
							centimetres
						</span>
					</div>

					<dl className="grid grid-cols-3 gap-2 sm:gap-3">
						{dimensionRow.map(({ label, value, unit, icon: Icon }) => (
							<div
								key={label}
								className="min-w-0 rounded-2xl border border-[var(--package-border)] bg-[var(--package-tile-soft-bg)] px-2.5 py-4 shadow-[0_1px_2px_var(--package-shadow-key),0_8px_20px_-17px_var(--package-shadow-inner)] sm:px-5 sm:py-5"
							>
								<dt className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-app-text-muted sm:text-[10px] sm:tracking-[0.13em]">
									<Icon
										className="h-3.5 w-3.5 shrink-0 text-primary-700"
										aria-hidden="true"
									/>
									<span className="truncate">{label}</span>
								</dt>
								<dd className="mt-2.5 whitespace-nowrap text-[clamp(1.45rem,5vw,2.15rem)] font-bold leading-none tabular-nums tracking-[-0.04em] text-app-text-strong">
									{value ?? "—"}{" "}
									<span className="text-[10px] font-semibold tracking-normal text-[var(--package-quiet-text)] sm:text-xs">
										{unit}
									</span>
								</dd>
							</div>
						))}
					</dl>

					<dl className="mt-3 grid grid-cols-2 gap-3">
						{summaryRow.map(({ label, value, unit, icon: Icon }) => (
							<div
								key={label}
								className="rounded-2xl border border-[var(--package-blue-border)] bg-[var(--package-summary-bg)] px-4 py-4 shadow-[0_1px_2px_var(--package-shadow-key),0_9px_22px_-18px_var(--package-shadow-inner)] sm:px-5 sm:py-5"
							>
								<dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary-700">
									<Icon className="h-3.5 w-3.5" aria-hidden="true" />
									{label}
								</dt>
								<dd className="mt-2 text-[clamp(1.4rem,4vw,1.9rem)] font-bold leading-none tabular-nums tracking-[-0.035em] text-app-text-strong">
									{value ?? "—"}{" "}
									<span className="text-[10px] font-medium tracking-normal text-app-text-muted sm:text-xs">
										{unit}
									</span>
								</dd>
							</div>
						))}
					</dl>
					<p className="mt-3 text-right text-[10px] leading-4 text-app-text-muted">
						Calculated from the recorded external dimensions
					</p>
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
