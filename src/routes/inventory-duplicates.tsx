import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	Loader2,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import type {
	Material,
	MaterialVariant,
	Unit,
} from "../components/inventory/types";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/inventory-duplicates")({
	component: InventoryDuplicatesPage,
});

type ErrorBoundaryState = { hasError: boolean; errorMessage: string };

class InventoryDuplicatesErrorBoundary extends Component<
	{ children: ReactNode },
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { hasError: false, errorMessage: "" };

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return {
			hasError: true,
			errorMessage:
				error instanceof Error ? error.message : "Unexpected error.",
		};
	}

	componentDidCatch(error: unknown) {
		console.error("Inventory duplicates page error:", error);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
					<div className="bg-white border border-danger-100 rounded-xl shadow-sm p-6 max-w-lg w-full">
						<h1 className="text-lg font-semibold text-danger-600">
							Page failed to load
						</h1>
						<p className="text-sm text-neutral-600 mt-2">
							{this.state.errorMessage}
						</p>
						<p className="text-xs text-neutral-400 mt-3">
							Check the browser console for details.
						</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

type VariantRefCounts = {
	orderMaterials: number;
	beams: number;
	templates: number;
	pricing: number;
	tags: number;
	total: number;
};

type MaterialSummary = Pick<Material, "id" | "name">;

type VariantWithRefs = Omit<MaterialVariant, "material"> & {
	material?: MaterialSummary;
	unit?: Unit;
	refCounts: VariantRefCounts;
};

type DuplicateGroup = {
	key: string;
	materialId: string;
	materialName: string;
	variantName: string;
	dimensions: string;
	unitName: string;
	variants: VariantWithRefs[];
};

function InventoryDuplicatesPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user, loading: authLoading } = useAuth();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [selectionByGroup, setSelectionByGroup] = useState<
		Record<string, string>
	>({});
	const [mergeTarget, setMergeTarget] = useState<DuplicateGroup | null>(null);
	const [mergeError, setMergeError] = useState<string | null>(null);

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	const {
		data: variants,
		isLoading,
		error,
		refetch,
		isFetching,
	} = useQuery({
		queryKey: ["material-variant-duplicates"],
		queryFn: async () => {
			const { data: mats, error: matsErr } = await supabase
				.from("materials")
				.select("id, name")
				.order("name");
			if (matsErr) throw matsErr;

			const { data: unitsData, error: unitsErr } = await supabase
				.from("units_of_measure")
				.select("id, name, description");
			if (unitsErr) throw unitsErr;

			const { data: vars, error: varsErr } = await supabase
				.from("material_variants")
				.select(
					"id, material_id, variant_name, description, unit_id, length, width, thickness, created_at",
				)
				.order("variant_name");
			if (varsErr) throw varsErr;

			const variantIds = (vars || []).map((v) => v.id);
			const emptyRefs = {
				orderMaterials: 0,
				beams: 0,
				templates: 0,
				pricing: 0,
				tags: 0,
				total: 0,
			};

			const materialMap = new Map(
				(mats || []).map((m) => [m.id, m as MaterialSummary]),
			);
			const unitMap = new Map((unitsData || []).map((u: Unit) => [u.id, u]));

			if (!variantIds.length) {
				return (vars || []).map((v) => ({
					...v,
					material: materialMap.get(v.material_id),
					unit: v.unit_id ? unitMap.get(v.unit_id) : undefined,
					refCounts: emptyRefs,
				}));
			}

			const [opmRes, beamRes, templateRes, pricingRes, tagsRes] =
				await Promise.all([
					supabase
						.from("order_package_materials")
						.select("material_variant_id")
						.in("material_variant_id", variantIds),
					supabase.from("beam").select("type").in("type", variantIds),
					supabase
						.from("securing_template")
						.select("type_id")
						.in("type_id", variantIds),
					supabase
						.from("supplier_pricing")
						.select("material_variant_id")
						.in("material_variant_id", variantIds),
					supabase
						.from("material_variant_tags")
						.select("material_variant_id")
						.in("material_variant_id", variantIds),
				]);

			if (opmRes.error) throw opmRes.error;
			if (beamRes.error) throw beamRes.error;
			if (templateRes.error) throw templateRes.error;
			if (pricingRes.error) throw pricingRes.error;
			if (tagsRes.error) throw tagsRes.error;

			const countBy = <T extends string>(
				rows: Record<T, string>[] | null,
				key: T,
			) => {
				const map = new Map<string, number>();
				(rows || []).forEach((row) => {
					const id = row[key];
					if (!id) return;
					const current = map.get(id) || 0;
					map.set(id, current + 1);
				});
				return map;
			};

			const orderMap = countBy(opmRes.data, "material_variant_id");
			const beamMap = countBy(beamRes.data, "type");
			const templateMap = countBy(templateRes.data, "type_id");
			const pricingMap = countBy(pricingRes.data, "material_variant_id");
			const tagMap = countBy(tagsRes.data, "material_variant_id");

			return (vars || []).map((v) => {
				const orderMaterials = orderMap.get(v.id) || 0;
				const beams = beamMap.get(v.id) || 0;
				const templates = templateMap.get(v.id) || 0;
				const pricing = pricingMap.get(v.id) || 0;
				const tags = tagMap.get(v.id) || 0;
				return {
					...v,
					material: materialMap.get(v.material_id),
					unit: v.unit_id ? unitMap.get(v.unit_id) : undefined,
					refCounts: {
						orderMaterials,
						beams,
						templates,
						pricing,
						tags,
						total: orderMaterials + beams + templates + pricing + tags,
					},
				};
			});
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const duplicateGroups = useMemo(() => {
		if (!variants) return [];
		const groupMap = new Map<string, DuplicateGroup>();

		variants.forEach((variant) => {
			const safeName = (variant.variant_name || "").trim();
			const nameKey = safeName.toLowerCase();
			const key = nameKey;

			const materialName = variant.material?.name || "Unknown material";
			const dimensions = formatDimensions(variant);
			const unitName = variant.unit?.name || "—";

			const existing = groupMap.get(key);
			if (!existing) {
				groupMap.set(key, {
					key,
					materialId: variant.material_id,
					materialName,
					variantName: safeName || "—",
					dimensions,
					unitName,
					variants: [variant],
				});
			} else {
				existing.variants.push(variant);
				if (existing.materialName !== materialName) {
					existing.materialName = "Multiple materials";
				}
				if (existing.dimensions !== dimensions) {
					existing.dimensions = "Mixed";
				}
				if (existing.unitName !== unitName) {
					existing.unitName = "Mixed";
				}
			}
		});

		const groups = Array.from(groupMap.values())
			.filter((group) => group.variants.length > 1)
			.sort((a, b) => a.variantName.localeCompare(b.variantName));

		if (!debouncedSearch.trim()) return groups;
		const searchLower = debouncedSearch.trim().toLowerCase();
		return groups.filter(
			(group) =>
				group.variantName.toLowerCase().includes(searchLower) ||
				group.materialName.toLowerCase().includes(searchLower),
		);
	}, [variants, debouncedSearch]);

	useEffect(() => {
		if (!duplicateGroups.length) return;
		setSelectionByGroup((prev) => {
			const next = { ...prev };
			duplicateGroups.forEach((group) => {
				if (next[group.key]) return;
				const sorted = [...group.variants].sort((a, b) => {
					if (b.refCounts.total !== a.refCounts.total) {
						return b.refCounts.total - a.refCounts.total;
					}
					const aDate = a.created_at
						? new Date(a.created_at).getTime()
						: Number.MAX_SAFE_INTEGER;
					const bDate = b.created_at
						? new Date(b.created_at).getTime()
						: Number.MAX_SAFE_INTEGER;
					return aDate - bDate;
				});
				if (sorted[0]) {
					next[group.key] = sorted[0].id;
				}
			});
			return next;
		});
	}, [duplicateGroups]);

	const mergeMutation = useMutation({
		mutationFn: async ({
			keepId,
			deleteIds,
		}: {
			keepId: string;
			deleteIds: string[];
		}) => {
			if (!deleteIds.length) return;

			const { error: orderUpdateError } = await supabase
				.from("order_package_materials")
				.update({ material_variant_id: keepId })
				.in("material_variant_id", deleteIds);
			if (orderUpdateError) throw orderUpdateError;

			const { error: pricingUpdateError } = await supabase
				.from("supplier_pricing")
				.update({ material_variant_id: keepId })
				.in("material_variant_id", deleteIds);
			if (pricingUpdateError) throw pricingUpdateError;

			const { data: keepTags, error: keepTagsError } = await supabase
				.from("material_variant_tags")
				.select("tag_id")
				.eq("material_variant_id", keepId);
			if (keepTagsError) throw keepTagsError;

			const keepTagIds = new Set(
				(keepTags || []).map((row: any) => row.tag_id),
			);

			const { data: deleteTags, error: deleteTagsError } = await supabase
				.from("material_variant_tags")
				.select("tag_id")
				.in("material_variant_id", deleteIds);
			if (deleteTagsError) throw deleteTagsError;

			const duplicateTagIds = (deleteTags || [])
				.filter((row: any) => keepTagIds.has(row.tag_id))
				.map((row: any) => row.tag_id);

			if (duplicateTagIds.length > 0) {
				const { error: duplicateDeleteError } = await supabase
					.from("material_variant_tags")
					.delete()
					.in("material_variant_id", deleteIds)
					.in("tag_id", duplicateTagIds);
				if (duplicateDeleteError) throw duplicateDeleteError;
			}

			const { error: tagsUpdateError } = await supabase
				.from("material_variant_tags")
				.update({ material_variant_id: keepId })
				.in("material_variant_id", deleteIds);
			if (tagsUpdateError) throw tagsUpdateError;

			const { error: beamUpdateError } = await supabase
				.from("beam")
				.update({ type: keepId })
				.in("type", deleteIds);
			if (beamUpdateError) throw beamUpdateError;

			const { error: templateUpdateError } = await supabase
				.from("securing_template")
				.update({ type_id: keepId })
				.in("type_id", deleteIds);
			if (templateUpdateError) throw templateUpdateError;

			const { error: deleteError } = await supabase
				.from("material_variants")
				.delete()
				.in("id", deleteIds);
			if (deleteError) throw deleteError;
		},
		onSuccess: async () => {
			setMergeTarget(null);
			setMergeError(null);
			await queryClient.invalidateQueries({
				queryKey: ["material-variant-duplicates"],
			});
		},
		onError: (err: any) => {
			setMergeError(err?.message || "Failed to merge duplicates.");
		},
	});

	const formatDate = (value?: string | null) => {
		if (!value) return "—";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "—";
		return date.toLocaleDateString();
	};

	const getDeleteIds = (group: DuplicateGroup) => {
		const keepId = selectionByGroup[group.key] || group.variants[0]?.id;
		return group.variants.filter((v) => v.id !== keepId).map((v) => v.id);
	};

	const getKeepVariant = (group: DuplicateGroup) => {
		const keepId = selectionByGroup[group.key] || group.variants[0]?.id;
		return group.variants.find((v) => v.id === keepId);
	};

	if (authLoading) {
		return (
			<InventoryDuplicatesErrorBoundary>
				<div className="min-h-screen flex items-center justify-center bg-neutral-50">
					<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
				</div>
			</InventoryDuplicatesErrorBoundary>
		);
	}

	return (
		<InventoryDuplicatesErrorBoundary>
			<div className="flex h-screen bg-neutral-50">
				<Sidebar />
				<main className="flex-1 overflow-y-auto">
					<div className="p-8">
						<div className="flex items-center justify-between mb-8">
							<div>
								<h1 className="text-2xl font-bold text-neutral-900">
									Material Variant Duplicates
								</h1>
								<p className="text-neutral-500 mt-1">
									Merge duplicates by redirecting references to a single
									variant.
								</p>
							</div>
							<div className="flex items-center gap-3">
								<button
									onClick={() => refetch()}
									className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
								>
									<RefreshCw
										className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
									/>
									Refresh
								</button>
								<Link
									to="/inventory"
									className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
								>
									<Copy className="w-4 h-4" />
									Back to Inventory
								</Link>
							</div>
						</div>

						<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 mb-6">
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div>
									<p className="text-sm font-medium text-neutral-700">
										Duplicate groups
									</p>
									<p className="text-xs text-neutral-500">
										Grouped by variant name only.
									</p>
								</div>
								<div className="relative max-w-md w-full">
									<input
										type="text"
										placeholder="Search duplicates..."
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										className="w-full pl-4 pr-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
									/>
								</div>
							</div>
						</div>

						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
							</div>
						) : error ? (
							<div className="bg-white rounded-xl shadow-sm border border-danger-100 p-6 text-danger-600 flex items-start gap-3">
								<AlertTriangle className="w-5 h-5 mt-0.5" />
								<div>
									<p className="font-semibold">Failed to load duplicates</p>
									<p className="text-sm text-danger-500">
										{(error as Error).message}
									</p>
								</div>
							</div>
						) : duplicateGroups.length === 0 ? (
							<div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-10 text-center">
								<CheckCircle2 className="w-10 h-10 text-success-500 mx-auto mb-3" />
								<p className="text-neutral-700 font-medium">
									No duplicates found.
								</p>
								<p className="text-sm text-neutral-500">You are all set!</p>
							</div>
						) : (
							<div className="space-y-6">
								{duplicateGroups.map((group) => {
									const keepVariant = getKeepVariant(group);
									const deleteIds = getDeleteIds(group);
									const totalToMove = group.variants
										.filter((v) => deleteIds.includes(v.id))
										.reduce((acc, v) => acc + v.refCounts.total, 0);

									return (
										<div
											key={group.key}
											className="bg-white rounded-xl shadow-sm border border-neutral-100"
										>
											<div className="flex flex-col gap-2 px-6 py-4 border-b border-neutral-100 md:flex-row md:items-center md:justify-between">
												<div>
													<h2 className="text-lg font-semibold text-neutral-900">
														{group.variantName || "—"}
													</h2>
													<p className="text-sm text-neutral-500">
														Material: {group.materialName}
													</p>
													<p className="text-xs text-neutral-400">
														{group.dimensions} · Unit: {group.unitName}
													</p>
												</div>
												<div className="flex items-center gap-3">
													<div className="text-xs text-neutral-500">
														{group.variants.length} variants · {totalToMove}{" "}
														references to move
													</div>
													<button
														onClick={() => {
															setMergeTarget(group);
															setMergeError(null);
														}}
														className="flex items-center gap-2 px-4 py-2 bg-danger-50 text-danger-700 rounded-lg hover:bg-danger-100 transition-colors"
														disabled={deleteIds.length === 0}
													>
														<Trash2 className="w-4 h-4" />
														Merge duplicates
													</button>
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="excel-table">
													<thead>
														<tr>
															<th className="w-20">Keep</th>
															<th>Variant ID</th>
															<th>Description</th>
															<th>Dimensions</th>
															<th>Unit</th>
															<th>Created</th>
															<th>Order Materials</th>
															<th>Beams</th>
															<th>Pricing</th>
															<th>Templates</th>
															<th>Tags</th>
															<th>Total Refs</th>
														</tr>
													</thead>
													<tbody>
														{group.variants.map((variant) => (
															<tr key={variant.id}>
																<td>
																	<label className="flex items-center justify-center">
																		<input
																			type="radio"
																			name={`keep-${group.key}`}
																			checked={
																				selectionByGroup[group.key] ===
																				variant.id
																			}
																			onChange={() =>
																				setSelectionByGroup((prev) => ({
																					...prev,
																					[group.key]: variant.id,
																				}))
																			}
																		/>
																	</label>
																</td>
																<td className="font-mono text-xs text-neutral-600">
																	{shortId(variant.id)}
																</td>
																<td className="text-neutral-600 max-w-xs truncate">
																	{variant.description || "—"}
																</td>
																<td className="text-neutral-600">
																	{formatDimensions(variant)}
																</td>
																<td>
																	<span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-xs">
																		{variant.unit?.name || "—"}
																	</span>
																</td>
																<td className="text-sm text-neutral-500">
																	{formatDate(variant.created_at)}
																</td>
																<td className="text-sm text-neutral-600 text-center">
																	{variant.refCounts.orderMaterials}
																</td>
																<td className="text-sm text-neutral-600 text-center">
																	{variant.refCounts.beams}
																</td>
																<td className="text-sm text-neutral-600 text-center">
																	{variant.refCounts.pricing}
																</td>
																<td className="text-sm text-neutral-600 text-center">
																	{variant.refCounts.templates}
																</td>
																<td className="text-sm text-neutral-600 text-center">
																	{variant.refCounts.tags}
																</td>
																<td className="text-sm font-semibold text-neutral-700 text-center">
																	{variant.refCounts.total}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
											{keepVariant && (
												<div className="px-6 py-4 border-t border-neutral-100 text-sm text-neutral-600">
													Keeping:{" "}
													<span className="font-medium text-neutral-900">
														{keepVariant.variant_name || "—"}
													</span>{" "}
													({shortId(keepVariant.id)})
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				</main>

				{mergeTarget && (
					<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
						<div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6">
							<h3 className="text-lg font-semibold text-neutral-900">
								Merge duplicate variants
							</h3>
							<p className="text-sm text-neutral-600 mt-2">
								This will update all references to the selected variant and
								delete the other duplicates.
							</p>
							<div className="mt-4 space-y-2 text-sm text-neutral-600">
								<p>
									Group:{" "}
									<span className="font-medium text-neutral-900">
										{mergeTarget.variantName || "—"}
									</span>
								</p>
								<p>Material: {mergeTarget.materialName}</p>
								<p>Dimensions: {mergeTarget.dimensions}</p>
								<p>Unit: {mergeTarget.unitName}</p>
								<p>
									Keep variant:{" "}
									<span className="font-medium text-neutral-900">
										{getKeepVariant(mergeTarget)?.variant_name || "—"}
									</span>
								</p>
								<p>
									Duplicates to delete:{" "}
									<span className="font-medium text-neutral-900">
										{getDeleteIds(mergeTarget).length}
									</span>
								</p>
							</div>
							{mergeError && (
								<div className="mt-4 text-sm text-danger-600">{mergeError}</div>
							)}
							<div className="flex items-center justify-end gap-3 mt-6">
								<button
									onClick={() => setMergeTarget(null)}
									className="px-4 py-2 border border-neutral-200 rounded-lg text-neutral-700 hover:bg-neutral-50"
									disabled={mergeMutation.isPending}
								>
									Cancel
								</button>
								<button
									onClick={() => {
										const keepId =
											selectionByGroup[mergeTarget.key] ||
											mergeTarget.variants[0]?.id;
										const deleteIds = getDeleteIds(mergeTarget);
										if (!keepId || deleteIds.length === 0) {
											setMergeTarget(null);
											return;
										}
										mergeMutation.mutate({ keepId, deleteIds });
									}}
									className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-60"
									disabled={mergeMutation.isPending}
								>
									{mergeMutation.isPending ? "Merging..." : "Confirm merge"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</InventoryDuplicatesErrorBoundary>
	);
}

function formatDimensions(
	variant: Pick<MaterialVariant, "length" | "width" | "thickness">,
) {
	const { length, width, thickness } = variant;
	if (length || width || thickness) {
		return `${length ?? "—"} × ${width ?? "—"} × ${thickness ?? "—"}`;
	}
	return "—";
}

function shortId(id: string) {
	return id.slice(0, 8);
}
