import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Boxes,
	ChevronLeft,
	ChevronRight,
	Copy,
	Loader2,
	Mail,
	Package,
	Plus,
	Save,
	Search,
	Trash2,
	Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MaterialsTable } from "../components/inventory/MaterialsTable";
import { SuppliersTable } from "../components/inventory/SuppliersTable";
import type {
	Material,
	MaterialVariant,
	Supplier,
	TabType,
	TagItem,
	Unit,
	VariantTag,
} from "../components/inventory/types";
import { VariantsTable } from "../components/inventory/VariantsTable";
import { Sidebar } from "../components/Sidebar";
import { InventoryCommunicationsTab } from "../features/inventory-communications/components/InventoryCommunicationsTab";
import type { VariantCommunicationItem } from "../features/inventory-communications/types";
import { useAuth } from "../hooks/useAuth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/inventory")({
	component: InventoryPage,
});

function InventoryPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<TabType>("materials");
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [page, setPage] = useState(1);
	const [editData, setEditData] = useState<any>({});
	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<"create" | "edit" | "delete">(
		"edit",
	);
	const [modalEntity, setModalEntity] = useState<TabType | null>(null);
	const [modalItem, setModalItem] = useState<any>(null);
	const [modalError, setModalError] = useState<string | null>(null);
	const [deleteImpact, setDeleteImpact] = useState({
		variants: 0,
		supplierPricings: 0,
		orderRefs: 0,
		supplierRefs: 0,
	});
	const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
	const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(
		new Set(),
	);
	const [newTagName, setNewTagName] = useState("");
	const [variantCreateStep, setVariantCreateStep] = useState<
		"variant" | "material" | "pricing"
	>("variant");
	const [visitedVariantSteps, setVisitedVariantSteps] = useState({
		variant: true,
		material: false,
		pricing: false,
	});
	const perPage = 15;

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [user, authLoading, navigate]);

	// Fetch materials with variants and supplier pricing
	const { data: materialsData, isLoading: materialsLoading } = useQuery({
		queryKey: ["materials-with-variants"],
		queryFn: async () => {
			// Fetch base materials
			const { data: mats, error: matsErr } = await supabase
				.from("materials")
				.select("id, name, description, unit_id, created_at")
				.order("name");
			if (matsErr) throw matsErr;

			// Fetch units
			const { data: unitsData, error: unitsErr } = await supabase
				.from("units_of_measure")
				.select("id, name, description");
			if (unitsErr) throw unitsErr;
			const unitMap = new Map((unitsData || []).map((u: Unit) => [u.id, u]));

			// Fetch all variants
			const matIds = (mats || []).map((m: Material) => m.id);
			let variants: any[] = [];
			let variantPricing: any[] = [];
			const variantTagsMap = new Map<string, VariantTag[]>();

			if (matIds.length > 0) {
				const { data: vars, error: varsErr } = await supabase
					.from("material_variants")
					.select(
						"id, material_id, variant_name, description, unit_id, attributes, length, width, thickness, weight_per_unit, created_at",
					)
					.in("material_id", matIds);
				if (varsErr) throw varsErr;
				variants = vars || [];

				// Fetch supplier pricing for all variants
				const variantIds = variants.map((v: MaterialVariant) => v.id);
				if (variantIds.length > 0) {
					const { data: pricing, error: pricingErr } = await supabase
						.from("supplier_pricing")
						.select(`
              id,
              material_variant_id,
              supplier_id,
              price,
              price_per_unit,
              supplier_quantity,
			  suppliers_reference,
              updated_at,
              suppliers (
                id,
                name,
								contact_person,
				email
              )
            `)
						.in("material_variant_id", variantIds)
						.order("price");
					if (!pricingErr) {
						variantPricing = pricing || [];
					}

					// Fetch variant tags
					const { data: variantTags, error: variantTagsErr } = await supabase
						.from("material_variant_tags")
						.select("material_variant_id, tag_id, tags(id, name)")
						.in("material_variant_id", variantIds);
					if (!variantTagsErr && variantTags) {
						variantTags.forEach((vt: any) => {
							const arr = variantTagsMap.get(vt.material_variant_id) || [];
							arr.push({ tag_id: vt.tag_id, tags: vt.tags });
							variantTagsMap.set(vt.material_variant_id, arr);
						});
					}
				}
			}

			// Assemble materials with variants and pricing
			const materialRows = (mats || []).map((m: any) => {
				const materialVariants = variants
					.filter((v: any) => v.material_id === m.id)
					.map((v: any) => ({
						...v,
						unit: v.unit_id ? unitMap.get(v.unit_id) : null,
						supplier_pricing: variantPricing.filter(
							(p: any) => p.material_variant_id === v.id,
						),
						material_variant_tags: variantTagsMap.get(v.id) || [],
					}));

				return {
					...m,
					unit: m.unit_id ? unitMap.get(m.unit_id) : null,
					material_variants: materialVariants,
				};
			});

			return materialRows as Material[];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	// Fetch suppliers
	const { data: suppliers, isLoading: suppliersLoading } = useQuery({
		queryKey: ["suppliers"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("suppliers")
				.select("*")
				.order("name");
			if (error) throw error;
			return data as Supplier[];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const { data: tags = [] } = useQuery({
		queryKey: ["tags"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("tags")
				.select("id, name")
				.order("name");
			if (error) throw error;
			return data as TagItem[];
		},
		enabled: !!user,
		staleTime: 60000,
	});

	// Fetch units for dropdown - TODO: implement unit editing
	const { data: units = [] } = useQuery({
		queryKey: ["units"],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("units_of_measure")
				.select("id, name, description")
				.order("name");
			if (error) throw error;
			return data as Unit[];
		},
		enabled: !!user,
		staleTime: 60000,
	});

	const updateMaterial = useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<Material>;
		}) => {
			const { error } = await supabase
				.from("materials")
				.update(updates)
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
			setModalOpen(false);
		},
	});

	const updateVariant = useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<MaterialVariant>;
		}) => {
			const { error } = await supabase
				.from("material_variants")
				.update(updates)
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
		},
	});

	// Update supplier mutation
	const updateSupplier = useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: Partial<Supplier>;
		}) => {
			const { error } = await supabase
				.from("suppliers")
				.update(updates)
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			setModalOpen(false);
		},
	});

	const deleteMaterial = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("materials").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
			setModalOpen(false);
		},
	});

	const deleteVariant = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase
				.from("material_variants")
				.delete()
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["materials-with-variants"] });
			setModalOpen(false);
		},
	});

	const deleteSupplier = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await supabase.from("suppliers").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			setModalOpen(false);
		},
	});

	// Filter materials based on search (also search in variants)
	const filteredMaterials = useMemo(() => {
		if (!materialsData) return [];
		const searchLower = debouncedSearch.toLowerCase();
		return materialsData.filter((m) => {
			const matchesMaterial =
				m.name.toLowerCase().includes(searchLower) ||
				m.description?.toLowerCase().includes(searchLower);
			const matchesVariant = m.material_variants?.some(
				(v) =>
					v.variant_name.toLowerCase().includes(searchLower) ||
					v.description?.toLowerCase().includes(searchLower),
			);
			return matchesMaterial || matchesVariant;
		});
	}, [materialsData, debouncedSearch]);

	// Flatten all variants for the Variants tab with material info attached
	const allVariants = useMemo(() => {
		if (!materialsData) return [];
		const variants: (MaterialVariant & { material?: Material })[] = [];
		materialsData.forEach((m) => {
			m.material_variants?.forEach((v) => {
				variants.push({
					...v,
					material: {
						id: m.id,
						name: m.name,
						description: m.description,
						unit_id: m.unit_id,
						created_at: m.created_at,
						unit: m.unit,
					},
				});
			});
		});
		return variants;
	}, [materialsData]);

	// Filter variants for the Variants tab
	const filteredVariants = useMemo(() => {
		if (!allVariants) return [];
		const searchLower = debouncedSearch.toLowerCase();
		return allVariants.filter(
			(v) =>
				v.variant_name.toLowerCase().includes(searchLower) ||
				v.description?.toLowerCase().includes(searchLower) ||
				v.material?.name.toLowerCase().includes(searchLower) ||
				v.material_variant_tags?.some((t) =>
					t.tags?.name.toLowerCase().includes(searchLower),
				),
		);
	}, [allVariants, debouncedSearch]);

	const filteredSuppliers = useMemo(() => {
		if (!suppliers) return [];
		const searchLower = debouncedSearch.toLowerCase();
		return suppliers.filter(
			(s) =>
				s.name.toLowerCase().includes(searchLower) ||
				s.contact_person?.toLowerCase().includes(searchLower) ||
				s.email?.toLowerCase().includes(searchLower),
		);
	}, [suppliers, debouncedSearch]);

	const communicationVariants = useMemo((): VariantCommunicationItem[] => {
		return allVariants
			.map((variant) => ({
				variantId: variant.id,
				variantName: variant.variant_name,
				materialName: variant.material?.name ?? "Unknown material",
				description: variant.description ?? null,
				unitName: variant.unit?.name ?? variant.material?.unit?.name ?? null,
				length: variant.length ?? null,
				width: variant.width ?? null,
				thickness: variant.thickness ?? null,
				suppliers:
					variant.supplier_pricing?.map((pricing) => ({
						pricingId: pricing.id,
						supplierId: pricing.supplier_id,
						supplierName: pricing.suppliers?.name ?? "Unknown supplier",
						supplierEmail: pricing.suppliers?.email ?? null,
						pricePerUnit: pricing.price_per_unit ?? null,
						price: pricing.price ?? null,
						supplierQuantity: pricing.supplier_quantity ?? null,
					})) ?? [],
			}))
			.filter((variant) => variant.suppliers.length > 0);
	}, [allVariants]);

	// Pagination helpers
	const getCurrentData = () => {
		switch (activeTab) {
			case "materials":
				return filteredMaterials;
			case "variants":
				return filteredVariants;
			case "suppliers":
				return filteredSuppliers;
			case "communications":
				return [];
			default:
				return [];
		}
	};

	const currentData = getCurrentData();
	const totalPages = Math.ceil(currentData.length / perPage);
	const paginatedData = currentData.slice((page - 1) * perPage, page * perPage);

	const isLoading =
		activeTab === "materials"
			? materialsLoading
			: activeTab === "variants"
				? materialsLoading
				: activeTab === "suppliers"
					? suppliersLoading
					: materialsLoading;

	// Toggle expanded state for a material
	const toggleMaterialExpand = (materialId: string) => {
		setExpandedMaterials((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(materialId)) {
				newSet.delete(materialId);
			} else {
				newSet.add(materialId);
			}
			return newSet;
		});
	};

	const openEditModal = (entity: TabType, item: any) => {
		setModalEntity(entity);
		setModalMode("edit");
		setModalItem(item);
		if (entity === "variants") {
			const pricing = item?.supplier_pricing?.[0] || null;
			const rawAttributes =
				item?.attributes && typeof item.attributes === "object"
					? item.attributes
					: {};
			const attributeRows = Object.entries(rawAttributes).map(
				([property, value]) => ({
					property,
					value: String(value ?? ""),
				}),
			);
			setEditData({
				...item,
				tag_ids:
					item?.material_variant_tags?.map((t: VariantTag) => t.tag_id) || [],
				attribute_rows: attributeRows,
				supplier_pricing_id: pricing?.id || null,
				supplier_id: pricing?.supplier_id || "",
				supplier_quantity: pricing?.supplier_quantity ?? "",
				price: pricing?.price ?? "",
				price_per_unit: pricing?.price_per_unit ?? "",
				suppliers_reference: pricing?.suppliers_reference ?? "",
			});
		} else {
			setEditData({ ...item });
		}
		setNewTagName("");
		setVariantCreateStep("variant");
		setVisitedVariantSteps({
			variant: true,
			material: false,
			pricing: false,
		});
		setModalError(null);
		setModalOpen(true);
	};

	const openCreateModal = (entity: "materials" | "variants" | "suppliers") => {
		setModalEntity(entity);
		setModalMode("create");
		setModalItem(null);
		if (entity === "materials") {
			setEditData({
				name: "",
				description: "",
				unit_id: "",
				tag_ids: [],
			});
		}
		if (entity === "variants") {
			setEditData({
				material_id: "",
				new_material_name: "",
				new_material_description: "",
				new_material_unit_id: "",
				variant_name: "",
				description: "",
				unit_id: "",
				length: "",
				width: "",
				thickness: "",
				weight_per_unit: "",
				attribute_rows: [],
				tag_ids: [],
				supplier_id: "",
				supplier_quantity: "",
				price: "",
				price_per_unit: "",
				suppliers_reference: "",
			});
		}
		if (entity === "suppliers") {
			setEditData({
				name: "",
				contact_person: "",
				email: "",
				phone: "",
				address: "",
				other_info: "",
			});
		}
		setNewTagName("");
		setVariantCreateStep("variant");
		setVisitedVariantSteps({
			variant: true,
			material: false,
			pricing: false,
		});
		setModalError(null);
		setModalOpen(true);
	};

	const openDeleteModal = async (entity: TabType, item: any) => {
		setModalEntity(entity);
		setModalMode("delete");
		setModalItem(item);
		setModalError(null);
		setDeleteImpact({
			variants: 0,
			supplierPricings: 0,
			orderRefs: 0,
			supplierRefs: 0,
		});
		setDeleteImpactLoading(true);
		setModalOpen(true);

		try {
			if (entity === "materials") {
				const { data: variants } = await supabase
					.from("material_variants")
					.select("id", { count: "exact" })
					.eq("material_id", item.id);

				const variantIds = (variants || []).map((v: any) => v.id);
				const variantsCount = variantIds.length;

				let supplierPricingCount = 0;
				let orderRefsCount = 0;
				if (variantIds.length > 0) {
					const { count: pricingCount } = await supabase
						.from("supplier_pricing")
						.select("id", { count: "exact", head: true })
						.in("material_variant_id", variantIds);

					const { count: orderMatCount } = await supabase
						.from("order_package_materials")
						.select("id", { count: "exact", head: true })
						.in("material_variant_id", variantIds);

					const { count: beamCount } = await supabase
						.from("beam")
						.select("id", { count: "exact", head: true })
						.in("type", variantIds);

					const { count: templateCount } = await supabase
						.from("securing_template")
						.select("id", { count: "exact", head: true })
						.in("type_id", variantIds);

					supplierPricingCount = pricingCount || 0;
					orderRefsCount =
						(orderMatCount || 0) + (beamCount || 0) + (templateCount || 0);
				}

				setDeleteImpact({
					variants: variantsCount,
					supplierPricings: supplierPricingCount,
					orderRefs: orderRefsCount,
					supplierRefs: 0,
				});
			}

			if (entity === "variants") {
				const { count: pricingCount } = await supabase
					.from("supplier_pricing")
					.select("id", { count: "exact", head: true })
					.eq("material_variant_id", item.id);

				const { count: orderMatCount } = await supabase
					.from("order_package_materials")
					.select("id", { count: "exact", head: true })
					.eq("material_variant_id", item.id);

				const { count: beamCount } = await supabase
					.from("beam")
					.select("id", { count: "exact", head: true })
					.eq("type", item.id);

				const { count: templateCount } = await supabase
					.from("securing_template")
					.select("id", { count: "exact", head: true })
					.eq("type_id", item.id);

				setDeleteImpact({
					variants: 0,
					supplierPricings: pricingCount || 0,
					orderRefs:
						(orderMatCount || 0) + (beamCount || 0) + (templateCount || 0),
					supplierRefs: 0,
				});
			}

			if (entity === "suppliers") {
				const { count: pricingCount } = await supabase
					.from("supplier_pricing")
					.select("id", { count: "exact", head: true })
					.eq("supplier_id", item.id);

				setDeleteImpact({
					variants: 0,
					supplierPricings: 0,
					orderRefs: 0,
					supplierRefs: pricingCount || 0,
				});
			}
		} catch (_error) {
			setModalError("Unable to load deletion impact. Please try again.");
		} finally {
			setDeleteImpactLoading(false);
		}
	};

	const resolveDeleteError = (error: any) => {
		const message = error?.message?.toLowerCase?.() || "";
		if (message.includes("foreign key") || message.includes("violates")) {
			return "Cannot delete this item because it is referenced by existing orders or records. Please remove those references first.";
		}
		if (message.includes("permission")) {
			return "You do not have permission to delete this item. Please contact an administrator.";
		}
		return "Delete failed. Please try again or contact support.";
	};

	const toggleTagSelection = (tagId: string) => {
		const current = Array.isArray(editData.tag_ids) ? editData.tag_ids : [];
		const selected = current.includes(tagId);
		const next = selected
			? current.filter((id: string) => id !== tagId)
			: [...current, tagId];
		setEditData({ ...editData, tag_ids: next });
	};

	const handleAddTagToForm = async () => {
		const name = newTagName.trim();
		if (!name) return;

		const existing = tags.find(
			(tag) => tag.name.toLowerCase() === name.toLowerCase(),
		);
		if (existing) {
			toggleTagSelection(existing.id);
			setNewTagName("");
			return;
		}

		const { data, error } = await supabase
			.from("tags")
			.insert({ name })
			.select("id, name")
			.single();

		if (error) {
			setModalError(error.message || "Failed to create tag.");
			return;
		}

		queryClient.invalidateQueries({ queryKey: ["tags"] });
		const current = Array.isArray(editData.tag_ids) ? editData.tag_ids : [];
		setEditData({ ...editData, tag_ids: [...current, data.id] });
		setNewTagName("");
	};

	const addAttributeRow = () => {
		const current = Array.isArray(editData.attribute_rows)
			? editData.attribute_rows
			: [];
		setEditData({
			...editData,
			attribute_rows: [...current, { property: "", value: "" }],
		});
	};

	const updateAttributeRow = (
		index: number,
		field: "property" | "value",
		value: string,
	) => {
		const current = Array.isArray(editData.attribute_rows)
			? editData.attribute_rows
			: [];
		const next = current.map((row: any, idx: number) =>
			idx === index ? { ...row, [field]: value } : row,
		);
		setEditData({ ...editData, attribute_rows: next });
	};

	const removeAttributeRow = (index: number) => {
		const current = Array.isArray(editData.attribute_rows)
			? editData.attribute_rows
			: [];
		const next = current.filter((_: any, idx: number) => idx !== index);
		setEditData({ ...editData, attribute_rows: next });
	};

	const handleSaveEdit = async () => {
		if (!modalEntity || !modalItem) return;
		setModalError(null);

		const toNumber = (value: any) => {
			if (value === "" || value === null || value === undefined) return null;
			const num = Number(value);
			return Number.isFinite(num) ? num : null;
		};

		if (modalEntity === "materials") {
			updateMaterial.mutate({
				id: modalItem.id,
				updates: {
					name: editData.name,
					description: editData.description,
					unit_id: editData.unit_id || null,
				},
			});
		}

		if (modalEntity === "variants") {
			try {
				const attributeRows = Array.isArray(editData.attribute_rows)
					? editData.attribute_rows
					: [];
				const attributes = attributeRows.reduce(
					(acc: Record<string, string>, row: any) => {
						const property = String(row?.property || "").trim();
						if (!property) return acc;
						acc[property] = String(row?.value || "").trim();
						return acc;
					},
					{},
				);

				await updateVariant.mutateAsync({
					id: modalItem.id,
					updates: {
						variant_name: editData.variant_name,
						description: editData.description,
						unit_id: editData.unit_id || null,
						length: editData.length || null,
						width: editData.width || null,
						thickness: editData.thickness || null,
						weight_per_unit: editData.weight_per_unit || null,
						attributes: Object.keys(attributes).length > 0 ? attributes : null,
					},
				});

				const selectedTags = Array.isArray(editData.tag_ids)
					? editData.tag_ids
					: [];
				const { error: deleteTagsError } = await supabase
					.from("material_variant_tags")
					.delete()
					.eq("material_variant_id", modalItem.id);

				if (deleteTagsError) throw deleteTagsError;

				if (selectedTags.length > 0) {
					const tagRows = selectedTags.map((tagId: string) => ({
						material_variant_id: modalItem.id,
						tag_id: tagId,
					}));
					const { error: insertTagsError } = await supabase
						.from("material_variant_tags")
						.insert(tagRows);
					if (insertTagsError) throw insertTagsError;
				}

				if (editData.supplier_id) {
					const pricingPayload = {
						supplier_id: editData.supplier_id,
						material_variant_id: modalItem.id,
						supplier_quantity: toNumber(editData.supplier_quantity),
						price: toNumber(editData.price),
						price_per_unit: toNumber(editData.price_per_unit),
						suppliers_reference:
							String(editData.suppliers_reference || "").trim() || null,
					};

					if (editData.supplier_pricing_id) {
						const { error: pricingUpdateError } = await supabase
							.from("supplier_pricing")
							.update(pricingPayload)
							.eq("id", editData.supplier_pricing_id);
						if (pricingUpdateError) throw pricingUpdateError;
					} else {
						const { error: pricingInsertError } = await supabase
							.from("supplier_pricing")
							.insert(pricingPayload);
						if (pricingInsertError) throw pricingInsertError;
					}
				}

				queryClient.invalidateQueries({
					queryKey: ["materials-with-variants"],
				});
				setModalOpen(false);
			} catch (error: any) {
				setModalError(error?.message || "Update failed. Please try again.");
			}
		}

		if (modalEntity === "suppliers") {
			updateSupplier.mutate({
				id: modalItem.id,
				updates: {
					name: editData.name,
					contact_person: editData.contact_person,
					email: editData.email,
					phone: editData.phone,
					address: editData.address,
					other_info: editData.other_info,
				},
			});
		}
	};

	const handleCreateEntity = async () => {
		if (!modalEntity || modalMode !== "create") return;
		setModalError(null);

		const toNumber = (value: unknown): number | null => {
			if (value === "" || value === null || value === undefined) return null;
			const num = Number(value);
			return Number.isFinite(num) ? num : null;
		};

		try {
			if (modalEntity === "materials") {
				if (!String(editData.name || "").trim()) {
					setModalError("Material name is required.");
					return;
				}

				const { data: newMaterial, error } = await supabase
					.from("materials")
					.insert({
						name: String(editData.name).trim(),
						description: String(editData.description || "").trim() || null,
						unit_id: editData.unit_id || null,
					})
					.select("id")
					.single();
				if (error) throw error;

				const selectedTags = Array.isArray(editData.tag_ids)
					? (editData.tag_ids as string[])
					: [];
				if (selectedTags.length > 0) {
					const tagRows = selectedTags.map((tagId) => ({
						material_id: newMaterial.id,
						tag_id: tagId,
					}));
					const { error: tagsError } = await supabase
						.from("material_tags")
						.insert(tagRows);
					if (tagsError) throw tagsError;
				}

				queryClient.invalidateQueries({
					queryKey: ["materials-with-variants"],
				});
				setModalOpen(false);
				return;
			}

			if (modalEntity === "variants") {
				if (!String(editData.material_id || "").trim()) {
					setModalError("Material is required for a variant.");
					return;
				}
				if (!String(editData.variant_name || "").trim()) {
					setModalError("Variant name is required.");
					return;
				}

				let materialId = String(editData.material_id);
				if (materialId === "__new__") {
					if (!String(editData.new_material_name || "").trim()) {
						setModalError("New material name is required.");
						return;
					}

					const { data: newMaterial, error: materialError } = await supabase
						.from("materials")
						.insert({
							name: String(editData.new_material_name).trim(),
							description:
								String(editData.new_material_description || "").trim() || null,
							unit_id: editData.new_material_unit_id || null,
						})
						.select("id")
						.single();
					if (materialError) throw materialError;
					materialId = newMaterial.id;
				}

				const attributeRows = Array.isArray(editData.attribute_rows)
					? editData.attribute_rows
					: [];
				const attributes = attributeRows.reduce(
					(acc: Record<string, string>, row: any) => {
						const property = String(row?.property || "").trim();
						if (!property) return acc;
						acc[property] = String(row?.value || "").trim();
						return acc;
					},
					{},
				);

				const { data: newVariant, error: variantError } = await supabase
					.from("material_variants")
					.insert({
						material_id: materialId,
						variant_name: String(editData.variant_name).trim(),
						description: String(editData.description || "").trim() || null,
						unit_id: editData.unit_id || null,
						length: toNumber(editData.length),
						width: toNumber(editData.width),
						thickness: toNumber(editData.thickness),
						weight_per_unit: toNumber(editData.weight_per_unit),
						attributes: Object.keys(attributes).length > 0 ? attributes : null,
					})
					.select("id")
					.single();
				if (variantError) throw variantError;

				const selectedTags = Array.isArray(editData.tag_ids)
					? (editData.tag_ids as string[])
					: [];
				if (selectedTags.length > 0) {
					const tagRows = selectedTags.map((tagId) => ({
						material_variant_id: newVariant.id,
						tag_id: tagId,
					}));
					const { error: tagsError } = await supabase
						.from("material_variant_tags")
						.insert(tagRows);
					if (tagsError) throw tagsError;
				}

				if (editData.supplier_id) {
					const supplierQuantity = toNumber(editData.supplier_quantity);
					const price = toNumber(editData.price);
					const pricePerUnit = toNumber(editData.price_per_unit);

					if (price === null) {
						setModalError(
							"Price is required when supplier pricing is selected.",
						);
						return;
					}

					const { error: pricingError } = await supabase
						.from("supplier_pricing")
						.insert({
							supplier_id: editData.supplier_id,
							material_variant_id: newVariant.id,
							supplier_quantity: supplierQuantity ?? 1,
							price,
							price_per_unit: pricePerUnit ?? price,
							suppliers_reference:
								String(editData.suppliers_reference || "").trim() || null,
						});
					if (pricingError) throw pricingError;
				}

				queryClient.invalidateQueries({
					queryKey: ["materials-with-variants"],
				});
				setModalOpen(false);
				return;
			}

			if (modalEntity === "suppliers") {
				if (!String(editData.name || "").trim()) {
					setModalError("Supplier name is required.");
					return;
				}

				const { error } = await supabase.from("suppliers").insert({
					name: String(editData.name).trim(),
					contact_person: String(editData.contact_person || "").trim() || null,
					email: String(editData.email || "").trim() || null,
					phone: String(editData.phone || "").trim() || null,
					address: String(editData.address || "").trim() || null,
					other_info: String(editData.other_info || "").trim() || null,
				});
				if (error) throw error;

				queryClient.invalidateQueries({ queryKey: ["suppliers"] });
				setModalOpen(false);
			}
		} catch (error: any) {
			setModalError(error?.message || "Create failed. Please try again.");
		}
	};

	const handleDeleteConfirm = async () => {
		if (!modalEntity || !modalItem) return;
		setModalError(null);

		try {
			if (modalEntity === "materials") {
				await deleteMaterial.mutateAsync(modalItem.id);
			}
			if (modalEntity === "variants") {
				await deleteVariant.mutateAsync(modalItem.id);
			}
			if (modalEntity === "suppliers") {
				await deleteSupplier.mutateAsync(modalItem.id);
			}
		} catch (error) {
			setModalError(resolveDeleteError(error));
		}
	};

	// Count total variants across all materials
	const totalVariantsCount = useMemo(() => {
		if (!materialsData) return 0;
		return materialsData.reduce(
			(acc, m) => acc + (m.material_variants?.length || 0),
			0,
		);
	}, [materialsData]);

	const tabs = [
		{
			id: "materials" as TabType,
			label: "Materials",
			icon: Package,
			count: materialsData?.length || 0,
			subCount: totalVariantsCount,
		},
		{
			id: "variants" as TabType,
			label: "Material Variants",
			icon: Boxes,
			count: totalVariantsCount,
		},
		{
			id: "suppliers" as TabType,
			label: "Suppliers",
			icon: Truck,
			count: suppliers?.length || 0,
		},
		{
			id: "communications" as TabType,
			label: "Supplier Emails",
			icon: Mail,
			count: communicationVariants.length,
		},
	];

	// Format date safely
	const formatDate = (dateStr: string | undefined | null) => {
		if (!dateStr) return "—";
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return "—";
		return date.toLocaleDateString();
	};

	const isVariantCreateWizard =
		modalMode === "create" && modalEntity === "variants";
	const isInlineMaterialRequested = editData.material_id === "__new__";
	const isVariantStepComplete =
		Boolean(String(editData.variant_name || "").trim()) &&
		Boolean(editData.unit_id) &&
		Boolean(editData.material_id);
	const isMaterialStepComplete =
		visitedVariantSteps.material &&
		(!isInlineMaterialRequested ||
			Boolean(String(editData.new_material_name || "").trim()));
	const hasSupplierSelected = Boolean(editData.supplier_id);
	const isPricingStepComplete =
		visitedVariantSteps.pricing &&
		(!hasSupplierSelected || Boolean(String(editData.price ?? "").trim()));

	const handleVariantWizardNext = () => {
		setModalError(null);
		if (variantCreateStep === "variant") {
			if (!isVariantStepComplete) {
				setModalError(
					"Complete required Variant fields (material, variant name, unit) to continue.",
				);
				return;
			}
			if (isInlineMaterialRequested) {
				setVisitedVariantSteps((previous) => ({
					...previous,
					material: true,
				}));
				setVariantCreateStep("material");
				return;
			}
			setVisitedVariantSteps((previous) => ({
				...previous,
				pricing: true,
			}));
			setVariantCreateStep("pricing");
			return;
		}

		if (variantCreateStep === "material") {
			if (!isMaterialStepComplete) {
				setModalError("New material name is required.");
				return;
			}
			setVisitedVariantSteps((previous) => ({
				...previous,
				pricing: true,
			}));
			setVariantCreateStep("pricing");
		}
	};

	const handleVariantWizardBack = () => {
		setModalError(null);
		if (variantCreateStep === "pricing") {
			setVariantCreateStep(isInlineMaterialRequested ? "material" : "variant");
			return;
		}
		if (variantCreateStep === "material") {
			setVariantCreateStep("variant");
		}
	};

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
							<p className="text-gray-500 mt-1">
								Manage materials, variants, suppliers, and communication
							</p>
						</div>
						<div className="flex items-center gap-3">
							<Link
								to="/inventory-duplicates"
								className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<Copy className="w-4 h-4" />
								Variant Duplicates
							</Link>
							{activeTab !== "communications" && (
								<button
									onClick={() => {
										if (activeTab === "materials") {
											openCreateModal("materials");
											return;
										}
										if (activeTab === "variants") {
											openCreateModal("variants");
											return;
										}
										openCreateModal("suppliers");
									}}
									className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									<Plus className="w-5 h-5" />
									Add{" "}
									{activeTab === "materials"
										? "Material"
										: activeTab === "variants"
											? "Variant"
											: "Supplier"}
								</button>
							)}
						</div>
					</div>

					{/* Tabs */}
					<div className="flex gap-2 mb-6">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								onClick={() => {
									setActiveTab(tab.id);
									setPage(1);
									setSearch("");
									setExpandedMaterials(new Set());
								}}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
									activeTab === tab.id
										? "bg-blue-600 text-white"
										: "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
								}`}
							>
								<tab.icon className="w-4 h-4" />
								{tab.label}
								<span
									className={`px-2 py-0.5 rounded-full text-xs ${
										activeTab === tab.id ? "bg-blue-500" : "bg-gray-100"
									}`}
								>
									{tab.count}
								</span>
								{tab.subCount !== undefined && tab.subCount > 0 && (
									<span
										className={`px-2 py-0.5 rounded-full text-xs ${
											activeTab === tab.id
												? "bg-blue-400"
												: "bg-gray-50 text-gray-500"
										}`}
									>
										{tab.subCount} variants
									</span>
								)}
							</button>
						))}
					</div>

					{activeTab !== "communications" && (
						<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
							<div className="relative max-w-md">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder={`Search ${activeTab}...`}
									value={search}
									onChange={(e) => {
										setSearch(e.target.value);
										setPage(1);
									}}
									className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
					)}

					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
							</div>
						) : activeTab === "communications" ? (
							<InventoryCommunicationsTab
								variants={communicationVariants}
								requesterUserId={user?.id ?? ""}
							/>
						) : paginatedData.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12">
								<Package className="w-12 h-12 text-gray-300 mb-4" />
								<p className="text-gray-500">No {activeTab} found</p>
							</div>
						) : (
							<>
								<div className="overflow-x-auto">
									{activeTab === "materials" && (
										<MaterialsTable
											materials={paginatedData as Material[]}
											expandedMaterials={expandedMaterials}
											onToggleExpand={toggleMaterialExpand}
											onEditMaterial={(material) =>
												openEditModal("materials", material)
											}
											onDeleteMaterial={(material) =>
												openDeleteModal("materials", material)
											}
											onEditVariant={(variant) =>
												openEditModal("variants", variant)
											}
											onDeleteVariant={(variant) =>
												openDeleteModal("variants", variant)
											}
											formatDate={formatDate}
										/>
									)}

									{activeTab === "variants" && (
										<VariantsTable
											variants={
												paginatedData as (MaterialVariant & {
													material?: Material;
												})[]
											}
											onEditVariant={(variant) =>
												openEditModal("variants", variant)
											}
											onDeleteVariant={(variant) =>
												openDeleteModal("variants", variant)
											}
											formatDate={formatDate}
										/>
									)}

									{activeTab === "suppliers" && (
										<SuppliersTable
											suppliers={paginatedData as Supplier[]}
											onEditSupplier={(supplier) =>
												openEditModal("suppliers", supplier)
											}
											onDeleteSupplier={(supplier) =>
												openDeleteModal("suppliers", supplier)
											}
										/>
									)}
								</div>

								{/* Pagination */}
								<div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
									<p className="text-sm text-gray-500">
										Showing {(page - 1) * perPage + 1} to{" "}
										{Math.min(page * perPage, currentData.length)} of{" "}
										{currentData.length}
									</p>
									<div className="flex items-center gap-3">
										<button
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page === 1}
											className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<ChevronLeft className="w-4 h-4" />
											Previous
										</button>
										<span className="text-sm text-gray-600 font-medium">
											Page {page} of {totalPages || 1}
										</span>
										<button
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={page >= totalPages}
											className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											Next
											<ChevronRight className="w-4 h-4" />
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</main>

			<Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
					<Dialog.Content
						className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full ${
							isVariantCreateWizard ? "max-w-3xl" : "max-w-xl"
						} max-h-[88vh] overflow-y-auto bg-white rounded-xl shadow-2xl p-6`}
					>
						<Dialog.Title className="text-lg font-semibold text-gray-900">
							{modalMode === "create"
								? "Create"
								: modalMode === "edit"
									? "Edit"
									: "Delete"}{" "}
							{modalEntity === "materials"
								? "Material"
								: modalEntity === "variants"
									? "Variant"
									: "Supplier"}
						</Dialog.Title>
						<Dialog.Description className="text-sm text-gray-500 mb-4">
							{modalMode === "create"
								? "Add a new record with the required details below."
								: modalMode === "edit"
									? "Update the fields below and save your changes."
									: "Review what will be deleted before confirming."}
						</Dialog.Description>

						{(modalMode === "create" || modalMode === "edit") &&
							modalEntity &&
							(modalMode === "create" || modalItem) && (
								<div className="space-y-4">
									{modalEntity === "materials" && (
										<>
											<div>
												<label
													htmlFor="edit-material-name"
													className="text-xs text-gray-500"
												>
													Name
												</label>
												<input
													id="edit-material-name"
													type="text"
													value={editData.name || ""}
													onChange={(e) =>
														setEditData({ ...editData, name: e.target.value })
													}
													className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
												/>
											</div>
											<div>
												<label
													htmlFor="edit-material-description"
													className="text-xs text-gray-500"
												>
													Description
												</label>
												<textarea
													id="edit-material-description"
													value={editData.description || ""}
													onChange={(e) =>
														setEditData({
															...editData,
															description: e.target.value,
														})
													}
													className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													rows={3}
												/>
											</div>
											<div>
												<label
													htmlFor="edit-material-unit"
													className="text-xs text-gray-500"
												>
													Unit
												</label>
												<select
													id="edit-material-unit"
													value={editData.unit_id || ""}
													onChange={(e) =>
														setEditData({
															...editData,
															unit_id: e.target.value,
														})
													}
													className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
												>
													<option value="">No unit</option>
													{units.map((unit) => (
														<option key={unit.id} value={unit.id}>
															{unit.name}
														</option>
													))}
												</select>
											</div>
											{modalMode === "create" && (
												<div>
													<p className="text-xs text-gray-500">Tags</p>
													<div className="mt-2 flex gap-2">
														<input
															type="text"
															value={newTagName}
															onChange={(e) => setNewTagName(e.target.value)}
															placeholder="New tag name"
															className="flex-1 px-3 py-2 border rounded-lg text-sm"
														/>
														<button
															type="button"
															onClick={handleAddTagToForm}
															className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
														>
															Add
														</button>
													</div>
													<div className="mt-2 flex flex-wrap gap-2">
														{tags.map((tag) => {
															const selected = (
																editData.tag_ids || []
															).includes(tag.id);
															return (
																<button
																	type="button"
																	key={tag.id}
																	onClick={() => toggleTagSelection(tag.id)}
																	className={`px-3 py-1.5 rounded-full text-sm border ${
																		selected
																			? "bg-blue-100 border-blue-300 text-blue-800"
																			: "bg-gray-50 border-gray-200 text-gray-700"
																	}`}
																>
																	{tag.name}
																</button>
															);
														})}
													</div>
												</div>
											)}
										</>
									)}

									{modalEntity === "variants" &&
										(modalMode === "create" ? (
											<>
												<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
													<div className="grid grid-cols-3 gap-2">
														{[
															{
																key: "variant",
																label: "1) Variant",
																complete: isVariantStepComplete,
															},
															{
																key: "material",
																label: "2) Material",
																complete: isMaterialStepComplete,
															},
															{
																key: "pricing",
																label: "3) Pricing",
																complete: isPricingStepComplete,
															},
														].map((step) => {
															const active = variantCreateStep === step.key;
															return (
																<button
																	type="button"
																	key={step.key}
																	onClick={() =>
																		(() => {
																			const nextStep = step.key as
																				| "variant"
																				| "material"
																				| "pricing";
																			setVisitedVariantSteps((previous) => ({
																				...previous,
																				[nextStep]: true,
																			}));
																			setVariantCreateStep(nextStep);
																		})()
																	}
																	className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
																		active
																			? "border-blue-400 bg-blue-50 text-blue-800"
																			: "border-gray-200 bg-white text-gray-700"
																	}`}
																>
																	<span>{step.label}</span>
																	{step.complete ? (
																		<span className="text-green-600 font-semibold">
																			✓
																		</span>
																	) : (
																		<span className="text-gray-300">○</span>
																	)}
																</button>
															);
														})}
													</div>
												</div>

												{variantCreateStep === "variant" && (
													<>
														<div>
															<label
																htmlFor="create-variant-material"
																className="text-xs text-gray-500"
															>
																Material *
															</label>
															<select
																id="create-variant-material"
																value={editData.material_id || ""}
																onChange={(e) =>
																	setEditData({
																		...editData,
																		material_id: e.target.value,
																	})
																}
																className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
															>
																<option value="">Select material</option>
																{(materialsData || []).map((material) => (
																	<option key={material.id} value={material.id}>
																		{material.name}
																	</option>
																))}
															</select>
															<p className="mt-1 text-xs text-gray-500">
																If you can’t find the material, continue to step
																2 and create it inline.
															</p>
															<button
																type="button"
																onClick={() => {
																	setEditData({
																		...editData,
																		material_id: "__new__",
																	});
																	setVariantCreateStep("material");
																}}
																className="mt-2 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
															>
																I need to create a material
															</button>
														</div>
														<div>
															<label
																htmlFor="edit-variant-name"
																className="text-xs text-gray-500"
															>
																Variant name *
															</label>
															<input
																id="edit-variant-name"
																type="text"
																value={editData.variant_name || ""}
																onChange={(e) =>
																	setEditData({
																		...editData,
																		variant_name: e.target.value,
																	})
																}
																className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
															/>
														</div>
														<div>
															<label
																htmlFor="create-variant-unit"
																className="text-xs text-gray-500"
															>
																Unit *
															</label>
															<select
																id="create-variant-unit"
																value={editData.unit_id || ""}
																onChange={(e) =>
																	setEditData({
																		...editData,
																		unit_id: e.target.value,
																	})
																}
																className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
															>
																<option value="">Select unit</option>
																{units.map((unit) => (
																	<option key={unit.id} value={unit.id}>
																		{unit.name}
																	</option>
																))}
															</select>
														</div>
														<div>
															<label
																htmlFor="edit-variant-description"
																className="text-xs text-gray-500"
															>
																Description
															</label>
															<textarea
																id="edit-variant-description"
																value={editData.description || ""}
																onChange={(e) =>
																	setEditData({
																		...editData,
																		description: e.target.value,
																	})
																}
																className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																rows={2}
															/>
														</div>
														<p className="text-xs text-gray-500">
															Optional dimensions, attributes, and tags are in
															step 3.
														</p>
													</>
												)}

												{variantCreateStep === "material" && (
													<div className="rounded-lg border border-gray-200 p-4 space-y-3">
														{isInlineMaterialRequested ? (
															<>
																<p className="text-xs font-medium text-gray-600">
																	Create material inline
																</p>
																<input
																	type="text"
																	value={editData.new_material_name || ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			new_material_name: e.target.value,
																		})
																	}
																	placeholder="Material name *"
																	className="w-full px-3 py-2 border rounded-lg text-sm"
																/>
																<textarea
																	value={
																		editData.new_material_description || ""
																	}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			new_material_description: e.target.value,
																		})
																	}
																	placeholder="Material description (optional)"
																	className="w-full px-3 py-2 border rounded-lg text-sm"
																	rows={2}
																/>
																<select
																	value={editData.new_material_unit_id || ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			new_material_unit_id: e.target.value,
																		})
																	}
																	className="w-full px-3 py-2 border rounded-lg text-sm"
																>
																	<option value="">No unit</option>
																	{units.map((unit) => (
																		<option key={unit.id} value={unit.id}>
																			{unit.name}
																		</option>
																	))}
																</select>
															</>
														) : (
															<div className="space-y-3">
																<p className="text-sm text-gray-600">
																	You selected an existing material. Step 2 is
																	optional.
																</p>
																<button
																	type="button"
																	onClick={() =>
																		(() => {
																			setVisitedVariantSteps((previous) => ({
																				...previous,
																				material: true,
																			}));
																			setEditData({
																				...editData,
																				material_id: "__new__",
																			});
																		})()
																	}
																	className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
																>
																	Switch to create new material
																</button>
															</div>
														)}
													</div>
												)}

												{variantCreateStep === "pricing" && (
													<div>
														<p className="text-xs text-gray-500">
															Supplier pricing (optional)
														</p>
														<div className="mt-2 space-y-3">
															<div>
																<label
																	htmlFor="create-variant-supplier"
																	className="text-xs text-gray-500"
																>
																	Supplier
																</label>
																<select
																	id="create-variant-supplier"
																	value={editData.supplier_id || ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			supplier_id: e.target.value,
																		})
																	}
																	className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																>
																	<option value="">No supplier</option>
																	{(suppliers || []).map((supplier) => (
																		<option
																			key={supplier.id}
																			value={supplier.id}
																		>
																			{supplier.name}
																		</option>
																	))}
																</select>
															</div>
															<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
																<div>
																	<label
																		htmlFor="create-variant-supplier-qty"
																		className="text-xs text-gray-500"
																	>
																		Supplier Qty
																	</label>
																	<input
																		id="create-variant-supplier-qty"
																		type="number"
																		value={editData.supplier_quantity ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				supplier_quantity: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
																<div>
																	<label
																		htmlFor="create-variant-price"
																		className="text-xs text-gray-500"
																	>
																		Price *
																	</label>
																	<input
																		id="create-variant-price"
																		type="number"
																		value={editData.price ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				price: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
																<div>
																	<label
																		htmlFor="create-variant-price-per-unit"
																		className="text-xs text-gray-500"
																	>
																		Price / Unit
																	</label>
																	<input
																		id="create-variant-price-per-unit"
																		type="number"
																		value={editData.price_per_unit ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				price_per_unit: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
																<div>
																	<label
																		htmlFor="create-variant-supplier-reference"
																		className="text-xs text-gray-500"
																	>
																		Supplier Reference
																	</label>
																	<input
																		id="create-variant-supplier-reference"
																		type="text"
																		value={editData.suppliers_reference ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				suppliers_reference: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
															</div>
															<p className="text-xs text-gray-400">
																Price is required only if you select a supplier.
																Otherwise this step can be skipped.
															</p>
															<div className="pt-2 border-t border-gray-200" />
															<p className="text-xs text-gray-500">
																Optional variant details
															</p>
															<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
																<div>
																	<label
																		htmlFor="create-variant-length"
																		className="text-xs text-gray-500"
																	>
																		Length
																	</label>
																	<input
																		id="create-variant-length"
																		type="number"
																		value={editData.length ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				length: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
																<div>
																	<label
																		htmlFor="create-variant-width"
																		className="text-xs text-gray-500"
																	>
																		Width
																	</label>
																	<input
																		id="create-variant-width"
																		type="number"
																		value={editData.width ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				width: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
																<div>
																	<label
																		htmlFor="create-variant-thickness"
																		className="text-xs text-gray-500"
																	>
																		Thickness
																	</label>
																	<input
																		id="create-variant-thickness"
																		type="number"
																		value={editData.thickness ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				thickness: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
																<div>
																	<label
																		htmlFor="create-variant-weight-per-unit"
																		className="text-xs text-gray-500"
																	>
																		Weight per unit
																	</label>
																	<input
																		id="create-variant-weight-per-unit"
																		type="number"
																		value={editData.weight_per_unit ?? ""}
																		onChange={(e) =>
																			setEditData({
																				...editData,
																				weight_per_unit: e.target.value,
																			})
																		}
																		className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	/>
																</div>
															</div>
															<div>
																<div className="flex items-center justify-between">
																	<p className="text-xs text-gray-500">
																		Attributes
																	</p>
																	<button
																		type="button"
																		onClick={addAttributeRow}
																		className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
																	>
																		+ Add
																	</button>
																</div>
																<div className="mt-2 space-y-2">
																	{(editData.attribute_rows || []).length ===
																		0 && (
																		<p className="text-xs text-gray-400">
																			No attributes added
																		</p>
																	)}
																	{(editData.attribute_rows || []).map(
																		(row: any, index: number) => (
																			<div
																				key={`${index}-${row.property || "attr"}`}
																				className="grid grid-cols-[1fr_1fr_auto] gap-2"
																			>
																				<input
																					type="text"
																					value={row.property || ""}
																					onChange={(e) =>
																						updateAttributeRow(
																							index,
																							"property",
																							e.target.value,
																						)
																					}
																					placeholder="Property"
																					className="px-3 py-2 border rounded-lg text-sm"
																				/>
																				<input
																					type="text"
																					value={row.value || ""}
																					onChange={(e) =>
																						updateAttributeRow(
																							index,
																							"value",
																							e.target.value,
																						)
																					}
																					placeholder="Value"
																					className="px-3 py-2 border rounded-lg text-sm"
																				/>
																				<button
																					type="button"
																					onClick={() =>
																						removeAttributeRow(index)
																					}
																					className="px-2 py-2 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
																				>
																					Remove
																				</button>
																			</div>
																		),
																	)}
																</div>
															</div>
															<div>
																<p className="text-xs text-gray-500">Tags</p>
																<div className="mt-2 flex gap-2">
																	<input
																		type="text"
																		value={newTagName}
																		onChange={(e) =>
																			setNewTagName(e.target.value)
																		}
																		placeholder="New tag name"
																		className="flex-1 px-3 py-2 border rounded-lg text-sm"
																	/>
																	<button
																		type="button"
																		onClick={handleAddTagToForm}
																		className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
																	>
																		Add
																	</button>
																</div>
																<div className="mt-2 grid grid-cols-2 gap-2">
																	{tags.map((tag) => {
																		const selected = (
																			editData.tag_ids || []
																		).includes(tag.id);
																		return (
																			<label
																				key={tag.id}
																				className="flex items-center gap-2 text-sm text-gray-700"
																			>
																				<input
																					type="checkbox"
																					checked={selected}
																					onChange={() =>
																						toggleTagSelection(tag.id)
																					}
																					className="rounded border-gray-300"
																				/>
																				{tag.name}
																			</label>
																		);
																	})}
																</div>
															</div>
														</div>
													</div>
												)}
											</>
										) : (
											<>
												<div>
													<label
														htmlFor="edit-variant-name"
														className="text-xs text-gray-500"
													>
														Variant name
													</label>
													<input
														id="edit-variant-name"
														type="text"
														value={editData.variant_name || ""}
														onChange={(e) =>
															setEditData({
																...editData,
																variant_name: e.target.value,
															})
														}
														className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													/>
												</div>
												<div>
													<label
														htmlFor="edit-variant-description"
														className="text-xs text-gray-500"
													>
														Description
													</label>
													<textarea
														id="edit-variant-description"
														value={editData.description || ""}
														onChange={(e) =>
															setEditData({
																...editData,
																description: e.target.value,
															})
														}
														className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
														rows={3}
													/>
												</div>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
													<div>
														<label
															htmlFor="edit-variant-length"
															className="text-xs text-gray-500"
														>
															Length
														</label>
														<input
															id="edit-variant-length"
															type="number"
															value={editData.length ?? ""}
															onChange={(e) =>
																setEditData({
																	...editData,
																	length: e.target.value,
																})
															}
															className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
														/>
													</div>
													<div>
														<label
															htmlFor="edit-variant-width"
															className="text-xs text-gray-500"
														>
															Width
														</label>
														<input
															id="edit-variant-width"
															type="number"
															value={editData.width ?? ""}
															onChange={(e) =>
																setEditData({
																	...editData,
																	width: e.target.value,
																})
															}
															className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
														/>
													</div>
													<div>
														<label
															htmlFor="edit-variant-thickness"
															className="text-xs text-gray-500"
														>
															Thickness
														</label>
														<input
															id="edit-variant-thickness"
															type="number"
															value={editData.thickness ?? ""}
															onChange={(e) =>
																setEditData({
																	...editData,
																	thickness: e.target.value,
																})
															}
															className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
														/>
													</div>
													<div>
														<label
															htmlFor="edit-variant-weight-per-unit"
															className="text-xs text-gray-500"
														>
															Weight per unit
														</label>
														<input
															id="edit-variant-weight-per-unit"
															type="number"
															value={editData.weight_per_unit ?? ""}
															onChange={(e) =>
																setEditData({
																	...editData,
																	weight_per_unit: e.target.value,
																})
															}
															className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
														/>
													</div>
													<div>
														<label
															htmlFor="edit-variant-unit"
															className="text-xs text-gray-500"
														>
															Unit
														</label>
														<select
															id="edit-variant-unit"
															value={editData.unit_id || ""}
															onChange={(e) =>
																setEditData({
																	...editData,
																	unit_id: e.target.value,
																})
															}
															className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
														>
															<option value="">No unit</option>
															{units.map((unit) => (
																<option key={unit.id} value={unit.id}>
																	{unit.name}
																</option>
															))}
														</select>
													</div>
												</div>
												<div>
													<div className="flex items-center justify-between">
														<p className="text-xs text-gray-500">Attributes</p>
														<button
															type="button"
															onClick={addAttributeRow}
															className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
														>
															+ Add
														</button>
													</div>
													<div className="mt-2 space-y-2">
														{(editData.attribute_rows || []).length === 0 && (
															<p className="text-xs text-gray-400">
																No attributes added
															</p>
														)}
														{(editData.attribute_rows || []).map(
															(row: any, index: number) => (
																<div
																	key={`${index}-${row.property || "attr"}`}
																	className="grid grid-cols-[1fr_1fr_auto] gap-2"
																>
																	<input
																		type="text"
																		value={row.property || ""}
																		onChange={(e) =>
																			updateAttributeRow(
																				index,
																				"property",
																				e.target.value,
																			)
																		}
																		placeholder="Property"
																		className="px-3 py-2 border rounded-lg text-sm"
																	/>
																	<input
																		type="text"
																		value={row.value || ""}
																		onChange={(e) =>
																			updateAttributeRow(
																				index,
																				"value",
																				e.target.value,
																			)
																		}
																		placeholder="Value"
																		className="px-3 py-2 border rounded-lg text-sm"
																	/>
																	<button
																		type="button"
																		onClick={() => removeAttributeRow(index)}
																		className="px-2 py-2 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
																	>
																		Remove
																	</button>
																</div>
															),
														)}
													</div>
												</div>
												<div>
													<p className="text-xs text-gray-500">Tags</p>
													<div className="mt-2 grid grid-cols-2 gap-2">
														{tags.length === 0 && (
															<p className="text-xs text-gray-400">
																No tags available
															</p>
														)}
														{tags.map((tag) => {
															const selected = (
																editData.tag_ids || []
															).includes(tag.id);
															return (
																<label
																	key={tag.id}
																	className="flex items-center gap-2 text-sm text-gray-700"
																>
																	<input
																		type="checkbox"
																		checked={selected}
																		onChange={() => toggleTagSelection(tag.id)}
																		className="rounded border-gray-300"
																	/>
																	{tag.name}
																</label>
															);
														})}
													</div>
												</div>
												<div>
													<p className="text-xs text-gray-500">
														Supplier pricing
													</p>
													<div className="mt-2 space-y-3">
														<div>
															<label
																htmlFor="edit-variant-supplier"
																className="text-xs text-gray-500"
															>
																Supplier
															</label>
															<select
																id="edit-variant-supplier"
																value={editData.supplier_id || ""}
																onChange={(e) =>
																	setEditData({
																		...editData,
																		supplier_id: e.target.value,
																	})
																}
																className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
															>
																<option value="">No supplier</option>
																{(suppliers || []).map((supplier) => (
																	<option key={supplier.id} value={supplier.id}>
																		{supplier.name}
																	</option>
																))}
															</select>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
															<div>
																<label
																	htmlFor="edit-variant-supplier-qty"
																	className="text-xs text-gray-500"
																>
																	Supplier Qty
																</label>
																<input
																	id="edit-variant-supplier-qty"
																	type="number"
																	value={editData.supplier_quantity ?? ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			supplier_quantity: e.target.value,
																		})
																	}
																	className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																/>
															</div>
															<div>
																<label
																	htmlFor="edit-variant-price"
																	className="text-xs text-gray-500"
																>
																	Price
																</label>
																<input
																	id="edit-variant-price"
																	type="number"
																	value={editData.price ?? ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			price: e.target.value,
																		})
																	}
																	className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																/>
															</div>
															<div>
																<label
																	htmlFor="edit-variant-price-per-unit"
																	className="text-xs text-gray-500"
																>
																	Price / Unit
																</label>
																<input
																	id="edit-variant-price-per-unit"
																	type="number"
																	value={editData.price_per_unit ?? ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			price_per_unit: e.target.value,
																		})
																	}
																	className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																/>
															</div>
															<div>
																<label
																	htmlFor="edit-variant-supplier-reference"
																	className="text-xs text-gray-500"
																>
																	Supplier Reference
																</label>
																<input
																	id="edit-variant-supplier-reference"
																	type="text"
																	value={editData.suppliers_reference ?? ""}
																	onChange={(e) =>
																		setEditData({
																			...editData,
																			suppliers_reference: e.target.value,
																		})
																	}
																	className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
																	placeholder="Optional supplier reference"
																/>
															</div>
														</div>
														<p className="text-xs text-gray-400">
															Save to update the first supplier pricing entry
															for this variant.
														</p>
													</div>
												</div>
											</>
										))}

									{modalEntity === "suppliers" && (
										<>
											<div>
												<label
													htmlFor="edit-supplier-name"
													className="text-xs text-gray-500"
												>
													Name
												</label>
												<input
													id="edit-supplier-name"
													type="text"
													value={editData.name || ""}
													onChange={(e) =>
														setEditData({ ...editData, name: e.target.value })
													}
													className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
												/>
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
												<div>
													<label
														htmlFor="edit-supplier-contact"
														className="text-xs text-gray-500"
													>
														Contact person
													</label>
													<input
														id="edit-supplier-contact"
														type="text"
														value={editData.contact_person || ""}
														onChange={(e) =>
															setEditData({
																...editData,
																contact_person: e.target.value,
															})
														}
														className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													/>
												</div>
												<div>
													<label
														htmlFor="edit-supplier-email"
														className="text-xs text-gray-500"
													>
														Email
													</label>
													<input
														id="edit-supplier-email"
														type="email"
														value={editData.email || ""}
														onChange={(e) =>
															setEditData({
																...editData,
																email: e.target.value,
															})
														}
														className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													/>
												</div>
												<div>
													<label
														htmlFor="edit-supplier-phone"
														className="text-xs text-gray-500"
													>
														Phone
													</label>
													<input
														id="edit-supplier-phone"
														type="text"
														value={editData.phone || ""}
														onChange={(e) =>
															setEditData({
																...editData,
																phone: e.target.value,
															})
														}
														className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													/>
												</div>
												<div>
													<label
														htmlFor="edit-supplier-address"
														className="text-xs text-gray-500"
													>
														Address
													</label>
													<input
														id="edit-supplier-address"
														type="text"
														value={editData.address || ""}
														onChange={(e) =>
															setEditData({
																...editData,
																address: e.target.value,
															})
														}
														className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													/>
												</div>
											</div>
											<div>
												<label
													htmlFor="edit-supplier-other-info"
													className="text-xs text-gray-500"
												>
													Other info
												</label>
												<textarea
													id="edit-supplier-other-info"
													value={editData.other_info || ""}
													onChange={(e) =>
														setEditData({
															...editData,
															other_info: e.target.value,
														})
													}
													className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
													rows={3}
												/>
											</div>
										</>
									)}
								</div>
							)}

						{modalMode === "delete" && modalEntity && modalItem && (
							<div className="space-y-3">
								{deleteImpactLoading ? (
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<Loader2 className="w-4 h-4 animate-spin" />
										Loading delete impact...
									</div>
								) : (
									<ul className="space-y-2 text-sm text-gray-700">
										{modalEntity === "materials" && (
											<>
												<li>
													Material:{" "}
													<span className="font-medium">{modalItem.name}</span>
												</li>
												<li>
													Variants to remove:{" "}
													<span className="font-medium">
														{deleteImpact.variants}
													</span>
												</li>
												<li>
													Supplier pricing entries to remove:{" "}
													<span className="font-medium">
														{deleteImpact.supplierPricings}
													</span>
												</li>
												<li>
													Order references detected:{" "}
													<span className="font-medium">
														{deleteImpact.orderRefs}
													</span>
												</li>
											</>
										)}
										{modalEntity === "variants" && (
											<>
												<li>
													Variant:{" "}
													<span className="font-medium">
														{modalItem.variant_name}
													</span>
												</li>
												<li>
													Supplier pricing entries to remove:{" "}
													<span className="font-medium">
														{deleteImpact.supplierPricings}
													</span>
												</li>
												<li>
													Order references detected:{" "}
													<span className="font-medium">
														{deleteImpact.orderRefs}
													</span>
												</li>
											</>
										)}
										{modalEntity === "suppliers" && (
											<>
												<li>
													Supplier:{" "}
													<span className="font-medium">{modalItem.name}</span>
												</li>
												<li>
													Supplier pricing entries to remove:{" "}
													<span className="font-medium">
														{deleteImpact.supplierRefs}
													</span>
												</li>
											</>
										)}
									</ul>
								)}
							</div>
						)}

						{modalError && (
							<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								{modalError}
							</div>
						)}

						<div className="flex justify-end gap-2 mt-6">
							<Dialog.Close asChild>
								<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
									Cancel
								</button>
							</Dialog.Close>
							{isVariantCreateWizard ? (
								<>
									{variantCreateStep !== "variant" && (
										<button
											onClick={handleVariantWizardBack}
											className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
										>
											Back
										</button>
									)}
									{variantCreateStep === "pricing" ? (
										<button
											onClick={handleCreateEntity}
											className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
										>
											<Save className="w-4 h-4" />
											Create
										</button>
									) : (
										<button
											onClick={handleVariantWizardNext}
											className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
										>
											Next
										</button>
									)}
								</>
							) : modalMode === "edit" ? (
								<button
									onClick={handleSaveEdit}
									className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								>
									<Save className="w-4 h-4" />
									Save changes
								</button>
							) : modalMode === "create" ? (
								<button
									onClick={handleCreateEntity}
									className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								>
									<Save className="w-4 h-4" />
									Create
								</button>
							) : (
								<button
									onClick={handleDeleteConfirm}
									className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
								>
									<Trash2 className="w-4 h-4" />
									Delete
								</button>
							)}
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
