import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import {
	Box,
	ChevronLeft,
	ChevronRight,
	Images,
	Loader2,
	MapPin,
	Maximize,
	Ruler,
	ShieldCheck,
	X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { QrScanner } from "../../../components/orders/orderId/modals/QrScanner";
import { PortalHeader } from "../../../components/PortalHeader";
import { parseQrToken } from "../../../features/orders/hooks/useInstanceQr";
import { supabase } from "../../../lib/supabase";

const getPublicUrl = (path: string | null) => {
	if (!path) return "";
	if (path.startsWith("http")) return path;
	return `https://fqynbudvpvpiljdrrvem.supabase.co/storage/v1/object/public/media/${path}`;
};

const createSlideVariants = (shouldReduceMotion: boolean) =>
	({
		enter: (direction: "forward" | "backward") => ({
			opacity: 0,
			x: shouldReduceMotion ? 0 : direction === "forward" ? 32 : -32,
			scale: shouldReduceMotion ? 1 : 1.01,
		}),
		center: {
			opacity: 1,
			x: 0,
			scale: 1,
		},
		exit: (direction: "forward" | "backward") => ({
			opacity: 0,
			x: shouldReduceMotion ? 0 : direction === "forward" ? -16 : 16,
			scale: shouldReduceMotion ? 1 : 0.99,
		}),
	}) as const;

const createLightboxVariants = (shouldReduceMotion: boolean) =>
	({
		backdrop: {
			hidden: { opacity: 0 },
			show: { opacity: 1 },
			exit: { opacity: 0 },
		},
		panel: {
			hidden: {
				opacity: 0,
				scale: shouldReduceMotion ? 1 : 0.96,
				y: shouldReduceMotion ? 0 : 16,
			},
			show: {
				opacity: 1,
				scale: 1,
				y: 0,
			},
			exit: {
				opacity: 0,
				scale: shouldReduceMotion ? 1 : 0.98,
				y: shouldReduceMotion ? 0 : 10,
			},
		},
		image: {
			hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.985 },
			show: { opacity: 1, scale: 1 },
			exit: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.99 },
		},
	}) as const;

