import {
	Check,
	Edit2,
	Loader2,
	QrCode,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import type { PackageInstance, TagTaxonomy } from "@/features/orders/types";
import {
	resolveCategoryFromTags,
	tagIdsFromCategory,
	tagTokensFromSelection,
} from "@/features/orders/utils/tagSelection";

interface InstanceRowProps {
	instance: PackageInstance;
	isSelected: boolean;
	onToggleSelect: (checked: boolean) => void;
	isUpdated: boolean;
	clientCategories: { id: string; label: string }[];
	tagTaxonomy?: TagTaxonomy;
	onSave: (instanceId: string, updates: Partial<PackageInstance>) => void;
	/** Ask the parent to prompt "regenerate id?" after the tag/category changed. */
	onRequestRegenerate: (instanceId: string) => void;
	onRegenerate: (instanceId: string) => void;
	onRemove: (instanceId: string) => void;
	/** Whether this box already has a QR token bound. */
	qrLinked: boolean;
	onOpenQr: (instanceId: string) => void;
	regeneratePending: boolean;
	removePending: boolean;
}

const cellInput =
	"border border-neutral-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:border-primary-500";

export function InstanceRow({
	instance,
	isSelected,
	onToggleSelect,
	isUpdated,
	clientCategories,
	tagTaxonomy,
	onSave,
	onRequestRegenerate,
	onRegenerate,
	onRemove,
	qrLinked,
	onOpenQr,
	regeneratePending,
	removePending,
}: InstanceRowProps) {
	const [editing, setEditing] = useState(false);
	const [referenceDraft, setReferenceDraft] = useState("");
	const [destinationDraft, setDestinationDraft] = useState("");
	const [tagDraft, setTagDraft] = useState("");
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
	const [tagsTouched, setTagsTouched] = useState(false);

	const hasLevels = !!tagTaxonomy && tagTaxonomy.levels.length > 0;

	const startEdit = () => {
		setReferenceDraft(instance.ipac_reference || "");
		setDestinationDraft(instance.destination || "");
		setTagDraft(instance.tag || "");
		setSelectedTagIds(tagIdsFromCategory(tagTaxonomy, instance.category_id));
		setTagsTouched(false);
		setEditing(true);
	};

	const setLevelSelection = (levelTagIds: string[], tagId: string) => {
		setSelectedTagIds((prev) => {
			const next = prev.filter((id) => !levelTagIds.includes(id));
			if (tagId) next.push(tagId);
			return next;
		});
		setTagsTouched(true);
	};

	const handleSave = () => {
		const updates: Partial<PackageInstance> = {
			ipac_reference: referenceDraft,
			destination: destinationDraft || null,
		};
		let categoryChanged = false;
		if (hasLevels && tagsTouched) {
			const newCategoryId = resolveCategoryFromTags(
				tagTaxonomy,
				selectedTagIds,
			);
			updates.category_id = newCategoryId;
			updates.tag = tagTokensFromSelection(tagTaxonomy, selectedTagIds) || null;
			categoryChanged = newCategoryId !== (instance.category_id || null);
		} else if (!hasLevels) {
			updates.tag = tagDraft || null;
		}
		onSave(instance.id, updates);
		setEditing(false);
		if (categoryChanged) onRequestRegenerate(instance.id);
	};

	const categoryLabel =
		clientCategories.find((c) => c.id === instance.category_id)?.label ||
		"Default";

	return (
		<tr
			className={`border-t border-neutral-100 transition-colors duration-500 ${
				isUpdated ? "bg-success-50 border-l-2 border-l-success-400" : ""
			}`}
		>
			<td className="px-4 py-2.5 text-left w-10">
				<input
					type="checkbox"
					className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
					checked={isSelected}
					onChange={(e) => onToggleSelect(e.target.checked)}
				/>
			</td>
			<td className="px-4 py-2.5 text-neutral-900 font-medium">
				{instance.instance_number ?? "-"}
			</td>
			<td className="px-4 py-2.5 text-neutral-800">
				{editing ? (
					<input
						className={cellInput}
						value={referenceDraft}
						onChange={(e) => setReferenceDraft(e.target.value)}
					/>
				) : (
					instance.ipac_reference || "-"
				)}
			</td>
			<td className="px-4 py-2.5 text-neutral-600">
				{instance.status || "design"}
			</td>
			<td className="px-4 py-2.5 text-neutral-800">
				{editing ? (
					<input
						className={cellInput}
						value={destinationDraft}
						onChange={(e) => setDestinationDraft(e.target.value)}
						placeholder="Destination"
					/>
				) : (
					instance.destination || "-"
				)}
			</td>
			<td className="px-4 py-2.5 text-neutral-800">
				{editing && hasLevels ? (
					<div className="flex flex-col gap-1 min-w-40">
						{tagTaxonomy?.levels.map((level) => {
							const levelTagIds = level.tags.map((t) => t.id);
							const current =
								selectedTagIds.find((id) => levelTagIds.includes(id)) || "";
							return (
								<select
									key={level.level}
									className={cellInput}
									value={current}
									onChange={(e) =>
										setLevelSelection(levelTagIds, e.target.value)
									}
								>
									<option value="">—</option>
									{level.tags.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							);
						})}
					</div>
				) : editing ? (
					<input
						className={cellInput}
						value={tagDraft}
						onChange={(e) => setTagDraft(e.target.value)}
						placeholder="Tag"
					/>
				) : (
					instance.tag || "-"
				)}
			</td>
			<td className="px-4 py-2.5 text-neutral-800">{categoryLabel}</td>
			<td className="px-4 py-2.5 text-right">
				<div className="flex items-center justify-end gap-2">
					{editing ? (
						<>
							<button
								onClick={handleSave}
								className="p-1 text-success-600 hover:bg-success-50 rounded"
								title="Save"
							>
								<Check className="w-4 h-4" />
							</button>
							<button
								onClick={() => setEditing(false)}
								className="p-1 text-danger-600 hover:bg-danger-50 rounded"
								title="Cancel"
							>
								<X className="w-4 h-4" />
							</button>
						</>
					) : (
						<>
							<button
								onClick={startEdit}
								className="p-1 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded"
								title="Edit instance"
							>
								<Edit2 className="w-4 h-4" />
							</button>
							<button
								onClick={() => onOpenQr(instance.id)}
								className={`p-1 rounded hover:bg-iris-50 ${
									qrLinked
										? "text-iris-600"
										: "text-danger-400 hover:text-iris-600"
								}`}
								title={
									qrLinked
										? "QR linked — click to view/replace"
										: "No QR linked — click to link the printed label"
								}
							>
								<QrCode className="w-4 h-4" />
							</button>
							<button
								onClick={() => onRegenerate(instance.id)}
								disabled={regeneratePending}
								className="p-1 text-neutral-400 hover:text-success-600 hover:bg-success-50 rounded disabled:opacity-50"
								title="Regenerate IPAC Reference (auto-infers destination, tag & item)"
							>
								{regeneratePending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
							</button>
							<button
								onClick={() => onRemove(instance.id)}
								disabled={removePending}
								className="p-1 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded disabled:opacity-50"
								title="Remove Instance"
							>
								{removePending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Trash2 className="w-4 h-4" />
								)}
							</button>
						</>
					)}
				</div>
			</td>
		</tr>
	);
}
