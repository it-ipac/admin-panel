import { AuthError, createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Missing Supabase environment variables");
}

const AUTH_STORAGE_KEY = "ipac-admin-auth";

// Check if stored session might be corrupted on module load
if (typeof window !== "undefined") {
	try {
		const stored = localStorage.getItem(AUTH_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (!parsed?.access_token && !parsed?.refresh_token) {
				console.warn("Clearing invalid auth session from storage");
				localStorage.removeItem(AUTH_STORAGE_KEY);
			}
		}
	} catch (_e) {
		console.warn("Clearing corrupted auth session from storage");
		localStorage.removeItem(AUTH_STORAGE_KEY);
	}
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		storageKey: AUTH_STORAGE_KEY,
		flowType: "pkce",
	},
	global: {
		headers: {
			"X-Client-Info": "ipac-admin-panel",
		},
	},
});

// Handle auth errors globally
supabase.auth.onAuthStateChange((event, _session) => {
	if (event === "TOKEN_REFRESHED") {
		console.log("Token refreshed successfully");
	} else if (event === "SIGNED_OUT") {
		localStorage.removeItem(AUTH_STORAGE_KEY);
	}
});

export const auth = {
	signIn: async (email: string, password: string) => {
		return supabase.auth.signInWithPassword({ email, password });
	},

	signInWithUsername: async (
		username: string,
		password: string,
	): Promise<Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>> => {
		try {
			const { data: email, error: lookupError } = await supabase.rpc(
				"get_user_email_by_username",
				{ lookup_username: username },
			);

			if (lookupError || !email) {
				console.error("Username lookup failed:", lookupError);
				return {
					data: { user: null, session: null, weakPassword: null },
					error: new AuthError("Invalid username or password", 400),
				};
			}

			const response = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			return response;
		} catch (error) {
			console.error("Auth error:", error);
			return {
				data: { user: null, session: null, weakPassword: null },
				error: new AuthError("Authentication failed", 500),
			};
		}
	},

	signOut: async () => {
		localStorage.removeItem(AUTH_STORAGE_KEY);
		return supabase.auth.signOut();
	},

	getSession: async () => {
		try {
			return await supabase.auth.getSession();
		} catch (error) {
			console.error("Failed to get session:", error);
			localStorage.removeItem(AUTH_STORAGE_KEY);
			return { data: { session: null }, error: null };
		}
	},

	getUser: async () => supabase.auth.getUser(),

	onAuthStateChange: (callback: (event: string, session: any) => void) => {
		return supabase.auth.onAuthStateChange(callback);
	},

	clearAuthState: () => {
		localStorage.removeItem(AUTH_STORAGE_KEY);
		window.location.reload();
	},
};

