import { Copy, Move, Package, Tag, X } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { ReassignTarget } from "../api";
import { useReassignMediaMutation } from "../hooks/useReportMedia";
import type { ReportInstanceData } from "../types";

type Dest = {
	key: string;
	label: string;
	sublabel?: string;
	icon: React.ReactNode;
	target: ReassignTarget;
};

/** Build the list of places a photo can be filed to, given the box it sits under. */
function buildDestinations(
	currentInst: ReportInstanceData,
	allInstances: ReportInstanceData[],
): Dest[] {
	const dests: Dest[] = [];
	const pkgId = currentInst.order_package_id ?? "";

	dests.push({
		key: `box-${currentInst.id}`,
		label: `Box ${currentInst.package_number}${
			currentInst.instance_number > 1 ? `.${currentInst.instance_number}` : ""
		}`,
		sublabel: "as box photo",
		icon: <Package className="w-4 h-4 text-iris-600" />,
		target: {
			orderPackageId: pkgId,
			orderPkgInstanceId: currentInst.id,
			pkdItemId: null,
			designation: "package",
		},
	});

	for (const item of currentInst.pkd_items ?? []) {
		dests.push({
			key: `item-${item.id}`,
			label: `Item ${item.item_num || "—"}`,
			sublabel: item.item_name || "as item photo",
			icon: <Tag className="w-4 h-4 text-success-600" />,
			target: {
				orderPackageId: pkgId,
				orderPkgInstanceId: currentInst.id,
				pkdItemId: item.id,
				designation: "item",
			},
		});
	}

	for (const other of allInstances) {
		if (other.id === currentInst.id) continue;
		dests.push({
			key: `otherbox-${other.id}`,
			label: `Box ${other.package_number}${
				other.instance_number > 1 ? `.${other.instance_number}` : ""
			}`,
			sublabel: "as box photo (other box)",
			icon: <Package className="w-4 h-4 text-neutral-400" />,
			target: {
				orderPackageId: other.order_package_id ?? "",
				orderPkgInstanceId: other.id,
				pkdItemId: null,
				designation: "package",
			},
		});
	}

	return dests;
}

/** Full-screen second-level overlay for picking where to move/copy one photo. */
export const ReassignOverlay: React.FC<{
	mediaId: string;
	photoUrl: string;
	currentInst: ReportInstanceData;
	instances: ReportInstanceData[];
	onClose: () => void;
}> = ({ mediaId, photoUrl, currentInst, instances, onClose }) => {
	const reassign = useReassignMediaMutation();
	const [mode, setMode] = useState<"move" | "copy">("move");
	const [busyKey, setBusyKey] = useState<string | null>(null);

	const dests = useMemo(
		() => buildDestinations(currentInst, instances),
		[currentInst, instances],
	);

	const handlePick = async (dest: Dest) => {
		setBusyKey(dest.key);
		try {
			await reassign.mutateAsync({ mediaId, mode, target: dest.target });
			onClose();
		} catch (err) {
			console.error("Failed to reassign media:", err);
			alert(
				(err as { message?: string })?.message || "Failed to reassign photo",
			);
		} finally {
			setBusyKey(null);
		}
	};

	return (
		<div className="fixed inset-0 bg-steel-900/70 backdrop-blur-md flex items-center justify-center z-[100000] p-4">
			<div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
				<div className="flex items-center justify-between px-5 py-3.5 border-b bg-neutral-50 shrink-0">
					<h3 className="text-sm font-bold text-neutral-800">
						{mode === "move" ? "Move" : "Copy"} photo to…
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
					<img
						src={photoUrl}
						alt="Selected"
						className="w-14 h-14 object-cover rounded-lg border"
					/>
					<div className="flex rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
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
					</div>
					<p className="text-[11px] text-neutral-400 leading-tight">
						{mode === "move"
							? "Re-files this photo."
							: "Keeps the original, adds a copy."}
					</p>
				</div>

				<div className="overflow-y-auto p-2">
					{dests.map((dest) => (
						<button
							key={dest.key}
							type="button"
							disabled={busyKey !== null}
							onClick={() => handlePick(dest)}
							className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-iris-50 text-left cursor-pointer transition-colors disabled:opacity-50"
						>
							<span className="shrink-0">{dest.icon}</span>
							<span className="flex-1 min-w-0">
								<span className="text-sm font-semibold text-neutral-800 block truncate">
									{dest.label}
								</span>
								{dest.sublabel && (
									<span className="text-[11px] text-neutral-500 block truncate">
										{dest.sublabel}
									</span>
								)}
							</span>
							{busyKey === dest.key && (
								<span className="text-[11px] text-iris-600 font-semibold">
									…
								</span>
							)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
