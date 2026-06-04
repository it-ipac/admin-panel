import { supabase } from "../../lib/supabase";
import type { FilterParams, ReportInstanceData } from "./types";

const getMediaPublicUrl = (path: string) => {
	if (!path) return "";
	if (
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("data:")
	) {
		return path;
	}
	return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
};

const chunkArray = <T>(array: T[], size: number): T[][] => {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
};

const fetchInChunks = async <T, R>(
	items: T[],
	chunkSize: number,
	fetchFn: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> => {
	if (items.length === 0) return [];
	const chunks = chunkArray(items, chunkSize);
	const results = await Promise.all(chunks.map((chunk) => fetchFn(chunk)));
	return results.flat();
};

export const fetchClients = async () => {
	const { data, error } = await supabase
		.from("clients")
		.select("id, name, trn")
		.order("name");
	if (error) throw error;
	return data;
};

export const fetchClientDetails = async (clientId: string) => {
	const { data, error } = await supabase
		.from("clients")
		.select("*")
		.eq("id", clientId)
		.single();
	if (error) throw error;
	return data;
};

export const updateClientDetails = async (id: string, payload: any) => {
	const { data, error } = await supabase
		.from("clients")
		.update(payload)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	return data;
};

export const fetchOrders = async (clientId: string | null) => {
	let query = supabase.from("orders").select("id, order_name, reference");
	if (clientId) {
		query = query.eq("client_id", clientId);
	}
	const { data, error } = await query.order("order_name");
	if (error) throw error;
	return data;
};

export const fetchOrderDetails = async (orderId: string) => {
	const { data, error } = await supabase
		.from("orders")
		.select("*")
		.eq("id", orderId)
		.single();
	if (error) throw error;
	return data;
};

/**
 * Fetches aggregated NW, GW, and volume for all packed instances of an order.
 * Volume is computed from package_info external dimensions (L × W × H → m³).
 */
export const fetchOrderTotals = async (orderId: string) => {
	// Get all instances for this order with their package_info via final_pkg_info and original_pkg_info
	const { data, error } = await supabase
		.from("order_pkg_instance")
		.select(`
			id,
			order_pkg_overview!inner(
				order_id,
				order_packages!inner(
					original_pkg_info:package_info!order_packages_original_pkg_info_fkey(
						net_weight,
						gross_weight,
						external_length,
						external_width,
						external_height
					),
					final_pkg_info:package_info!order_packages_final_pkg_info_fkey(
						net_weight,
						gross_weight,
						external_length,
						external_width,
						external_height
					)
				)
			)
		`)
		.eq("order_pkg_overview.order_id", orderId);

	if (error) throw error;
	if (!data || data.length === 0)
		return {
			totalNW: 0,
			totalGW: 0,
			totalVolume: 0,
			boxCount: data?.length ?? 0,
		};

	let totalNW = 0;
	let totalGW = 0;
	let totalVolume = 0;

	for (const inst of data) {
		const orderPkg = (inst as any).order_pkg_overview?.order_packages;
		const orderPkgObj = Array.isArray(orderPkg) ? orderPkg[0] : orderPkg;
		if (!orderPkgObj) continue;

		const originalInfo = orderPkgObj.original_pkg_info
			? Array.isArray(orderPkgObj.original_pkg_info)
				? orderPkgObj.original_pkg_info[0]
				: orderPkgObj.original_pkg_info
			: null;
		const finalInfo = orderPkgObj.final_pkg_info
			? Array.isArray(orderPkgObj.final_pkg_info)
				? orderPkgObj.final_pkg_info[0]
				: orderPkgObj.final_pkg_info
			: null;

		if (!originalInfo && !finalInfo) continue;

		const getVal = (field: string) => {
			const finalVal = finalInfo?.[field];
			const originalVal = originalInfo?.[field];
			if (finalVal !== null && finalVal !== undefined && finalVal !== "") {
				return finalVal;
			}
			return originalVal ?? null;
		};

		const netWeight = getVal("net_weight");
		const grossWeight = getVal("gross_weight");
		const extL = getVal("external_length");
		const extW = getVal("external_width");
		const extH = getVal("external_height");

		if (netWeight) totalNW += Number(netWeight);
		if (grossWeight) totalGW += Number(grossWeight);
		const l = Number(extL ?? 0) / 1000; // mm → m
		const w = Number(extW ?? 0) / 1000;
		const h = Number(extH ?? 0) / 1000;
		if (l > 0 && w > 0 && h > 0) totalVolume += l * w * h;
	}

	return {
		totalNW: Math.round(totalNW * 10) / 10,
		totalGW: Math.round(totalGW * 10) / 10,
		totalVolume: Math.round(totalVolume * 1000) / 1000, // 3 decimals in m³
		boxCount: data.length,
	};
};

export const fetchProjectTags = async (clientId: string | null) => {
	if (!clientId) return [];
	const { data, error } = await supabase
		.from("project_tags")
		.select("id, name")
		.eq("client_id", clientId)
		.order("name");
	if (error) throw error;
	return data;
};

export const fetchDestinations = async (
	clientId: string | null,
	orderIds: string[],
) => {
	if (!clientId && orderIds.length === 0) return [];

	let query = supabase.from("order_pkg_instance").select(`
      destination,
      order_pkg_overview!inner (
        order_id,
        orders!inner (
          client_id
        )
      )
    `);

	if (orderIds.length > 0) {
		query = query.in("order_pkg_overview.order_id", orderIds);
	} else if (clientId) {
		query = query.eq("order_pkg_overview.orders.client_id", clientId);
	}

	// Only show destinations from instances that have packed items
	const { data, error } = await query.not("destination", "is", null);
	if (error) throw error;

	const uniqueDestinations = new Set<string>();
	data?.forEach((d) => {
		if (d.destination) {
			uniqueDestinations.add(d.destination);
		}
	});

	return Array.from(uniqueDestinations).sort();
};

export const fetchReportInstances = async (
	filters: FilterParams,
): Promise<ReportInstanceData[]> => {
	if (!filters.clientId && filters.orderIds.length === 0) return [];

	// Build date params — ensure the "To" date includes the full day by appending end-of-day time
	const dateTo = filters.dateTo ? `${filters.dateTo}T23:59:59+00:00` : null;
	const dateFrom = filters.dateFrom
		? `${filters.dateFrom}T00:00:00+00:00`
		: null;

	const { data, error } = await supabase.rpc("fetch_report_instances", {
		p_client_id: filters.clientId || null,
		p_order_ids: filters.orderIds.length > 0 ? filters.orderIds : null,
		p_date_from: dateFrom,
		p_date_to: dateTo,
		p_date_mode: filters.dateFilterMode,
		p_destinations:
			filters.destinations.length > 0 ? filters.destinations : null,
		p_has_items_only: filters.hasItemsOnly,
		p_tag_ids: filters.tags.length > 0 ? filters.tags : null,
	});

	if (error) throw error;
	if (!data || data.length === 0) return [];

	// Fetch items for all instances in chunks to avoid PostgREST 1000 row limit
	const instanceIds = data.map((d: any) => d.id);
	const itemData = await fetchInChunks(instanceIds, 100, async (chunk) => {
		const { data: chunkData, error: itemError } = await supabase.rpc(
			"fetch_instance_items",
			{ p_instance_ids: chunk },
		);
		if (itemError) throw itemError;
		return (chunkData || []) as any[];
	});

	// Group items by instance
	const itemsByInstance = new Map<string, any[]>();
	for (const item of itemData || []) {
		if (!itemsByInstance.has(item.pkg_instance_id)) {
			itemsByInstance.set(item.pkg_instance_id, []);
		}
		itemsByInstance.get(item.pkg_instance_id)!.push(item);
	}

	// Fetch additional package details (includes order_package_id for QR lookup) in chunks
	const extData = await fetchInChunks(instanceIds, 100, async (chunk) => {
		const { data: chunkData, error: extError } = await supabase
			.from("order_pkg_instance")
			.select(`
				id,
				order_package_id,
				order_pkg_overview (
					quantity
				),
				order_packages (
					id,
					original_pkg_info:package_info!order_packages_original_pkg_info_fkey (
						id,
						internal_length,
						internal_width,
						internal_height,
						external_length,
						external_width,
						external_height,
						net_weight,
						gross_weight,
						sei_category,
						sei_protection,
						tare,
						box_type (
							name
						)
					),
					final_pkg_info:package_info!order_packages_final_pkg_info_fkey (
						id,
						internal_length,
						internal_width,
						internal_height,
						external_length,
						external_width,
						external_height,
						net_weight,
						gross_weight,
						sei_category,
						sei_protection,
						tare,
						box_type (
							name
						)
					)
				)
			`)
			.in("id", chunk);
		if (extError) throw extError;
		return chunkData || [];
	});

	// Build extMap and collect unique order_package_ids for QR lookup
	const extMap = new Map<string, any>();
	// Map: order_package_id → [instance_ids]
	const pkgIdToInstIds = new Map<string, string[]>();
	for (const item of extData || []) {
		extMap.set(item.id, item);
		if (item.order_package_id) {
			if (!pkgIdToInstIds.has(item.order_package_id)) {
				pkgIdToInstIds.set(item.order_package_id, []);
			}
			pkgIdToInstIds.get(item.order_package_id)!.push(item.id);
		}
	}

	// Fetch QR codes by order_pkg_instance id or order_package_id (entity_type = "package") in chunks
	const uniquePkgIds = Array.from(pkgIdToInstIds.keys());
	const qrMap = new Map<string, string>(); // instance_id → qr_token
	const targetIds = [...new Set([...instanceIds, ...uniquePkgIds])];
	if (targetIds.length > 0) {
		const qrData = await fetchInChunks(targetIds, 100, async (chunk) => {
			const { data: chunkData, error: qrError } = await supabase
				.from("qr_codes")
				.select("entity_id, token")
				.eq("entity_type", "package")
				.eq("is_active", true)
				.in("entity_id", chunk);
			if (qrError) throw qrError;
			return chunkData || [];
		});
		for (const qr of qrData || []) {
			// New flow: entity_id is direct order_pkg_instance.id
			if (instanceIds.includes(qr.entity_id)) {
				qrMap.set(qr.entity_id, qr.token);
			}
			// Legacy fallback: entity_id is order_package_id
			for (const instId of pkgIdToInstIds.get(qr.entity_id) || []) {
				qrMap.set(instId, qr.token);
			}
		}
	}

	// Fetch box photos (media.order_pkg_instance_id) in chunks
	const boxPhotoMap = new Map<string, string[]>(); // instance_id → urls
	const boxMediaData = await fetchInChunks(instanceIds, 100, async (chunk) => {
		const { data: chunkData, error: mediaError } = await supabase
			.from("media")
			.select("order_pkg_instance_id, image_url")
			.in("order_pkg_instance_id", chunk)
			.not("image_url", "is", null);
		if (mediaError) throw mediaError;
		return chunkData || [];
	});
	for (const m of boxMediaData || []) {
		if (!boxPhotoMap.has(m.order_pkg_instance_id)) {
			boxPhotoMap.set(m.order_pkg_instance_id, []);
		}
		const publicUrl = getMediaPublicUrl(m.image_url);
		if (publicUrl) {
			boxPhotoMap.get(m.order_pkg_instance_id)!.push(publicUrl);
		}
	}

	// Collect all pkd_item IDs for item photo fetch
	const allPkdItemIds = (itemData || [])
		.map((i: any) => i.pkd_item_id)
		.filter(Boolean);

	// Fetch QR codes for items (entity_type = "pkd_item") in chunks
	const itemQrMap = new Map<string, string>(); // pkd_item_id -> token
	if (allPkdItemIds.length > 0) {
		const qrItemData = await fetchInChunks(
			allPkdItemIds,
			100,
			async (chunk) => {
				const { data: chunkData, error: qrItemError } = await supabase
					.from("qr_codes")
					.select("entity_id, token")
					.eq("entity_type", "pkd_item")
					.eq("is_active", true)
					.in("entity_id", chunk);
				if (qrItemError) throw qrItemError;
				return chunkData || [];
			},
		);
		for (const qr of qrItemData) {
			itemQrMap.set(qr.entity_id, qr.token);
		}
	}

	// Fetch item photos (pkd_item_id) in chunks
	const itemPhotoMap = new Map<string, string[]>(); // pkd_item_id → urls
	if (allPkdItemIds.length > 0) {
		const itemMediaData = await fetchInChunks(
			allPkdItemIds,
			100,
			async (chunk) => {
				const { data: chunkData, error: mediaError } = await supabase
					.from("media")
					.select("pkd_item_id, image_url")
					.in("pkd_item_id", chunk)
					.not("image_url", "is", null);
				if (mediaError) throw mediaError;
				return chunkData || [];
			},
		);
		for (const m of itemMediaData || []) {
			if (!itemPhotoMap.has(m.pkd_item_id)) {
				itemPhotoMap.set(m.pkd_item_id, []);
			}
			const publicUrl = getMediaPublicUrl(m.image_url);
			if (publicUrl) {
				itemPhotoMap.get(m.pkd_item_id)!.push(publicUrl);
			}
		}
	}

	// Map to the ReportInstanceData shape
	return data.map((inst: any): ReportInstanceData => {
		const ext = extMap.get(inst.id);
		const orderPkg = ext?.order_packages;
		const orderPkgObj = Array.isArray(orderPkg) ? orderPkg[0] : orderPkg;

		const originalInfo = orderPkgObj?.original_pkg_info
			? Array.isArray(orderPkgObj.original_pkg_info)
				? orderPkgObj.original_pkg_info[0]
				: orderPkgObj.original_pkg_info
			: null;
		const finalInfo = orderPkgObj?.final_pkg_info
			? Array.isArray(orderPkgObj.final_pkg_info)
				? orderPkgObj.final_pkg_info[0]
				: orderPkgObj.final_pkg_info
			: null;

		const getVal = (field: string) => {
			const finalVal = finalInfo?.[field];
			const originalVal = originalInfo?.[field];
			if (finalVal !== null && finalVal !== undefined && finalVal !== "") {
				return finalVal;
			}
			return originalVal ?? null;
		};

		const getBoxType = () => {
			const finalBoxType = finalInfo?.box_type
				? Array.isArray(finalInfo.box_type)
					? finalInfo.box_type[0]
					: finalInfo.box_type
				: null;
			const originalBoxType = originalInfo?.box_type
				? Array.isArray(originalInfo.box_type)
					? originalInfo.box_type[0]
					: originalInfo.box_type
				: null;
			if (finalBoxType?.name) return finalBoxType.name;
			if (originalBoxType?.name) return originalBoxType.name;
			return null;
		};

		const pkgOverview = ext?.order_pkg_overview;
		return {
			id: inst.id,
			instance_number: inst.instance_number,
			ipac_reference: inst.ipac_reference,
			destination: inst.destination,
			status: inst.status,
			created_at: inst.created_at,
			last_packed_at: inst.last_packed_at,
			item_count: Number(inst.item_count),
			order_id: inst.order_id,
			order_name: inst.order_name,
			order_reference: inst.order_reference,
			package_number: inst.package_number,
			package_reference: inst.package_reference,
			pkd_items: (itemsByInstance.get(inst.id) || []).map((i) => ({
				id: i.pkd_item_id,
				maintenance_db_id: i.maintenance_db_id || null,
				quantity: Number(i.quantity),
				item_name: i.description,
				item_num: i.item_num,
				photo_urls: itemPhotoMap.get(i.pkd_item_id) || [],
				length:
					i.length !== null && i.length !== undefined ? Number(i.length) : null,
				width:
					i.width !== null && i.width !== undefined ? Number(i.width) : null,
				height:
					i.height !== null && i.height !== undefined ? Number(i.height) : null,
				net_weight:
					i.net_weight !== null && i.net_weight !== undefined
						? Number(i.net_weight)
						: null,
				qr_token: itemQrMap.get(i.pkd_item_id) || null,
			})),
			internal_length:
				getVal("internal_length") !== null
					? Number(getVal("internal_length"))
					: null,
			internal_width:
				getVal("internal_width") !== null
					? Number(getVal("internal_width"))
					: null,
			internal_height:
				getVal("internal_height") !== null
					? Number(getVal("internal_height"))
					: null,
			external_length:
				getVal("external_length") !== null
					? Number(getVal("external_length"))
					: null,
			external_width:
				getVal("external_width") !== null
					? Number(getVal("external_width"))
					: null,
			external_height:
				getVal("external_height") !== null
					? Number(getVal("external_height"))
					: null,
			net_weight:
				getVal("net_weight") !== null ? Number(getVal("net_weight")) : null,
			gross_weight:
				getVal("gross_weight") !== null ? Number(getVal("gross_weight")) : null,
			tare: getVal("tare") !== null ? Number(getVal("tare")) : null,
			box_type: getBoxType(),
			sei_category:
				getVal("sei_category") !== null ? Number(getVal("sei_category")) : null,
			sei_protection:
				getVal("sei_protection") !== null
					? Number(getVal("sei_protection"))
					: null,
			qr_token: qrMap.get(inst.id) || null,
			package_qty: pkgOverview ? Number(pkgOverview.quantity) : null,
			box_photo_urls: boxPhotoMap.get(inst.id) || [],
			original_pkg_info_id: originalInfo?.id || null,
			final_pkg_info_id: finalInfo?.id || null,
			order_package_id: orderPkgObj?.id || null,
		};
	});
};

export const fetchTemplates = async () => {
	const { data, error } = await supabase
		.from("report_template_settings")
		.select("*")
		.order("template_name");
	if (error) throw error;
	return data;
};

export const saveTemplate = async (templateData: any) => {
	if (templateData.id) {
		const { data, error } = await supabase
			.from("report_template_settings")
			.update(templateData)
			.eq("id", templateData.id)
			.select()
			.single();
		if (error) throw error;
		return data;
	} else {
		const { data, error } = await supabase
			.from("report_template_settings")
			.insert(templateData)
			.select()
			.single();
		if (error) throw error;
		return data;
	}
};

export const fetchCompanyProfile = async () => {
	const { data, error } = await supabase
		.from("app_settings")
		.select("value")
		.eq("key", "company_profile")
		.single();
	if (error && error.code !== "PGRST116") throw error; // PGRST116 is not found
	return data?.value || null;
};

export const saveCompanyProfile = async (profile: Record<string, any>) => {
	const { error } = await supabase
		.from("app_settings")
		.upsert(
			{ key: "company_profile", value: profile, category: "branding" },
			{ onConflict: "key" },
		);
	if (error) throw error;
};

export const saveReport = async (
	reportData: any,
	instanceIds: string[],
	orderIds: string[],
) => {
	const { data: report, error: reportError } = await supabase
		.from("client_report")
		.insert(reportData)
		.select()
		.single();
	if (reportError) throw reportError;

	if (orderIds.length > 0) {
		const orderMaps = orderIds.map((o) => ({
			client_report_id: report.id,
			order_id: o,
		}));
		const { error: oError } = await supabase
			.from("client_report_orders")
			.insert(orderMaps);
		if (oError) throw oError;
	}

	if (instanceIds.length > 0) {
		const instanceMaps = instanceIds.map((instId, index) => ({
			client_report_id: report.id,
			package_instance_id: instId,
			sequence_order: index,
		}));
		const { error: iError } = await supabase
			.from("instance_c_report_map")
			.insert(instanceMaps);
		if (iError) throw iError;
	}

	return report;
};
