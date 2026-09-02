import { Copy, Move, Plus, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useReassignMediaMutation } from "../hooks/useReportMedia";
import type { ReportInstanceData, UnfiledMedia } from "../types";

type PoolPhoto = {
	id: string;
	url: string;
	label: string;
	tone: "box" | "item" | "unfiled";
};

/** Every photo in the current report scope, as candidates to add to a box. */
function buildPhotoPool(
	instances: ReportInstanceData[],
	unfiled: UnfiledMedia[],
	excludeInstanceId: string,
): PoolPhoto[] {
	const pool: PoolPhoto[] = [];
	for (const inst of instances) {
		const boxLabel = `Box ${inst.package_number}${
			inst.instance_number > 1 ? `.${inst.instance_number}` : ""
		}`;
		// skip the target box's own box photos (already there)
		if (inst.id !== excludeInstanceId) {
			for (const p of inst.box_photos ?? []) {
				pool.push({ id: p.id, url: p.url, label: boxLabel, tone: "box" });
			}
		}
		for (const item of inst.pkd_items ?? []) {
			for (const p of item.photos ?? []) {
				pool.push({
					id: p.id,
					url: p.url,
					label: `${boxLabel} · item ${item.item_num || "—"}`,
					tone: "item",
				});
			}
		}
	}
	for (const u of unfiled) {
		const taskName = u.notes?.match(/task:\s*([^;]+)/i)?.[1]?.trim();
		pool.push({
			id: u.id,
			url: u.url,
			label: `Unfiled · ${taskName || u.designation || "photo"}`,
			tone: "unfiled",
		});
	}
	const seen = new Set<string>();
	return pool.filter((p) => {
		if (seen.has(p.id)) return false;
		seen.add(p.id);
		return true;
	});
}

const TONE_CHIP: Record<PoolPhoto["tone"], string> = {
	box: "bg-neutral-200 text-neutral-700",
	item: "bg-success-100 text-success-700",
	unfiled: "bg-warning-100 text-warning-700",
};

/**
 * "Pull" overlay: pick any photo in the report and add it to one box (as a box
 * photo). Lets an admin allocate a picture to a box that currently has none.
 */
export const AssignToBoxOverlay: React.FC<{
	targetInst: ReportInstanceData;
	instances: ReportInstanceData[];
	unfiled: UnfiledMedia[];
	onClose: () => void;
}> = ({ targetInst, instances, unfiled, onClose }) => {
	const reassign = useReassignMediaMutation();
	const [mode, setMode] = useState<"copy" | "move">("copy");
	const [busyId, setBusyId] = useState<string | null>(null);

	const pool = useMemo(
		() => buildPhotoPool(instances, unfiled, targetInst.id),
		[instances, unfiled, targetInst.id],
	);

	const boxLabel = `Box ${targetInst.package_number}${
		targetInst.instance_number > 1 ? `.${targetInst.instance_number}` : ""
	}`;

	const handlePick = async (photoId: string) => {
		setBusyId(photoId);
		try {
			await reassign.mutateAsync({
				mediaId: photoId,
				mode,
				target: {
					orderPackageId: targetInst.order_package_id ?? "",
					orderPkgInstanceId: targetInst.id,
					pkdItemId: null,
					designation: "package",
				},
			});
			onClose();
		} catch (err) {
			console.error("Failed to assign photo:", err);
			alert((err as { message?: string })?.message || "Failed to assign photo");
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="fixed inset-0 bg-steel-900/70 backdrop-blur-md flex items-center justify-center z-[100000] p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
				<div className="flex items-center justify-between px-5 py-3.5 border-b bg-neutral-50 shrink-0">
					<h3 className="text-sm font-bold text-neutral-800">
						Add a photo to {boxLabel}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 cursor-pointer"
						aria-label="Close"
					>
						<X className="w-4 h-4" aria-hidden="true" />
					</button>
				</div>

				<div className="flex items-center gap-3 px-5 py-3 border-b">
					<div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
						<button
							type="button"
							onClick={() => setMode("copy")}
							className={`px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
								mode === "copy"
									? "bg-iris-600 text-white"
									: "bg-white text-neutral-600 hover:bg-neutral-50"
							}`}
						>
							<Copy className="w-3.5 h-3.5" /> Copy
						</button>
						<button
							type="button"
							onClick={() => setMode("move")}
							className={`px-3 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors ${
								mode === "move"
									? "bg-iris-600 text-white"
									: "bg-white text-neutral-600 hover:bg-neutral-50"
							}`}
						>
							<Move className="w-3.5 h-3.5" /> Move
						</button>
					</div>
					<p className="text-[11px] text-neutral-400 leading-tight">
						{mode === "copy"
							? "Adds a copy to this box, leaving the original in place."
							: "Re-files the chosen photo onto this box."}
					</p>
				</div>

				<div className="overflow-y-auto p-4">
					{pool.length === 0 ? (
						<p className="text-sm text-neutral-400 italic text-center py-8">
							No other photos are available in this report to add.
						</p>
					) : (
						<div className="grid grid-cols-4 gap-3">
							{pool.map((p) => (
								<button
									key={p.id}
									type="button"
									disabled={busyId !== null}
									onClick={() => handlePick(p.id)}
									className="relative rounded-lg overflow-hidden border-2 border-neutral-200 hover:border-iris-500 hover:-translate-y-0.5 hover:shadow-md text-left cursor-pointer transition-all disabled:opacity-50"
								>
									<img
										src={p.url}
										alt=""
										className="w-full h-24 object-cover"
									/>
									<span
										className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full max-w-[90%] truncate ${TONE_CHIP[p.tone]}`}
									>
										{p.label}
									</span>
									<span className="absolute bottom-0 inset-x-0 py-1 text-[10px] font-semibold text-center bg-iris-600 text-white flex items-center justify-center gap-1">
										{busyId === p.id ? (
											"…"
										) : (
											<>
												<Plus className="w-3 h-3" /> Add
											</>
										)}
									</span>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
