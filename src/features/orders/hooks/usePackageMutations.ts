import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	generateIpacReference,
	mapCategoryToTag,
} from "@/components/orders/create/orderCreate/utils";
import { supabase } from "@/lib/supabase";
import type { PackageInfo } from "../types";

/**
 * Mutations operating on whole packages: pkg info upsert, status,
 * duplication (incl. overview/instance/reference creation) and removal.
 */
export function usePackageMutations(
	orderId: string,
	options?: { onPackageRemoved?: () => void },
) {
	const queryClient = useQueryClient();

	// Package Info Mutation
	const updatePackageInfoMutation = useMutation({
		mutationFn: async ({
			packageId,
			infoType,
			updates,
		}: {
			packageId: string;
			infoType: "original" | "final";
			updates: Partial<PackageInfo>;
		}) => {
			// Get the current package to check if info exists
			const { data: pkg, error: pkgError } = await supabase
				.from("order_packages")
				.select("original_pkg_info, final_pkg_info")
				.eq("id", packageId)
				.single();

			if (pkgError) throw pkgError;

			const infoId =
				infoType === "original" ? pkg.original_pkg_info : pkg.final_pkg_info;

			if (infoId) {
				// Update existing package_info
				const { data, error } = await supabase
					.from("package_info")
					.update(updates)
					.eq("id", infoId)
					.select()
					.single();
				if (error) throw error;
				return data;
			} else {
				// Create new package_info and link to package
				const { data: newInfo, error: createError } = await supabase
					.from("package_info")
					.insert(updates)
					.select()
					.single();
				if (createError) throw createError;

				// Link to order_package
				const updateField =
					infoType === "original" ? "original_pkg_info" : "final_pkg_info";
				const { error: linkError } = await supabase
					.from("order_packages")
					.update({ [updateField]: newInfo.id })
					.eq("id", packageId);
				if (linkError) throw linkError;

				return newInfo;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
		},
	});

	// Package Status Mutation
	const updatePackageStatusMutation = useMutation({
		mutationFn: async ({
			packageId,
			status,
		}: {
			packageId: string;
			status: string;
		}) => {
			const { error } = await supabase
				.from("order_packages")
				.update({ status })
				.eq("id", packageId);
			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
		},
	});

	// Duplicate Package Mutation
	const duplicatePackageMutation = useMutation({
		mutationFn: async (packageId: string) => {
			// 1. Fetch source package with its original info
			const { data: sourcePkg, error: fetchError } = await supabase
				.from("order_packages")
				.select(`
					*,
					original_pkg_info:package_info!order_packages_original_pkg_info_fkey(*),
					order_pkg_overview(quantity, description)
				`)
				.eq("id", packageId)
				.single();

			if (fetchError) throw fetchError;
			if (!sourcePkg) throw new Error("Source package not found");

			// 2. Determine new package number (max + 1 for the order)
			const { data: maxPkg, error: maxPkgError } = await supabase
				.from("order_packages")
				.select("package_number")
				.eq("order_id", orderId)
				.order("package_number", { ascending: false })
				.limit(1)
				.single();

			if (maxPkgError && maxPkgError.code !== "PGRST116") throw maxPkgError;
			const newPackageNumber = (maxPkg?.package_number || 0) + 1;

			// 3. Create new package_info rows
			// Copy original
			const originalInfo = { ...sourcePkg.original_pkg_info };
			delete (originalInfo as any).id;
			delete (originalInfo as any).created_at;

			const { data: newOriginalInfo, error: createOrigError } = await supabase
				.from("package_info")
				.insert(originalInfo)
				.select()
				.single();
			if (createOrigError) throw createOrigError;

			// Create empty final info
			const { data: newFinalInfo, error: createFinalError } = await supabase
				.from("package_info")
				.insert({})
				.select()
				.single();
			if (createFinalError) throw createFinalError;

			// 4. Create order_package
			const { data: newPkg, error: createPkgError } = await supabase
				.from("order_packages")
				.insert({
					order_id: orderId,
					package_number: newPackageNumber,
					description: sourcePkg.description,
					status: "design",
					original_pkg_info: newOriginalInfo.id,
					final_pkg_info: newFinalInfo.id,
				})
				.select()
				.single();
			if (createPkgError) throw createPkgError;

			// 5. Create order_pkg_overview
			const sourceOverview = sourcePkg.order_pkg_overview?.[0];
			const { data: newOverview, error: createOverviewError } = await supabase
				.from("order_pkg_overview")
				.insert({
					order_id: orderId,
					pkg_number: newPackageNumber,
					quantity: 1,
					status: "design",
					description: sourceOverview?.description || sourcePkg.description,
				})
				.select()
				.single();
			if (createOverviewError) throw createOverviewError;

			// 6. Generate IPAC Reference
			const { data: sourceInstance } = await supabase
				.from("order_pkg_instance")
				.select("ipac_reference, destination")
				.eq("order_package_id", packageId)
				.limit(1)
				.single();

			const destination = sourceInstance?.destination || "XXX";
			let categoryLabel = "TAG";
			if (newOriginalInfo.sei_category) {
				const { data: catData } = await supabase
					.from("sei_categories")
					.select("name")
					.eq("id", newOriginalInfo.sei_category)
					.single();
				if (catData?.name) categoryLabel = catData.name;
			}
			const tag = mapCategoryToTag(categoryLabel);

			// Find next sequence for this tag and destination
			const destPrefix = (destination || "XXX").toUpperCase().slice(0, 3);
			const { data: existingInstances } = await supabase
				.from("order_pkg_instance")
				.select("ipac_reference")
				.ilike("ipac_reference", `${destPrefix}-${tag}-%`)
				.order("ipac_reference", { ascending: false });

			let nextSeq = 1;
			if (existingInstances && existingInstances.length > 0) {
				for (const inst of existingInstances) {
					const match = inst.ipac_reference?.match(/-(\d+)$/);
					if (match) {
						const num = parseInt(match[1], 10);
						if (num >= nextSeq) {
							nextSeq = num + 1;
							break; // Found highest because sorted DESC
						}
					}
				}
			}

			const newReference = generateIpacReference({
				destination,
				tag,
				isCustom: false,
				boxNumber: nextSeq,
			});

			// 7. Create order_pkg_instance
			const { error: createInstanceError } = await supabase
				.from("order_pkg_instance")
				.insert({
					order_pkg_overview_id: newOverview.id,
					order_package_id: newPkg.id,
					instance_number: 1,
					ipac_reference: newReference,
					status: "design",
					destination: destination,
				});
			if (createInstanceError) throw createInstanceError;

			return newPkg;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
		},
	});

	// Remove Package Mutation
	const removePackageMutation = useMutation({
		mutationFn: async (packageId: string) => {
			// 1. Fetch package details to get info IDs and pkg_number
			const { data: pkg, error: fetchError } = await supabase
				.from("order_packages")
				.select("original_pkg_info, final_pkg_info, package_number")
				.eq("id", packageId)
				.single();
			if (fetchError) throw fetchError;

			// 2. Delete instances (RESTRICT prevents deleting package if instances exist)
			const { error: instError } = await supabase
				.from("order_pkg_instance")
				.delete()
				.eq("order_package_id", packageId);
			if (instError) throw instError;

			// 3. Delete overview (one overview per package in this flow)
			const { error: overviewError } = await supabase
				.from("order_pkg_overview")
				.delete()
				.eq("order_id", orderId)
				.eq("pkg_number", pkg.package_number);
			if (overviewError) throw overviewError;

			// 4. Delete the package (this triggers CASCADE for items, materials, etc.)
			const { error: pkgError } = await supabase
				.from("order_packages")
				.delete()
				.eq("id", packageId);
			if (pkgError) throw pkgError;

			// 5. Delete associated package_info rows
			const infoIds = [];
			if (pkg.original_pkg_info) infoIds.push(pkg.original_pkg_info);
			if (pkg.final_pkg_info) infoIds.push(pkg.final_pkg_info);

			if (infoIds.length > 0) {
				const { error: infoError } = await supabase
					.from("package_info")
					.delete()
					.in("id", infoIds);
				if (infoError) throw infoError;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({
				queryKey: ["packageInstances", orderId],
			});
			options?.onPackageRemoved?.();
		},
	});

	return {
		updatePackageInfoMutation,
		updatePackageStatusMutation,
		duplicatePackageMutation,
		removePackageMutation,
	};
}
