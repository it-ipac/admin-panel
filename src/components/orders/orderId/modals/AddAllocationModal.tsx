import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
	AddAllocationVars,
	CatalogItemOption,
	CategoryOption,
	DestinationOption,
} from "@/features/orders/hooks/useOrderAllocations";

interface AddAllocationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	destinations: DestinationOption[];
	categories: CategoryOption[];
	catalog: CatalogItemOption[];
	onSubmit: (vars: AddAllocationVars) => Promise<void>;
	isSubmitting: boolean;
}

const MAX_ITEM_RESULTS = 60;

/** Add an item allocation to an order — pick an existing catalog item or create a new one. */
export function AddAllocationModal({
	open,
	onOpenChange,
	destinations,
	categories,
	catalog,
	onSubmit,
	isSubmitting,
}: AddAllocationModalProps) {
	const [mode, setMode] = useState<"existing" | "new">("existing");
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("");
	const [itemsDbId, setItemsDbId] = useState("");
	const [newItemNum, setNewItemNum] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newCategoryId, setNewCategoryId] = useState("");
	const [destinationId, setDestinationId] = useState("");
	const [expected, setExpected] = useState("1");
	const [isStandardBox, setIsStandardBox] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset the form whenever the modal opens.
	useEffect(() => {
		if (open) {
			setMode("existing");
			setSearch("");
			setCategoryFilter("");
			setItemsDbId("");
			setNewItemNum("");
			setNewDescription("");
			setNewCategoryId("");
			setDestinationId("");
			setExpected("1");
			setIsStandardBox(false);
			setError(null);
		}
	}, [open]);

	const filteredItems = useMemo(() => {
		const q = search.trim().toLowerCase();
		const matched = catalog.filter((item) => {
			if (categoryFilter && item.category_id !== categoryFilter) return false;
			if (!q) return true;
			return [item.item_num, item.description, item.reference].some((f) =>
				String(f || "")
					.toLowerCase()
					.includes(q),
			);
		});
		return { rows: matched.slice(0, MAX_ITEM_RESULTS), total: matched.length };
	}, [catalog, search, categoryFilter]);

	const handleSubmit = async () => {
		setError(null);
		// Whole numbers only (items_db rollup is integer).
		const expectedNum = Math.round(Number(expected));
		if (!Number.isFinite(expectedNum) || expectedNum <= 0) {
			setError("Expected quantity must be a whole number greater than 0.");
			return;
		}
		if (!destinationId) {
			setError("Select a destination.");
			return;
		}
		if (mode === "existing" && !itemsDbId) {
			setError("Select an item from the catalog.");
			return;
		}
		if (mode === "new" && !newItemNum.trim()) {
			setError("Enter an item number for the new item.");
			return;
		}
		try {
			await onSubmit({
				mode,
				itemsDbId: mode === "existing" ? itemsDbId : undefined,
				newItem:
					mode === "new"
						? {
								itemNum: newItemNum,
								description: newDescription,
								categoryId: newCategoryId || null,
							}
						: undefined,
				destinationId,
				expected: expectedNum,
				isStandardBox,
			});
			onOpenChange(false);
		} catch (e) {
			setError((e as { message?: string })?.message || "Failed to add item.");
		}
	};

	const inputClass =
		"w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm";

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
					<Dialog.Title className="text-lg font-semibold text-neutral-900 mb-4">
						Add item allocation
					</Dialog.Title>
					<Dialog.Description className="sr-only">
						Allocate an item to this order for a destination.
					</Dialog.Description>

					<div className="flex p-1 bg-neutral-100 rounded-lg mb-5">
						<button
							type="button"
							onClick={() => setMode("existing")}
							className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
								mode === "existing"
									? "bg-white text-primary-600 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700"
							}`}
						>
							Existing item
						</button>
						<button
							type="button"
							onClick={() => setMode("new")}
							className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
								mode === "new"
									? "bg-white text-primary-600 shadow-sm"
									: "text-neutral-500 hover:text-neutral-700"
							}`}
						>
							New item
						</button>
					</div>

					<div className="space-y-4">
						{mode === "existing" ? (
							<>
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label
											htmlFor="alloc-cat-filter"
											className="block text-sm font-medium text-neutral-700 mb-1"
										>
											Category
										</label>
										<select
											id="alloc-cat-filter"
											value={categoryFilter}
											onChange={(e) => setCategoryFilter(e.target.value)}
											className={inputClass}
										>
											<option value="">All categories</option>
											{categories.map((c) => (
												<option key={c.id} value={c.id}>
													{c.label || "Unnamed"}
												</option>
											))}
										</select>
									</div>
									<div>
										<label
											htmlFor="alloc-search"
											className="block text-sm font-medium text-neutral-700 mb-1"
										>
											Search
										</label>
										<input
											id="alloc-search"
											type="text"
											value={search}
											onChange={(e) => setSearch(e.target.value)}
											placeholder="Item # / description"
											className={inputClass}
										/>
									</div>
								</div>
								<div className="border border-neutral-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-neutral-100">
									{filteredItems.rows.length === 0 ? (
										<p className="p-3 text-sm text-neutral-400">
											No catalog items match.
										</p>
									) : (
										filteredItems.rows.map((item) => (
											<button
												type="button"
												key={item.id}
												onClick={() => setItemsDbId(item.id)}
												className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 ${
													itemsDbId === item.id
														? "bg-primary-50 border-l-2 border-primary-500"
														: ""
												}`}
											>
												<span className="font-medium text-neutral-900">
													{item.item_num || "(no #)"}
												</span>
												{item.description ? (
													<span className="text-neutral-500">
														{" "}
														— {item.description}
													</span>
												) : null}
											</button>
										))
									)}
									{filteredItems.total > filteredItems.rows.length && (
										<p className="p-2 text-xs text-neutral-400">
											Showing {filteredItems.rows.length} of{" "}
											{filteredItems.total} — refine the search.
										</p>
									)}
								</div>
							</>
						) : (
							<>
								<div>
									<label
										htmlFor="alloc-new-num"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Item number
									</label>
									<input
										id="alloc-new-num"
										type="text"
										value={newItemNum}
										onChange={(e) => setNewItemNum(e.target.value)}
										placeholder="e.g. 181072516"
										className={inputClass}
									/>
								</div>
								<div>
									<label
										htmlFor="alloc-new-desc"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Description
									</label>
									<input
										id="alloc-new-desc"
										type="text"
										value={newDescription}
										onChange={(e) => setNewDescription(e.target.value)}
										placeholder="Item description"
										className={inputClass}
									/>
								</div>
								<div>
									<label
										htmlFor="alloc-new-cat"
										className="block text-sm font-medium text-neutral-700 mb-1"
									>
										Category
									</label>
									<select
										id="alloc-new-cat"
										value={newCategoryId}
										onChange={(e) => setNewCategoryId(e.target.value)}
										className={inputClass}
									>
										<option value="">No category</option>
										{categories.map((c) => (
											<option key={c.id} value={c.id}>
												{c.label || "Unnamed"}
											</option>
										))}
									</select>
								</div>
							</>
						)}

						<div className="grid grid-cols-2 gap-2">
							<div>
								<label
									htmlFor="alloc-dest"
									className="block text-sm font-medium text-neutral-700 mb-1"
								>
									Destination
								</label>
								<select
									id="alloc-dest"
									value={destinationId}
									onChange={(e) => setDestinationId(e.target.value)}
									className={inputClass}
								>
									<option value="">Select destination...</option>
									{destinations.map((d) => (
										<option key={d.id} value={d.id}>
											{d.code}
											{d.name ? ` — ${d.name}` : ""}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="alloc-expected"
									className="block text-sm font-medium text-neutral-700 mb-1"
								>
									Expected qty
								</label>
								<input
									id="alloc-expected"
									type="number"
									min={1}
									value={expected}
									onChange={(e) => setExpected(e.target.value)}
									className={inputClass}
								/>
							</div>
						</div>

						<label className="flex items-center gap-2 text-sm text-neutral-700">
							<input
								type="checkbox"
								checked={isStandardBox}
								onChange={(e) => setIsStandardBox(e.target.checked)}
								className="rounded border-neutral-300"
							/>
							Standard box item (available in the SB destination pool)
						</label>

						{error && <p className="text-sm text-danger-600">{error}</p>}
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Dialog.Close asChild>
							<button
								type="button"
								className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg"
							>
								Cancel
							</button>
						</Dialog.Close>
						<button
							type="button"
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
						>
							{isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
							Add item
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
