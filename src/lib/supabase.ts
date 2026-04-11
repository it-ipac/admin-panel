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

	createClient: async (payload: {
		name: string;
		contact_person?: string | null;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
	}) => {
		return supabase.from("clients").insert(payload).select("*").single();
	},

	updateClient: async (id: string, payload: {
		name?: string;
		contact_person?: string | null;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
		portal_settings_id?: string | null;
	}) => {
		return supabase.from("clients").update(payload).eq("id", id).select("*").single();
	},

	getPortalSettings: async (id: string) => {
		return supabase.from("client_portal_settings").select("*").eq("id", id).single();
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
			qr_logo_url: payload.qr_logo_url
		};
		if (dbPayload.id) {
			return supabase.from("client_portal_settings")
				.update(dbPayload)
				.eq("id", dbPayload.id)
				.select("*")
				.single();
		} else {
			return supabase.from("client_portal_settings")
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

	getPackingTypes: async () => {
		return supabase
			.from("packing_types")
			.select("id, code, name")
			.order("code", { ascending: true });
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
			designation: string;
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
		return supabase.from("beam").insert(payload).select("*").single();
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
			.select("*")
			.single();
	},

	createOrderPackageSecuring: async (payload: {
		order_package_id: string;
		securing_template_id: string | null;
		securing_side: "big_sides" | "small_sides" | "lid" | "base";
		is_final: boolean;
	}) => {
		return supabase
			.from("order_package_securing")
			.insert(payload)
			.select("*")
			.single();
	},

	getOrders: async () => {
		return supabase
			.from("orders")
			.select("*")
			.order("created_at", { ascending: false });
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