export const db = {
	getProfile: async (userId: string) => {
		return supabase
			.from("profiles")
			.select("*, roles(*)")
			.eq("id", userId)
			.single();
	},

	// ===== Clients =====
	// Centralizing client operations keeps data access consistent across UI modules.
	getClients: async () => {
		return supabase
			.from("clients")
			.select("id, name, contact_person, email, phone, address")
			.order("name", { ascending: true });
	},

	getClientNameById: async (clientId: string) => {
		return supabase.from("clients").select("name").eq("id", clientId).single();
	},

	createClient: async (payload: {
		name: string;
		contact_person?: string | null;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
	}) => {
		return supabase.from("clients").insert(payload).select("*").single();
	},

	updateClient: async (
		id: string,
		payload: {
			name?: string;
			contact_person?: string | null;
			email?: string | null;
			phone?: string | null;
			address?: string | null;
			portal_settings_id?: string | null;
		},
	) => {
		return supabase
			.from("clients")
			.update(payload)
			.eq("id", id)
			.select("*")
			.single();
	},

	getPortalSettings: async (id: string) => {
		return supabase
			.from("client_portal_settings")
			.select("*")
			.eq("id", id)
			.single();
	},

	upsertPortalSettings: async (payload: {
		id?: string;
		slug: string;
		is_active?: boolean;
		portal_requires_auth?: boolean;
		show_qr_logo?: boolean;
		qr_logo_url?: string | null;
	}) => {
		const dbPayload = {
			id: payload.id,
			portal_slug: payload.slug,
			is_active: payload.is_active,
			requires_auth: payload.portal_requires_auth,
			show_qr_logo: payload.show_qr_logo,
			qr_logo_url: payload.qr_logo_url,
		};
		if (dbPayload.id) {
			return supabase
				.from("client_portal_settings")
				.update(dbPayload)
				.eq("id", dbPayload.id)
				.select("*")
				.single();
		} else {
			return supabase
				.from("client_portal_settings")
				.insert(dbPayload)
				.select("*")
				.single();
		}
	},

	uploadLogo: async (file: File, path: string) => {
		return supabase.storage.from("media").upload(path, file, {
			upsert: true,
			contentType: file.type,
		});
	},

	// ===== Orders =====
	// Keep order creation logic here so route components stay focused on UI.
	createOrder: async (payload: {
		order_name: string;
		client_id: string;
		created_by?: string | null;
	}) => {
		return supabase.from("orders").insert(payload).select("*").single();
	},

	getClientOrderCategories: async (clientId: string) => {
		return supabase
			.from("pkg_category")
			.select(`id, label, category_tag_map(tag:project_tags(id, name))`)
			.eq("client_id", clientId)
			.order("label", { ascending: true });
	},

	createOrderCategoryMappings: async (payload: {
		order_id: string;
		category_ids: string[];
	}) => {
		const uniqueCategoryIds = Array.from(
			new Set((payload.category_ids || []).filter(Boolean)),
		);

		if (uniqueCategoryIds.length === 0) {
			return { data: [], error: null };
		}

		return supabase
			.from("category_order_map")
			.insert(
				uniqueCategoryIds.map((category_id) => ({
					order_id: payload.order_id,
					category_id,
				})),
			)
			.select("*");
	},

	// ── Order item allocations (milk model: items_db.expected_qty = Σ allocations) ──
	getOrderItemAllocations: async (orderId: string) => {
		// A large order can hold thousands of allocations (one per item × destination),
		// but PostgREST caps an uncapped select at 1000 rows. Page through with .range().
		// created_at is identical across a bulk-inserted order, so add `id` as a unique
		// tiebreaker — otherwise page boundaries are non-deterministic (gaps/dupes).
		const pageSize = 1000;
		let from = 0;
		const all: Record<string, unknown>[] = [];
		while (true) {
			const { data, error } = await supabase
				.from("order_item_allocation")
				.select(
					`id, order_id, items_db_id, destination_id, expected_qty, packed_qty, is_standard_box, created_at,
					 items_db:items_db(id, item_num, description, reference, category_id),
					 destinations:destinations(id, code, name)`,
				)
				.eq("order_id", orderId)
				.order("created_at", { ascending: true })
				.order("id", { ascending: true })
				.range(from, from + pageSize - 1);
			if (error) return { data: null, error };
			const rows = (data || []) as Record<string, unknown>[];
			all.push(...rows);
			if (rows.length < pageSize) break;
			from += pageSize;
		}
		return { data: all, error: null };
	},

	// Edit an allocation's expected_qty (RPC keeps the items_db rollup in sync).
	setAllocationExpected: async (allocationId: string, expected: number) => {
		return supabase.rpc("set_allocation_expected", {
			p_allocation_id: allocationId,
			p_expected: expected,
		});
	},

	// Add (or top-up) an allocation for (order, item, destination); bumps the items_db rollup.
	addOrderItemAllocation: async (payload: {
		orderId: string;
		itemsDbId: string;
		destinationId: string;
		expected: number;
		isStandardBox: boolean;
	}) => {
		return supabase.rpc("add_order_item_allocation", {
			p_order_id: payload.orderId,
			p_items_db_id: payload.itemsDbId,
			p_destination_id: payload.destinationId,
			p_expected: payload.expected,
			p_is_standard_box: payload.isStandardBox,
		});
	},

	// Reconcile primitive: SET the allocation's expected to the given value (overwrite),
	// insert if missing, delta-adjust the items_db rollup. Never touches packed.
	upsertOrderItemAllocation: async (payload: {
		orderId: string;
		itemsDbId: string;
		destinationId: string;
		expected: number;
		isStandardBox: boolean;
	}) => {
		return supabase.rpc("upsert_order_item_allocation", {
			p_order_id: payload.orderId,
			p_items_db_id: payload.itemsDbId,
			p_destination_id: payload.destinationId,
			p_expected: payload.expected,
			p_is_standard_box: payload.isStandardBox,
		});
	},

	getActiveDestinations: async () => {
		return supabase
			.from("destinations")
			.select("id, code, name")
			.eq("active", true)
			.order("code", { ascending: true });
	},

	// Full client catalog for the allocation item picker (item_num + description + category).
	getClientCatalogItems: async (clientId: string) => {
		const pageSize = 1000;
		let from = 0;
		const all: Array<{
			id: string;
			item_num: string | null;
			description: string | null;
			reference: string | null;
			category_id: string | null;
		}> = [];
		while (true) {
			const { data, error } = await supabase
				.from("items_db")
				.select("id, item_num, description, reference, category_id")
				.eq("client_id", clientId)
				.order("item_num", { ascending: true })
				.range(from, from + pageSize - 1);
			if (error) return { data: null, error };
			const rows = (data || []) as Array<{
				id: string;
				item_num: string | null;
				description: string | null;
				reference: string | null;
				category_id: string | null;
			}>;
			all.push(...rows);
			if (rows.length < pageSize) break;
			from += pageSize;
		}
		return { data: all, error: null };
	},

	// Create a brand-new catalog item (expected_qty starts at 0; the allocation RPC bumps it).
	createCatalogItem: async (payload: {
		clientId: string;
		itemNum: string;
		description: string;
		categoryId: string | null;
	}) => {
		return supabase
			.from("items_db")
			.insert({
				client_id: payload.clientId,
				item_num: payload.itemNum,
				description: payload.description,
				category_id: payload.categoryId,
				expected_qty: 0,
				packed_qty: 0,
			})
			.select("id, item_num, description, category_id")
			.single();
	},

	createOrderPackages: async (payload: {
		order_id: string;
		package_numbers: number[];
		status?: string;
	}) => {
		const { order_id, package_numbers, status = "design" } = payload;

		const rows = package_numbers.map((package_number) => ({
			order_id,
			package_number,
			status,
		}));

		return supabase.from("order_packages").insert(rows).select("*");
	},

	createOrderPackageOverviews: async (
		rows: Array<{
			order_id: string;
			pkg_number: number;
			status?: "design" | "approved" | "in_production" | "packed";
			quantity: number;
			quantity_packed?: number;
			description?: string | null;
		}>,
	) => {
		if (!rows.length) return { data: [], error: null };
		return supabase
			.from("order_pkg_overview")
			.insert(rows)
			.select("id, order_id, pkg_number, quantity");
	},

	createOrderPackageInstances: async (
		rows: Array<{
			order_pkg_overview_id: string;
			order_package_id: string;
			instance_number: number;
			ipac_reference?: string | null;
			status?: "design" | "approved" | "in_production" | "packed";
			packed_at?: string | null;
		}>,
	) => {
		if (!rows.length) return { data: [], error: null };
		return supabase
			.from("order_pkg_instance")
			.insert(rows)
			.select("id, order_package_id, instance_number, ipac_reference");
	},

	getLatestIpacReferenceForPrefix: async (prefix: string) => {
		return supabase
			.from("order_pkg_instance")
			.select("ipac_reference")
			.ilike("ipac_reference", `${prefix}-%`)
			.order("ipac_reference", { ascending: false })
			.limit(1);
	},

	getClientItemsDbForOrderCreate: async (clientId: string) => {
		const pageSize = 1000;
		let from = 0;
		const allRows: Array<{
			id: string;
			item_num: string | null;
			reference: string | null;
		}> = [];

		while (true) {
			const { data, error } = await supabase
				.from("items_db")
				.select("id, item_num, reference")
				.eq("client_id", clientId)
				.order("id", { ascending: true })
				.range(from, from + pageSize - 1);

			if (error) {
				return { data: null, error };
			}

			const rows = (data || []) as Array<{
				id: string;
				item_num: string | null;
				reference: string | null;
			}>;
			allRows.push(...rows);

			if (rows.length < pageSize) {
				break;
			}

			from += pageSize;
		}

		return { data: allRows, error: null };
	},

	createPackedItemsForInstances: async (
		rows: Array<{
			maintenance_db_id: string;
			pkg_instance_id: string;
			quantity: number;
			// false = "shadow" plan (order-create); only confirmed items count as packed.
			is_confirmed?: boolean;
		}>,
	) => {
		if (!rows.length) return { data: [], error: null };
		return supabase.from("pkd_item").insert(rows).select("id");
	},

	getPackingTypes: async () => {
		return supabase
			.from("packing_types")
			.select("id, code, name")
			.order("code", { ascending: true });
	},

	getSeiCategories: async () => {
		return supabase
			.from("sei_categories")
			.select("id, code, name, description")
			.order("id", { ascending: true });
	},

	getSeiProtections: async () => {
		return supabase
			.from("sei_protection")
			.select("id, code, name, description")
			.order("id", { ascending: true });
	},

	getBoxTypes: async () => {
		return supabase
			.from("box_type")
			.select("id, name")
			.order("name", { ascending: true });
	},

	getMaterialVariants: async () => {
		return supabase
			.from("material_variants")
			.select(
				"id, variant_name, width, thickness, unit:units_of_measure!material_variants_unit_id_fkey(id, name)",
			)
			.order("variant_name", { ascending: true });
	},

	getWoodMaterialVariants: async () => {
		return supabase
			.from("material_variants")
			.select("id, variant_name, materials(name)")
			.or("variant_name.ilike.%wood%,materials.name.ilike.%wood%")
			.order("variant_name", { ascending: true });
	},

	getMaterialVariantsByTag: async (tagName: string) => {
		return supabase
			.from("material_variants")
			.select(
				"id, variant_name, width, thickness, material_variant_tags(tags(name))",
			)
			.eq("material_variant_tags.tags.name", tagName)
			.order("variant_name", { ascending: true });
	},

	getMaterialVariantById: async (id: string) => {
		return supabase
			.from("material_variants")
			.select("id, variant_name, width, thickness")
			.eq("id", id)
			.single();
	},

	createPackageInfo: async (payload: {
		internal_length?: number | null;
		internal_width?: number | null;
		internal_height?: number | null;
		external_length?: number | null;
		external_width?: number | null;
		external_height?: number | null;
		quantity?: number | null;
		packing_type_id?: string | null;
		sei_category?: number | null;
		sei_protection?: number | null;
		box_type_id?: string | null;
		tare?: number | null;
		net_weight?: number | null;
		gross_weight?: number | null;
	}) => {
		return supabase.from("package_info").insert(payload).select("*").single();
	},

	updateOrderPackageInfo: async (payload: {
		order_package_id: string;
		original_pkg_info: string | null;
		final_pkg_info: string | null;
	}) => {
		return supabase
			.from("order_packages")
			.update({
				original_pkg_info: payload.original_pkg_info,
				final_pkg_info: payload.final_pkg_info,
			})
			.eq("id", payload.order_package_id)
			.select("*")
			.single();
	},

	createPackageItems: async (
		payload: Array<{
			order_package_id: string;
			quantity: number;
			designation: string | null;
			length?: number | null;
			width?: number | null;
			height?: number | null;
		}>,
	) => {
		return supabase.from("package_items").insert(payload).select("*");
	},

	createOrderPackageMaterials: async (
		payload: Array<{
			order_package_id: string;
			material_variant_id: string;
			material_type: string;
			is_final?: boolean;
			quantity?: number | null;
			unit_id?: string | null;
			length?: number | null;
			width?: number | null;
			height?: number | null;
			comment?: string | null;
		}>,
	) => {
		return supabase.from("order_package_materials").insert(payload).select("*");
	},

	createBeam: async (payload: {
		quantity?: number | null;
		type?: string | null;
		width?: number | null;
		thickness?: number | null;
		space?: number | null;
	}) => {
		return supabase.from("beam").insert(payload).select("id").single();
	},

	createSecuringTemplate: async (payload: {
		quantity?: number | null;
		type_id?: string | null;
		thickness?: number | null;
		horizontal_bar?: string | null;
		vertical_bar?: string | null;
		skids?: string | null;
	}) => {
		return supabase
			.from("securing_template")
			.insert(payload)
			.select("id")
			.single();
	},

	createOrderPackageSecuring: async (payload: {
		order_package_id: string;
		securing_template_id: string | null;
		securing_side: "big_sides" | "small_sides" | "lid" | "base";
		is_final: boolean;
	}) => {
		return supabase.from("order_package_securing").insert(payload);
	},

	// ── Bulk variants (one insert per call; callers chunk + correlate by order) ──
	// PostgREST returns inserted rows in input order, so the returned id[] lines up
	// with the input payload[] index-for-index.
	createPackageInfos: async (
		payloads: Array<Record<string, unknown>>,
	): Promise<{ data: Array<{ id: string }> | null; error: unknown }> => {
		if (!payloads.length) return { data: [], error: null };
		return supabase.from("package_info").insert(payloads).select("id");
	},

	createBeams: async (
		payloads: Array<{
			quantity?: number | null;
			type?: string | null;
			width?: number | null;
			thickness?: number | null;
			space?: number | null;
		}>,
	): Promise<{ data: Array<{ id: string }> | null; error: unknown }> => {
		if (!payloads.length) return { data: [], error: null };
		return supabase.from("beam").insert(payloads).select("id");
	},

	createSecuringTemplates: async (
		payloads: Array<{
			quantity?: number | null;
			type_id?: string | null;
			thickness?: number | null;
			horizontal_bar?: string | null;
			vertical_bar?: string | null;
			skids?: string | null;
		}>,
	): Promise<{ data: Array<{ id: string }> | null; error: unknown }> => {
		if (!payloads.length) return { data: [], error: null };
		return supabase.from("securing_template").insert(payloads).select("id");
	},

	createOrderPackageSecurings: async (
		payloads: Array<{
			order_package_id: string;
			securing_template_id: string | null;
			securing_side: "big_sides" | "small_sides" | "lid" | "base";
			is_final: boolean;
		}>,
	): Promise<{ error: unknown }> => {
		if (!payloads.length) return { error: null };
		const { error } = await supabase
			.from("order_package_securing")
			.insert(payloads);
		return { error };
	},

	getOrders: async () => {
		const { data, error } = await supabase
			.from("orders")
			.select("*, clients(name), order_packages(id)")
			.order("created_at", { ascending: false });

		if (error) return { data, error };

		const mappedData = data?.map((order: any) => ({
			...order,
			client_name: order.clients?.name || "",
			package_count: order.order_packages?.length || 0,
		}));

		return { data: mappedData, error: null };
	},

	getOrderById: async (id: string) => {
		return supabase
			.from("orders")
			.select("*, order_packages(*)")
			.eq("id", id)
			.single();
	},

	getUsers: async () => {
		return supabase
			.from("profiles")
			.select("*, roles(*)")
			.order("full_name", { ascending: true });
	},

	getPackerAssignmentStatus: async () => {
		return supabase.rpc("get_packer_assignment_status");
	},

	forceReleasePacker: async (packerId: string) => {
		return supabase.rpc("admin_force_release_packer", {
			packer_uuid: packerId,
		});
	},

	getOrdersWithTeams: async () => {
		return supabase
			.from("orders")
			.select(
				"id, order_name, production_status, order_team_members(id, is_team_lead, packer:profiles(id, full_name, username))",
			)
			.neq("production_status", "completed")
			.order("created_at", { ascending: false });
	},

	assignPackerToOrder: async (orderId: string, packerId: string) => {
		return supabase
			.from("order_team_members")
			.insert({ order_id: orderId, packer_id: packerId });
	},

	removePackerFromOrder: async (orderId: string, packerId: string) => {
		return supabase
			.from("order_team_members")
			.delete()
			.match({ order_id: orderId, packer_id: packerId });
	},

	removeAllPackersFromOrder: async (orderId: string) => {
		return supabase
			.from("order_team_members")
			.delete()
			.match({ order_id: orderId });
	},

	addTeamLead: async (orderId: string, packerId: string) => {
		return supabase.rpc("add_team_lead", {
			order_uuid: orderId,
			packer_uuid: packerId,
		});
	},

	removeTeamLead: async (orderId: string, packerId: string) => {
		return supabase.rpc("remove_team_lead", {
			order_uuid: orderId,
			packer_uuid: packerId,
		});
	},

	getRoles: async () => {
		return supabase
			.from("roles")
			.select("id, name")
			.order("name", { ascending: true });
	},

	createUserWithProfile: async (payload: {
		email: string;
		password: string;
		full_name: string;
		username?: string | null;
		phone_number?: string | null;
		role_name: string;
		status?: string | null;
		client_id?: string | null;
	}) => {
		const { data: sessionData } = await supabase.auth.getSession();
		const accessToken = sessionData?.session?.access_token;

		return supabase.functions.invoke("create-user", {
			body: payload,
			headers: accessToken
				? { Authorization: `Bearer ${accessToken}` }
				: undefined,
		});
	},

	getInventory: async () => {
		return supabase
			.from("materials")
			.select("*, material_variants(*)")
			.order("name", { ascending: true });
	},

	getOrderStats: async () => {
		const { data: orders } = await supabase
			.from("orders")
			.select("production_status, created_at");
		if (!orders) return { total: 0, pending: 0, inProgress: 0, completed: 0 };
		return {
			total: orders.length,
			pending: orders.filter((o) => o.production_status === "pending").length,
			inProgress: orders.filter((o) => o.production_status === "in_progress")
				.length,
			completed: orders.filter((o) => o.production_status === "completed")
				.length,
		};
	},

	getOrdersByDate: async (days: number = 30) => {
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);
		const { data: orders } = await supabase
			.from("orders")
			.select("created_at, production_status")
			.gte("created_at", startDate.toISOString())
			.order("created_at", { ascending: true });
		return orders || [];
	},
};
