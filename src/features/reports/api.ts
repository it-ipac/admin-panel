import { supabase } from "../../lib/supabase";
import type { FilterParams } from "./types";

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

	const { data, error } = await query;
	if (error) throw error;

	const uniqueDestinations = new Set<string>();
	data?.forEach((d) => {
		if (d.destination) {
			uniqueDestinations.add(d.destination);
		}
	});

	return Array.from(uniqueDestinations).sort();
};

export const fetchReportInstances = async (filters: FilterParams) => {
	if (!filters.clientId && !filters.orderId) return [];

	let query = supabase.from("order_pkg_instance").select(`
      id,
      instance_number,
      ipac_reference,
      destination,
      status,
      packed_at,
      created_at,
      order_pkg_overview_id,
      order_package_id,
      order_pkg_overview!inner (
        order_id,
        description,
        orders!inner (
          client_id
        ),
        category_order_map (
          category_tag_map (
            tag_id
          )
        )
      ),
      order_packages (
        package_number,
        reference
      )
    `);

	if (filters.orderId) {
		query = query.eq("order_pkg_overview.order_id", filters.orderId);
	} else if (filters.clientId) {
		query = query.eq("order_pkg_overview.orders.client_id", filters.clientId);
	}

	if (filters.destinations.length > 0) {
		query = query.in("destination", filters.destinations);
	}

	if (filters.statuses.length > 0) {
		query = query.in("status", filters.statuses);
	}

	// Date filtering
	if (filters.dateFrom) {
		query = query.gte(filters.dateFilterMode, filters.dateFrom);
	}
	if (filters.dateTo) {
		// Add 1 day if dateTo is just a date, to include the whole day. Assuming ISO strings.
		// For now just doing simple <= since we might pass a time as well.
		query = query.lte(filters.dateFilterMode, filters.dateTo);
	}

	const { data, error } = await query;
	if (error) throw error;

	// Client-side filtering for tags, since it's a deep relation and difficult to filter cleanly with inner joins in Supabase sometimes without duplicate rows or missing rows if multiple tags.
	let filteredData = data;
	if (filters.tags.length > 0) {
		filteredData = data.filter((instance) => {
			// Find tags associated with this instance's order
			// Note: tags are usually on category level. Wait, order -> category_order_map -> category_tag_map -> tag.
			// The old Taqa logic is complex, let's see if the tag_id matches any of the filter tags.
			const overview = Array.isArray(instance.order_pkg_overview)
				? instance.order_pkg_overview[0]
				: (instance.order_pkg_overview as any);
			const categoryOrderMaps = overview?.category_order_map;
			if (!categoryOrderMaps || !Array.isArray(categoryOrderMaps)) return false;

			let hasTag = false;
			for (const com of categoryOrderMaps) {
				const categoryTagMaps = (com as any).category_tag_map;
				if (!categoryTagMaps || !Array.isArray(categoryTagMaps)) continue;
				for (const ctm of categoryTagMaps) {
					if (filters.tags.includes(ctm.tag_id)) {
						hasTag = true;
						break;
					}
				}
				if (hasTag) break;
			}
			return hasTag;
		});
	}

	return filteredData as any[]; // Type assertion for now to handle complex nested types
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
