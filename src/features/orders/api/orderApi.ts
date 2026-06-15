import { supabase } from "@/lib/supabase";
import type { Order } from "../types";

/** Fetches the order with client, project lead and packages (incl. pkg info). */
export async function fetchOrder(orderId: string): Promise<Order | null> {
	const { data, error } = await supabase
		.from("orders")
		.select(`
          id,
          order_name,
          description,
          production_status,
          commercial_status,
          created_at,
          updated_at,
          start_date,
          completion_date,
          clients (
            id,
            name,
            contact_person,
            email,
            phone,
            address
          ),
          project_lead:profiles!project_lead_id (
            full_name
          ),
          order_packages (
            id,
            package_number,
            description,
            status,
            comments,
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
              tare,
              quantity,
              packing_type_id,
							sei_category,
							sei_protection,
              box_type_id,
              center_of_gravity
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
              tare,
              quantity,
              packing_type_id,
							sei_category,
							sei_protection,
              box_type_id,
              center_of_gravity
            )
          )
        `)
		.eq("id", orderId)
		.maybeSingle();

	if (error && error.code !== "PGRST116") throw error;
	if (!data) return null;

	// Unwrap single relations
	const unwrapped = {
		...data,
		clients: Array.isArray(data.clients) ? data.clients[0] : data.clients,
		project_lead: Array.isArray(data.project_lead)
			? data.project_lead[0]
			: data.project_lead,
		order_packages:
			data.order_packages?.map((pkg: any) => ({
				...pkg,
				original_pkg_info: Array.isArray(pkg.original_pkg_info)
					? pkg.original_pkg_info[0]
					: pkg.original_pkg_info,
				final_pkg_info: Array.isArray(pkg.final_pkg_info)
					? pkg.final_pkg_info[0]
					: pkg.final_pkg_info,
			})) || [],
	};

	return unwrapped as Order;
}
