import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { regenerateReferenceForInstance } from "../utils/regenerateReference";

export interface MovePackageArgs {
	packageId: string;
	sourceOrderId: string;
	targetOrderId: string;
}

/**
 * Moves a box (order_package) to another order.
 *
 * The order_package row keeps its primary key, so every child keyed off
 * `order_package_id` or the instance UUID — instances, pkd_items, package_items,
 * materials, securing, services, media, task_packages, qr_codes — stays attached
 * automatically. Only the order linkage + numbering change, plus a reference
 * regeneration (the QR token is preserved).
 *
 * NOTE: this is a multi-step client mutation with no transaction. A small
 * Supabase RPC would make it atomic; until then the link updates are done
 * back-to-back and errors are surfaced so a half-move is visible.
 */
export function useMovePackage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			packageId,
			sourceOrderId,
			targetOrderId,
		}: MovePackageArgs) => {
			// 1. Current package number (also the overview's pkg_number).
			const { data: pkg, error: pkgErr } = await supabase
				.from("order_packages")
				.select("package_number")
				.eq("id", packageId)
				.single();
			if (pkgErr) throw pkgErr;
			const oldNumber = pkg.package_number;

			// 2. Conflict-safe number in the target order (MAX + 1).
			const { data: maxPkg, error: maxErr } = await supabase
				.from("order_packages")
				.select("package_number")
				.eq("order_id", targetOrderId)
				.order("package_number", { ascending: false })
				.limit(1)
				.maybeSingle();
			if (maxErr) throw maxErr;
			const newNumber = (maxPkg?.package_number || 0) + 1;

			// 3. Move the package row.
			const { error: movePkgErr } = await supabase
				.from("order_packages")
				.update({ order_id: targetOrderId, package_number: newNumber })
				.eq("id", packageId);
			if (movePkgErr) throw movePkgErr;

			// 4. Move the matching overview row (keyed by order_id + pkg_number).
			const { error: moveOverviewErr } = await supabase
				.from("order_pkg_overview")
				.update({ order_id: targetOrderId, pkg_number: newNumber })
				.eq("order_id", sourceOrderId)
				.eq("pkg_number", oldNumber);
			if (moveOverviewErr) throw moveOverviewErr;

			// 5. Regenerate each instance's reference for the new context
			// (UUIDs + QR tokens untouched).
			const { data: instances, error: instErr } = await supabase
				.from("order_pkg_instance")
				.select("id")
				.eq("order_package_id", packageId);
			if (instErr) throw instErr;
			for (const inst of instances || []) {
				await regenerateReferenceForInstance(inst.id);
			}

			return { newNumber };
		},
		onSuccess: (_data, vars) => {
			for (const orderId of [vars.sourceOrderId, vars.targetOrderId]) {
				queryClient.invalidateQueries({ queryKey: ["order", orderId] });
				queryClient.invalidateQueries({
					queryKey: ["packageInstances", orderId],
				});
				queryClient.invalidateQueries({ queryKey: ["packageItems", orderId] });
				queryClient.invalidateQueries({ queryKey: ["pkdItems", orderId] });
			}
			queryClient.invalidateQueries({ queryKey: ["orders"] });
		},
	});
}
