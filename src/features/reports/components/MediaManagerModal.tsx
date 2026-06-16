import { Eye, EyeOff, Image, Move, Plus, X } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useUnfiledMediaQuery } from "../hooks/useReportMedia";
import type { ReportInstanceData, UnfiledMedia } from "../types";
import { AssignToBoxOverlay } from "./assignToBoxOverlay";
import { ReassignOverlay } from "./reassignOverlay";

interface MediaManagerModalProps {
	instances: ReportInstanceData[];
	hiddenMediaUrls: string[];
	onUpdateHiddenUrls: (urls: string[]) => void;
	onClose: () => void;
}

export const MediaManagerModal: React.FC<MediaManagerModalProps> = ({
	instances,
	hiddenMediaUrls,
	onUpdateHiddenUrls,
	onClose,
}) => {
	const orderPackageIds = useMemo(
		() => [
			...new Set(
				instances.map((i) => i.order_package_id).filter(Boolean) as string[],
			),
		],
		[instances],
	);
	const { data: unfiled = [] } = useUnfiledMediaQuery(orderPackageIds);

	const unfiledByPackage = useMemo(() => {
		const map = new Map<string, UnfiledMedia[]>();
		for (const m of unfiled) {
			if (!map.has(m.order_package_id)) map.set(m.order_package_id, []);
			map.get(m.order_package_id)!.push(m);
		}
		return map;
	}, [unfiled]);

	// Every in-scope box is shown as a tab — including boxes with no photos — so a
	// picture can be allocated to a box that currently has none.
	const tabInstances = instances;

	const [activeTabIdx, setActiveTabIdx] = useState(0);
	const [localHiddenUrls, setLocalHiddenUrls] =
		useState<string[]>(hiddenMediaUrls);
	// Photo currently being reassigned: { id, url }
	const [reassigning, setReassigning] = useState<{
		id: string;
		url: string;
	} | null>(null);
	// Box we're pulling a photo INTO (opens the "add photo to this box" picker)
	const [assigningToBox, setAssigningToBox] =
		useState<ReportInstanceData | null>(null);

	const handleToggleLocal = useCallback((url: string) => {
		setLocalHiddenUrls((prev) =>
			prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
		);
	}, []);

	const handleCloseAndSave = useCallback(() => {
		onUpdateHiddenUrls(localHiddenUrls);
		onClose();
	}, [localHiddenUrls, onUpdateHiddenUrls, onClose]);

	if (tabInstances.length === 0) {
		return (
			<div className="fixed inset-0 bg-steel-900/60 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
				<div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 text-center">
					<div className="w-16 h-16 bg-iris-50 rounded-full flex items-center justify-center mx-auto mb-4">
						<Image className="w-8 h-8 text-iris-600 animate-pulse" />
					</div>
					<h3 className="text-lg font-bold text-steel-800 mb-2">
						No Media Available
					</h3>
					<p className="text-sm text-steel-500 mb-6 font-medium">
						None of the selected packages or items have associated photos.
					</p>
					<button
						type="button"
						onClick={onClose}
						className="w-full py-2 bg-iris-600 hover:bg-iris-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
					>
						Close
					</button>
				</div>
			</div>
		);
	}

	const safeIdx = Math.min(activeTabIdx, tabInstances.length - 1);
	const activeInst = tabInstances[safeIdx];
	const boxPhotos = activeInst?.box_photos ?? [];
	const itemsWithPhotos =
		activeInst?.pkd_items?.filter((i) => (i.photos?.length ?? 0) > 0) ?? [];
	const activeUnfiled = activeInst?.order_package_id
		? (unfiledByPackage.get(activeInst.order_package_id) ?? [])
		: [];

	const openReassign = (id: string, url: string) => setReassigning({ id, url });

	return (
		<div className="fixed inset-0 bg-steel-900/60 backdrop-blur-md flex items-center justify-center z-[99999] p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full h-[80vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b bg-neutral-50 shrink-0">
					<div className="flex items-center gap-2">
						<Image className="w-5 h-5 text-iris-600" />
						<h3 className="text-base font-bold text-neutral-800">
							Manage Photos for Report
						</h3>
					</div>
					<button
						type="button"
						onClick={handleCloseAndSave}
						className="text-neutral-400 hover:text-neutral-700 transition-colors p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 flex overflow-hidden">
					{/* Tabs */}
					<div className="w-1/3 border-r bg-neutral-50 overflow-y-auto p-3 flex flex-col gap-1 shrink-0">
						<div className="text-[10px] font-bold text-neutral-400 px-3 py-1.5 uppercase tracking-wider">
							Packages
						</div>
						{tabInstances.map((inst, idx) => {
							const isSelected = idx === safeIdx;
							const linkedCount =
								(inst.box_photos?.length ?? 0) +
								(inst.pkd_items?.reduce(
									(s, i) => s + (i.photos?.length ?? 0),
									0,
								) ?? 0);
							const unfCount =
								unfiledByPackage.get(inst.order_package_id ?? "")?.length ?? 0;
							return (
								<button
									key={inst.id}
									type="button"
									onClick={() => setActiveTabIdx(idx)}
									className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
										isSelected
											? "bg-iris-50 text-iris-700 font-semibold shadow-sm border border-iris-100"
											: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent"
									}`}
								>
									<span className="text-xs truncate">
										📦 Box {inst.package_number}{" "}
										{inst.instance_number > 1
											? `(Inst ${inst.instance_number})`
											: ""}
									</span>
									<span className="flex items-center gap-1 shrink-0">
										<span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-neutral-200 text-neutral-700">
											{linkedCount}
										</span>
										{unfCount > 0 && (
											<span
												className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-warning-100 text-warning-700"
												title={`${unfCount} unfiled photo(s)`}
											>
												+{unfCount}
											</span>
										)}
									</span>
								</button>
							);
						})}
					</div>

					{/* Content */}
					<div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
						{activeInst && (
							<>
								<div className="border-b pb-3 flex items-start justify-between gap-3">
									<div>
										<h4 className="text-sm font-bold text-neutral-800">
											Box {activeInst.package_number}
											{activeInst.instance_number > 1
												? `.${activeInst.instance_number}`
												: ""}{" "}
											Details
										</h4>
										<p className="text-xs text-neutral-500 mt-1">
											Toggle a photo to show/hide it in the report. Use
											Move/Copy to re-file a photo onto the correct box or item.
										</p>
									</div>
									<button
										type="button"
										onClick={() => setAssigningToBox(activeInst)}
										className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-iris-600 hover:bg-iris-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm cursor-pointer"
										title="Pick any photo from this report and add it to this box"
									>
										<Plus className="w-3.5 h-3.5" /> Add photo to this box
									</button>
								</div>

								{/* Box photos */}
								<section>
									<h5 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
										📷 Box Photos ({boxPhotos.length})
									</h5>
									{boxPhotos.length === 0 ? (
										<p className="text-xs text-neutral-400 italic">
											No box-level photos.
										</p>
									) : (
										<div className="grid grid-cols-3 gap-4">
											{boxPhotos.map((photo) => (
												<PhotoCard
													key={photo.id}
													url={photo.url}
													hidden={localHiddenUrls.includes(photo.url)}
													onToggle={() => handleToggleLocal(photo.url)}
													onReassign={() => openReassign(photo.id, photo.url)}
												/>
											))}
										</div>
									)}
								</section>

								{/* Item photos */}
								{itemsWithPhotos.length > 0 && (
									<section className="flex flex-col gap-6">
										<h5 className="text-xs font-bold text-neutral-500 uppercase tracking-wider border-t pt-4">
											🏷️ Item Photos
										</h5>
										{itemsWithPhotos.map((item, idx) => (
											<div
												key={`item-${item.id}-${idx}`}
												className="bg-neutral-50/50 p-4 rounded-lg border border-neutral-100"
											>
												<div className="mb-3">
													<span className="text-xs font-bold text-neutral-700 block">
														Item {idx + 1}: {item.item_num || "No #"}
													</span>
													<span className="text-xs text-neutral-600 block mt-0.5 italic">
														{item.item_name || "No Description"}
													</span>
												</div>
												<div className="grid grid-cols-3 gap-4">
													{(item.photos ?? []).map((photo) => (
														<PhotoCard
															key={photo.id}
															url={photo.url}
															hidden={localHiddenUrls.includes(photo.url)}
															onToggle={() => handleToggleLocal(photo.url)}
															onReassign={() =>
																openReassign(photo.id, photo.url)
															}
														/>
													))}
												</div>
											</div>
										))}
									</section>
								)}

								{/* Unfiled / Task photos */}
								<section>
									<h5 className="text-xs font-bold text-warning-700 uppercase tracking-wider border-t pt-4 mb-1">
										⚠️ Unfiled Photos ({activeUnfiled.length})
									</h5>
									<p className="text-[11px] text-neutral-500 mb-3">
										Photos attached to this package but not to a specific box or
										item — tasks, manufacturing, maintenance, or stray box/item
										shots (the chip on each shows which). They do{" "}
										<strong>not</strong> appear on the report until you file them
										onto a box or item.
									</p>
									{activeUnfiled.length === 0 ? (
										<p className="text-xs text-neutral-400 italic">
											No unfiled photos for this package.
										</p>
									) : (
										<div className="grid grid-cols-3 gap-4">
											{activeUnfiled.map((photo) => (
												<UnfiledCard
													key={photo.id}
													photo={photo}
													onReassign={() => openReassign(photo.id, photo.url)}
												/>
											))}
										</div>
									)}
								</section>
							</>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t bg-neutral-50 flex justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={handleCloseAndSave}
						className="px-5 py-2 bg-iris-600 hover:bg-iris-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
					>
						Done
					</button>
				</div>
			</div>

			{reassigning && activeInst && (
				<ReassignOverlay
					key={reassigning.id}
					mediaId={reassigning.id}
					photoUrl={reassigning.url}
					currentInst={activeInst}
					instances={instances}
					onClose={() => setReassigning(null)}
				/>
			)}

			{assigningToBox && (
				<AssignToBoxOverlay
					key={assigningToBox.id}
					targetInst={assigningToBox}
					instances={instances}
					unfiled={unfiled}
					onClose={() => setAssigningToBox(null)}
				/>
			)}
		</div>
	);
};

const PhotoCard: React.FC<{
	url: string;
	hidden: boolean;
	onToggle: () => void;
	onReassign: () => void;
}> = ({ url, hidden, onToggle, onReassign }) => {
	return (
		<div
			className={`relative rounded-lg overflow-hidden border-2 transition-all ${
				hidden
					? "border-neutral-200 opacity-60 bg-neutral-50"
					: "border-success-500 ring-2 ring-success-500/20"
			}`}
		>
			<img src={url} alt="" className="w-full h-28 object-cover" />
			<div className="absolute top-1.5 right-1.5 flex gap-1">
				<button
					type="button"
					onClick={onReassign}
					title="Move or copy this photo to a box or item"
					className="p-1.5 bg-white/90 hover:bg-white rounded-md shadow-sm cursor-pointer"
				>
					<Move className="w-3.5 h-3.5 text-iris-700" />
				</button>
			</div>
			<button
				type="button"
				onClick={onToggle}
				className={`absolute bottom-0 inset-x-0 py-1.5 px-2 text-[10px] font-semibold flex items-center justify-center gap-1 select-none cursor-pointer transition-colors ${
					hidden ? "bg-neutral-500 text-white" : "bg-success-600 text-white"
				}`}
			>
				{hidden ? (
					<>
						<EyeOff className="w-3 h-3" /> Hidden
					</>
				) : (
					<>
						<Eye className="w-3 h-3" /> Shown
					</>
				)}
			</button>
		</div>
	);
};

const UnfiledCard: React.FC<{
	photo: UnfiledMedia;
	onReassign: () => void;
}> = ({ photo, onReassign }) => {
	const taskName = photo.notes?.match(/task:\s*([^;]+)/i)?.[1]?.trim();
	const chip = taskName || photo.designation || "unfiled";
	return (
		<div className="relative rounded-lg overflow-hidden border-2 border-warning-300 bg-warning-50/30">
			<img src={photo.url} alt="Unfiled" className="w-full h-28 object-cover" />
			<span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-warning-600 text-white px-1.5 py-0.5 rounded-full max-w-[80%] truncate">
				{chip}
			</span>
			<button
				type="button"
				onClick={onReassign}
				className="absolute bottom-0 inset-x-0 py-1.5 px-2 text-[10px] font-semibold flex items-center justify-center gap-1 bg-iris-600 hover:bg-iris-700 text-white select-none cursor-pointer transition-colors"
			>
				<Move className="w-3 h-3" /> File to box / item
			</button>
		</div>
	);
};
