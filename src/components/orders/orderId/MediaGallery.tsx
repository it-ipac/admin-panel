import * as Dialog from "@radix-ui/react-dialog";
import {
	Camera,
	Download,
	ExternalLink,
	Image,
	Package,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OrderPackage } from "@/routes/orders/$orderId";

export interface Media {
	id: string;
	image_url: string | null;
	signed_url: string | null;
	notes: string | null;
	created_at: string;
	order_package_id: string;
	designation: string | null;
}

interface MediaGalleryProps {
	mediaItems: Media[] | undefined;
	orderPackages: OrderPackage[];
}

interface MediaByPackage {
	packageId: string;
	packageNumber: number;
	label: string;
	totalCount: number;
	designations: {
		key: string;
		label: string;
		items: Media[];
		count: number;
	}[];
}

const designationLabels: Record<string, string> = {
	empty_crate: "Empty Crate",
	items_placed: "Items Placed",
	half_packed: "Half Packed",
	fully_packed: "Fully Packed",
	secured: "Secured",
	closed_ready: "Closed & Ready",
	other: "Other",
};

const sectionOrder = [
	"empty_crate",
	"items_placed",
	"half_packed",
	"fully_packed",
	"secured",
	"closed_ready",
	"other",
];

export function MediaGallery({ mediaItems, orderPackages }: MediaGalleryProps) {
	const [selectedMediaPackage, setSelectedMediaPackage] = useState<
		string | null
	>(null);
	const [selectedMediaCategory, setSelectedMediaCategory] =
		useState<string>("empty_crate");
	const [previewImage, setPreviewImage] = useState<Media | null>(null);

	// Group media by package with designation categories
	const mediaByPackage = useMemo((): MediaByPackage[] => {
		if (!mediaItems || !orderPackages) return [];

		const packageGroups = new Map<string, Media[]>();
		mediaItems.forEach((item) => {
			const pkgId = item.order_package_id;
			if (!packageGroups.has(pkgId)) {
				packageGroups.set(pkgId, []);
			}
			packageGroups.get(pkgId)!.push(item);
		});

		// Build result array sorted by package number
		const result = orderPackages
			.filter((pkg) => packageGroups.has(pkg.id))
			.sort((a, b) => a.package_number - b.package_number)
			.map((pkg) => {
				const pkgMedia = packageGroups.get(pkg.id) || [];

				// Group by designation within this package
				const grouped = pkgMedia.reduce(
					(acc, item) => {
						const key = item.designation || "other";
						if (!acc[key]) acc[key] = [];
						acc[key].push(item);
						return acc;
					},
					{} as Record<string, Media[]>,
				);

				const sortedKeys = Object.keys(grouped).sort((a, b) => {
					const aIdx = sectionOrder.indexOf(a);
					const bIdx = sectionOrder.indexOf(b);
					return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
				});

				const designations = sortedKeys.map((key) => ({
					key,
					label: designationLabels[key] || key.replace(/_/g, " "),
					items: grouped[key],
					count: grouped[key].length,
				}));

				return {
					packageId: pkg.id,
					packageNumber: pkg.package_number,
					label: `Box ${pkg.package_number}`,
					totalCount: pkgMedia.length,
					designations,
				};
			});

		return result;
	}, [mediaItems, orderPackages]);

	// Set default media package when media loads
	useEffect(() => {
		if (mediaByPackage.length > 0 && !selectedMediaPackage) {
			setSelectedMediaPackage(mediaByPackage[0].packageId);
		}
	}, [mediaByPackage, selectedMediaPackage]);

	// Get designations for selected package
	const selectedPackageDesignations = useMemo(() => {
		if (!selectedMediaPackage || mediaByPackage.length === 0) return [];
		const pkg = mediaByPackage.find(
			(p) => p.packageId === selectedMediaPackage,
		);
		return pkg?.designations || [];
	}, [mediaByPackage, selectedMediaPackage]);

	// Set default media category when package changes
	useEffect(() => {
		if (selectedPackageDesignations.length > 0) {
			setSelectedMediaCategory(selectedPackageDesignations[0].key);
		}
	}, [selectedPackageDesignations]);

	// Get media for selected category in selected package
	const selectedCategoryMedia = useMemo(() => {
		if (!selectedMediaCategory || selectedPackageDesignations.length === 0)
			return [];
		const category = selectedPackageDesignations.find(
			(c) => c.key === selectedMediaCategory,
		);
		return category?.items || [];
	}, [selectedPackageDesignations, selectedMediaCategory]);

	return (
		<>
			<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b flex items-center gap-2">
					<Camera className="w-5 h-5 text-neutral-600" />
					<h2 className="text-lg font-semibold text-neutral-900">
						Packer Photos
					</h2>
					<span className="ml-auto text-sm text-neutral-600">
						{mediaItems?.length || 0} images
					</span>
				</div>

				{mediaItems && mediaItems.length > 0 && mediaByPackage.length > 0 ? (
					<>
						{/* Package Tabs - Box Selection */}
						<div className="border-b bg-neutral-50 overflow-x-auto">
							<div className="flex p-2 gap-1 min-w-max">
								{mediaByPackage.map((pkg) => (
									<button
										key={pkg.packageId}
										onClick={() => {
											setSelectedMediaPackage(pkg.packageId);
											// Reset category when changing package
											const firstDesignation = pkg.designations[0]?.key;
											if (firstDesignation) {
												setSelectedMediaCategory(firstDesignation);
											}
										}}
										className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
											selectedMediaPackage === pkg.packageId
												? "bg-iris-100 text-iris-700 border border-iris-200"
												: "text-neutral-600 hover:bg-neutral-100 border border-transparent"
										}`}
									>
										<Package className="w-4 h-4 inline-block mr-1.5" />
										{pkg.label}
										<span
											className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
												selectedMediaPackage === pkg.packageId
													? "bg-iris-200 text-iris-800"
													: "bg-neutral-200 text-neutral-600"
											}`}
										>
											{pkg.totalCount}
										</span>
									</button>
								))}
							</div>
						</div>

						{/* Designation Tabs - Within Selected Package */}
						{selectedPackageDesignations.length > 0 && (
							<div className="border-b overflow-x-auto">
								<div className="flex p-2 gap-1 min-w-max">
									{selectedPackageDesignations.map((category) => (
										<button
											key={category.key}
											onClick={() => setSelectedMediaCategory(category.key)}
											className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
												selectedMediaCategory === category.key
													? "bg-primary-100 text-primary-700"
													: "text-neutral-600 hover:bg-neutral-100"
											}`}
										>
											{category.label}
											<span
												className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
													selectedMediaCategory === category.key
														? "bg-primary-200 text-primary-800"
														: "bg-neutral-200 text-neutral-600"
												}`}
											>
												{category.count}
											</span>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Media Grid */}
						<div className="p-6">
							{selectedCategoryMedia.length > 0 ? (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
									{selectedCategoryMedia.map((media) => {
										const imageUrl = media.signed_url;
										return (
											<div
												key={media.id}
												className="group relative aspect-square rounded-lg overflow-hidden border bg-neutral-100 cursor-pointer"
												role="button"
												tabIndex={0}
												onClick={() => setPreviewImage(media)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														setPreviewImage(media);
													}
												}}
											>
												{imageUrl ? (
													<>
														<img
															src={imageUrl}
															alt={
																media.notes || selectedMediaCategory || "Image"
															}
															className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
															loading="lazy"
															onError={(e) => {
																const target = e.target as HTMLImageElement;
																target.style.display = "none";
																target.nextElementSibling?.classList.remove(
																	"hidden",
																);
															}}
														/>
														<div
															className="w-full h-full items-center justify-center absolute inset-0"
															style={{ display: "none" }}
														>
															<Image className="w-8 h-8 text-neutral-300" />
														</div>
														<div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
															<div className="absolute bottom-0 left-0 right-0 p-2">
																{media.notes && (
																	<p className="text-white text-xs truncate">
																		{media.notes}
																	</p>
																)}
																<p className="text-white/70 text-xs">
																	{new Date(
																		media.created_at,
																	).toLocaleDateString("en-US", {
																		month: "short",
																		day: "numeric",
																		hour: "2-digit",
																		minute: "2-digit",
																	})}
																</p>
															</div>
														</div>
														<a
															href={imageUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
															title="Open in new tab"
															onClick={(e) => e.stopPropagation()}
														>
															<ExternalLink className="w-4 h-4 text-neutral-700" />
														</a>
														<button
															onClick={(e) => {
																e.stopPropagation();
																const link = document.createElement("a");
																link.href = imageUrl;
																link.download =
																	media.image_url?.split("/").pop() ||
																	"image.jpg";
																link.click();
															}}
															className="absolute top-2 right-10 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
															title="Download"
														>
															<Download className="w-4 h-4 text-neutral-700" />
														</button>
													</>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<Image className="w-8 h-8 text-neutral-300" />
													</div>
												)}
											</div>
										);
									})}
								</div>
							) : (
								<div className="text-center text-neutral-500 py-8">
									<Image className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
									<p>No images in this category</p>
								</div>
							)}
						</div>
					</>
				) : (
					<div className="p-6 text-center text-neutral-500">
						<Camera className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
						<p>No photos captured yet</p>
					</div>
				)}
			</div>

			{/* Image Preview Modal */}
			<Dialog.Root
				open={!!previewImage}
				onOpenChange={(open) => !open && setPreviewImage(null)}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-4xl w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
						<Dialog.Title className="sr-only">Image Preview</Dialog.Title>
						<Dialog.Description className="sr-only">
							Full size preview of the selected packer photo
						</Dialog.Description>

						{previewImage && (
							<div className="flex flex-col">
								{/* Image */}
								<div className="relative bg-neutral-900 flex items-center justify-center min-h-75 max-h-[70vh]">
									<img
										src={previewImage.signed_url || ""}
										alt={previewImage.notes || "Preview"}
										className="max-w-full max-h-[70vh] object-contain"
									/>
									<Dialog.Close asChild>
										<button className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
											<X className="w-5 h-5" />
										</button>
									</Dialog.Close>
								</div>

								{/* Info Footer */}
								<div className="p-4 border-t bg-neutral-50 flex items-center justify-between">
									<div>
										{previewImage.notes && (
											<p className="text-sm text-neutral-700 font-medium">
												{previewImage.notes}
											</p>
										)}
										<p className="text-xs text-neutral-500">
											{new Date(previewImage.created_at).toLocaleDateString(
												"en-US",
												{
													weekday: "short",
													month: "short",
													day: "numeric",
													year: "numeric",
													hour: "2-digit",
													minute: "2-digit",
												},
											)}
										</p>
									</div>
									<div className="flex gap-2">
										<a
											href={previewImage.signed_url || ""}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-200 hover:bg-neutral-300 rounded-lg transition-colors"
										>
											<ExternalLink className="w-4 h-4" />
											Open
										</a>
										<button
											onClick={() => {
												const url = previewImage.signed_url;
												if (url) {
													const link = document.createElement("a");
													link.href = url;
													link.download =
														previewImage.image_url?.split("/").pop() ||
														"image.jpg";
													link.click();
												}
											}}
											className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
										>
											<Download className="w-4 h-4" />
											Download
										</button>
									</div>
								</div>
							</div>
						)}
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