function BoxPhotoGallery({
	photos,
	packageNumber,
}: {
	photos: { id: string; image_url: string; notes: string | null }[];
	packageNumber: string | number | null;
}) {
	const [active, setActive] = useState(0);
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [lightboxDirection, setLightboxDirection] = useState<
		"forward" | "backward"
	>("forward");
	const [slideDirection, setSlideDirection] = useState<"forward" | "backward">(
		"forward",
	);
	const shouldReduceMotion = useReducedMotion();
	const slideVariants = createSlideVariants(!!shouldReduceMotion);
	const lightboxVariants = createLightboxVariants(!!shouldReduceMotion);
	const interactionRef = useRef({
		isPointerDown: false,
		startX: 0,
		startY: 0,
		moved: false,
		suppressClick: false,
	});
	if (!photos.length) return null;
	const showPhoto = (
		index: number,
		direction: "forward" | "backward" = index > active ? "forward" : "backward",
	) => {
		if (index === active) return;
		setSlideDirection(direction);
		setActive(index);
	};
	const prev = () =>
		showPhoto((active - 1 + photos.length) % photos.length, "backward");
	const next = () => showPhoto((active + 1) % photos.length, "forward");
	const activePhoto = photos[active];
	const activeNote = activePhoto.notes?.trim() || "";
	const normalizedActiveNote = activeNote.toLowerCase().replace(/[\s#]/g, "");
	const normalizedPackageCaption = `package${String(packageNumber)}`
		.toLowerCase()
		.replace(/[\s#]/g, "");
	const repeatedPackageCaption = packageNumber
		? normalizedActiveNote === normalizedPackageCaption
		: false;
	const visibleNote = repeatedPackageCaption ? "" : activeNote;
	const openLightbox = () => {
		setLightboxDirection("forward");
		setLightbox(active);
	};
	const showLightboxPhoto = (
		index: number,
		direction: "forward" | "backward" = index > (lightbox ?? active)
			? "forward"
			: "backward",
	) => {
		if (index === lightbox) return;
		setLightboxDirection(direction);
		setLightbox(index);
	};
	const prevLightbox = () =>
		showLightboxPhoto(
			((lightbox ?? active) - 1 + photos.length) % photos.length,
			"backward",
		);
	const nextLightbox = () =>
		showLightboxPhoto(((lightbox ?? active) + 1) % photos.length, "forward");
	const markSwipeHandled = () => {
		interactionRef.current.suppressClick = true;
		window.setTimeout(() => {
			interactionRef.current.suppressClick = false;
		}, 150);
	};

	return (
		<section
			className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)] dark:border-steel-700 dark:bg-steel-900"
			aria-label="Package inspection photos"
		>
			<div className="relative aspect-video overflow-hidden bg-neutral-950">
				<AnimatePresence initial={false} mode="wait" custom={slideDirection}>
					<motion.img
						key={activePhoto.id}
						custom={slideDirection}
						variants={slideVariants}
						src={getPublicUrl(activePhoto.image_url)}
						alt={activePhoto.notes || `Box photo ${active + 1}`}
						className="absolute inset-0 h-full w-full cursor-grab touch-pan-y object-contain active:cursor-grabbing"
						initial="enter"
						animate="center"
						exit="exit"
						transition={{
							duration: shouldReduceMotion ? 0 : 0.24,
							ease: [0.22, 1, 0.36, 1],
						}}
						drag="x"
						dragConstraints={{ left: 0, right: 0 }}
						dragElastic={0.12}
						onPointerDown={(e) => {
							interactionRef.current.isPointerDown = true;
							interactionRef.current.startX = e.clientX;
							interactionRef.current.startY = e.clientY;
							interactionRef.current.moved = false;
						}}
						onPointerMove={(e) => {
							if (!interactionRef.current.isPointerDown) return;
							const dx = e.clientX - interactionRef.current.startX;
							const dy = e.clientY - interactionRef.current.startY;
							if (Math.hypot(dx, dy) > 8) {
								interactionRef.current.moved = true;
							}
						}}
						onPointerUp={() => {
							interactionRef.current.isPointerDown = false;
							if (
								!interactionRef.current.moved &&
								!interactionRef.current.suppressClick
							) {
								openLightbox();
							}
						}}
						onDragEnd={(_, info) => {
							if (info.offset.x < -45 || info.velocity.x < -350) {
								next();
								markSwipeHandled();
							}
							if (info.offset.x > 45 || info.velocity.x > 350) {
								prev();
								markSwipeHandled();
							}
						}}
						onClick={(e) => {
							if (
								interactionRef.current.moved ||
								interactionRef.current.suppressClick
							) {
								e.preventDefault();
								e.stopPropagation();
								return;
							}
							openLightbox();
						}}
					/>
				</AnimatePresence>
				{photos.length > 1 && (
					<>
						<button
							type="button"
							onClick={prev}
							className="group absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-[background-color,border-color,transform] duration-200 hover:scale-105 hover:border-white/25 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
							aria-label="Show previous photo"
						>
							<ChevronLeft
								className="h-5 w-5 text-white transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
								aria-hidden="true"
							/>
						</button>
						<button
							type="button"
							onClick={next}
							className="group absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white shadow-lg backdrop-blur-sm transition-[background-color,border-color,transform] duration-200 hover:scale-105 hover:border-white/25 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
							aria-label="Show next photo"
						>
							<ChevronRight
								className="h-5 w-5 text-white transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
								aria-hidden="true"
							/>
						</button>
						<div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
							{photos.map((photo, i) => (
								<button
									type="button"
									key={photo.id || i}
									onClick={() => showPhoto(i)}
									className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-5 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
									aria-label={`Show photo ${i + 1}`}
								/>
							))}
						</div>
					</>
				)}
				<div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
					<Images className="h-3.5 w-3.5 text-white" aria-hidden="true" />
					<span className="text-white">Inspection photos</span>
				</div>
				<div className="absolute right-3 top-3 flex items-center gap-1.5">
					<button
						type="button"
						onClick={openLightbox}
						className="group inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
						aria-label="Open full-screen photo"
					>
						<Maximize
							className="h-3.5 w-3.5 text-white transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
							aria-hidden="true"
						/>
						<span className="hidden text-white sm:inline">Expand</span>
					</button>
					<div className="flex h-8 items-center rounded-full border border-white/10 bg-black/55 px-2.5 text-xs font-semibold tabular-nums text-white shadow-sm backdrop-blur-md">
						<span className="text-white">
							{active + 1} / {photos.length}
						</span>
					</div>
				</div>
			</div>
			{photos.length > 1 && (
				<div className="flex gap-2 overflow-x-auto p-3">
					{photos.map((photo, i) => (
						<button
							type="button"
							key={photo.id}
							onClick={() => showPhoto(i)}
							className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${i === active ? "scale-105 border-primary-600 shadow-md" : "border-neutral-200 opacity-70 hover:scale-[1.03] hover:opacity-100"}`}
							aria-label={`Show photo ${i + 1}`}
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
			{visibleNote && (
				<p className="flex items-start gap-2 border-t border-neutral-100 px-4 py-3 text-sm leading-5 text-neutral-600 dark:border-steel-700 dark:text-steel-300">
					<Images
						className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300"
						aria-hidden="true"
					/>
					{visibleNote}
				</p>
			)}
			{lightbox !== null && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
					variants={lightboxVariants.backdrop}
					initial="hidden"
					animate="show"
					transition={{
						duration: shouldReduceMotion ? 0 : 0.2,
						ease: [0.22, 1, 0.36, 1],
					}}
					onClick={(e) => {
						if (e.target === e.currentTarget) setLightbox(null);
					}}
					onKeyDown={(e) => e.key === "Escape" && setLightbox(null)}
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
				>
					<button
						type="button"
						className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white/80 backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:text-white"
						onClick={() => setLightbox(null)}
						aria-label="Close full-screen photo"
					>
						<X className="w-7 h-7" />
					</button>
					<AnimatePresence
						initial={false}
						mode="wait"
						custom={lightboxDirection}
					>
						<motion.img
							key={photos[lightbox].id}
							custom={lightboxDirection}
							src={getPublicUrl(photos[lightbox].image_url)}
							alt=""
							className="max-w-full max-h-full object-contain shadow-2xl cursor-grab active:cursor-grabbing touch-pan-y"
							variants={slideVariants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{
								duration: shouldReduceMotion ? 0 : 0.22,
								ease: [0.22, 1, 0.36, 1],
							}}
							drag="x"
							dragConstraints={{ left: 0, right: 0 }}
							dragElastic={0.12}
							onDragEnd={(_, info) => {
								if (info.offset.x < -45 || info.velocity.x < -350) {
									nextLightbox();
								}
								if (info.offset.x > 45 || info.velocity.x > 350) {
									prevLightbox();
								}
							}}
							onClick={() => nextLightbox()}
						/>
					</AnimatePresence>
					{photos.length > 1 && (
						<>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									prevLightbox();
								}}
								className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/90 backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:scale-105"
								aria-label="Show previous photo"
							>
								<ChevronLeft className="w-6 h-6" />
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									nextLightbox();
								}}
								className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/90 backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:scale-105"
								aria-label="Show next photo"
							>
								<ChevronRight className="w-6 h-6" />
							</button>
						</>
					)}
				</motion.div>
			)}
		</section>
	);
}

export const Route = createFileRoute("/portal/package/$id")({
	component: PackageView,
	head: () => ({
		meta: [{ title: "Package Details | IPAC" }],
	}),
});

function PackageView() {
	const { id } = useParams({ from: "/portal/package/$id" });
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
			<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-steel-950">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	if (!pkg) {
		return (
			<div className="p-8 text-center bg-neutral-50 min-h-screen dark:bg-steel-950">
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
	const dimensionValues = [
		Number(pkg.actual_length),
		Number(pkg.actual_width),
		Number(pkg.actual_height),
	];
	const calculatedVolume = dimensionValues.every(
		(value) => Number.isFinite(value) && value > 0,
	)
		? (dimensionValues.reduce((total, value) => total * value, 1) / 1_000_000)
				.toFixed(2)
				.replace(/\.00$/, "")
		: null;
	const volume = pkg.actual_volume || calculatedVolume;
	const dimensions = [
		{ label: "Length", value: pkg.actual_length, unit: "cm", icon: Ruler },
		{ label: "Width", value: pkg.actual_width, unit: "cm", icon: Ruler },
		{ label: "Height", value: pkg.actual_height, unit: "cm", icon: Ruler },
		{ label: "Volume", value: volume, unit: "m³", icon: Maximize },
	];

	return (
		<div className="min-h-screen bg-neutral-50 pb-24 dark:bg-steel-950">
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
								Authenticated by IPAC
							</p>
						</div>
					</div>
					<span className="shrink-0 rounded-full border border-primary-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800 shadow-sm dark:border-primary-800 dark:bg-steel-900 dark:text-primary-200">
						{pkg.status || "Packed"}
					</span>
				</div>
				{/* Box Photo Gallery */}
				{boxPhotos && boxPhotos.length > 0 && (
					<BoxPhotoGallery
						photos={boxPhotos}
						packageNumber={pkg.package_number}
					/>
				)}

				{/* Package Hero Card */}
				<section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_50px_-36px_rgba(15,23,42,0.45)] dark:border-steel-700 dark:bg-steel-900">
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
						<div className="mb-3 flex items-end justify-between gap-3">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-steel-400">
									Measurements
								</p>
								<h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
									External dimensions
								</h3>
							</div>
							<span className="text-[11px] text-neutral-500 dark:text-steel-400">
								Recorded in centimetres
							</span>
						</div>

						<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4 dark:border-steel-700 dark:bg-steel-700">
							{dimensions.map(({ label, value, unit, icon: Icon }, index) => (
								<div
									key={label}
									className={`bg-white px-4 py-4 dark:bg-steel-900 ${index === dimensions.length - 1 ? "bg-primary-50 dark:bg-primary-950/25" : ""}`}
								>
									<dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500 dark:text-steel-400">
										<Icon
											className={`h-3.5 w-3.5 ${index === dimensions.length - 1 ? "text-primary-600 dark:text-primary-300" : ""}`}
											aria-hidden="true"
										/>
										{label}
									</dt>
									<dd className="mt-2 text-xl font-bold tabular-nums text-neutral-950 dark:text-white">
										{value || "—"}{" "}
										<span className="text-xs font-medium text-neutral-500 dark:text-steel-400">
											{unit}
										</span>
									</dd>
								</div>
							))}
						</dl>
						{!pkg.actual_volume && calculatedVolume && (
							<p className="mt-2 text-right text-[10px] text-neutral-500 dark:text-steel-400">
								Volume calculated from recorded dimensions
							</p>
						)}
					</div>
				</section>
			</main>
			<QrScanner
				open={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onResult={handleQrSubmit}
			/>
		</div>
	);
}
