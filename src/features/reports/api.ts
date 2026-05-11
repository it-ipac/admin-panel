import { supabase } from "../../lib/supabase";
import type { FilterParams, ReportInstanceData } from "./types";

export const fetchClients = async () => {
	const { data, error } = await supabase
		.from("clients")
		.select("id, name, trn")
		.order("name");
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
	orderId: string | null,
) => {
	if (!clientId && !orderId) return [];

	let query = supabase.from("order_pkg_instance").select(`
      destination,
      order_pkg_overview!inner (
        order_id,
        orders!inner (
          client_id
        )
      )
    `);

	if (orderId) {
		query = query.eq("order_pkg_overview.order_id", orderId);
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
	if (!filters.clientId && !filters.orderId) return [];

	// Build date params — ensure the "To" date includes the full day by appending end-of-day time
	const dateTo = filters.dateTo ? `${filters.dateTo}T23:59:59+00:00` : null;
	const dateFrom = filters.dateFrom
		? `${filters.dateFrom}T00:00:00+00:00`
		: null;

	const { data, error } = await supabase.rpc("fetch_report_instances", {
		p_client_id: filters.clientId || null,
		p_order_id: filters.orderId || null,
		p_date_from: dateFrom,
		p_date_to: dateTo,
		p_date_mode: filters.dateFilterMode,
		p_destinations:
			filters.destinations.length > 0 ? filters.destinations : null,
		p_has_items_only: filters.hasItemsOnly,
	});

	if (error) throw error;
	if (!data || data.length === 0) return [];

	// Fetch items for all instances (if show_items is needed, the component will handle it)
	const instanceIds = data.map((d: any) => d.id);
	const { data: itemData, error: itemError } = await supabase.rpc(
		"fetch_instance_items",
		{ p_instance_ids: instanceIds },
	);
	if (itemError) throw itemError;

	// Group items by instance
	const itemsByInstance = new Map<string, any[]>();
	for (const item of itemData || []) {
		if (!itemsByInstance.has(item.pkg_instance_id)) {
			itemsByInstance.set(item.pkg_instance_id, []);
		}
		itemsByInstance.get(item.pkg_instance_id)!.push(item);
	}

	// Map to the ReportInstanceData shape
	return data.map(
		(inst: any): ReportInstanceData => ({
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
				quantity: Number(i.quantity),
				item_name: i.description,
				item_num: i.item_num,
			})),
		}),
	);
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
