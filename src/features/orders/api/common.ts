import { supabase } from "@/lib/supabase";

/** Returns the ids of all order_packages belonging to an order. */
export async function fetchOrderPackageIds(orderId: string): Promise<string[]> {
	const { data: packages, error } = await supabase
		.from("order_packages")
		.select("id")
		.eq("order_id", orderId);

	if (error) throw error;
	return (packages || []).map((p) => p.id);
}
