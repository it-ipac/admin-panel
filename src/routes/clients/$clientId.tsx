import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Database,
	Globe,
	Image as ImageIcon,
	Loader2,
	Package,
	Upload,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ItemDbRecordForm } from "../../components/clients/ItemDbRecordForm";
import { TaqaDataImportPanel } from "../../components/clients/TaqaDataImportPanel";
import { Sidebar } from "../../components/Sidebar";
import { useToastContext } from "../../components/ui/ToastProvider";
import { useAuth } from "../../hooks/useAuth";
import { db, supabase } from "../../lib/supabase";

export const Route = createFileRoute("/clients/$clientId")({
	component: ClientWorkspacePage,
});

type ClientRow = {
	id: string;
	name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	portal_settings_id: string | null;
};

type PortalConfigState = {
	slug: string;
	is_active: boolean;
	portal_requires_auth: boolean;
	show_qr_logo: boolean;
	qr_logo_url: string;
};

type MaintenanceCategoryRow = {
	id: string;
	label: string | null;
	tags: string[];
};

type MaintenanceDbRow = {
	[key: string]: string | number | boolean | null;
	id: string;
	category_id: string | null;
};

const ITEMS_DB_COLUMN_ORDER = [
	"id",
	"category_id",
	"item_num",
	"packages",
	"reference",
	"description",
	"expected_qty",
	"packed_qty",
	"warehouse_location",
	"length",
	"width",
	"height",
	"ipac_comments",
	"created_at",
	"updated_at",
];

const normalizeWords = (value: string | null | undefined) =>
	(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

const containsWord = (source: string, word: string) =>
	new RegExp(`\\b${word}\\b`, "i").test(source);

const hasNonAcMarker = (source: string) =>
	containsWord(source, "non") ||
	source.includes("without ac") ||
	source.includes("no ac");

const hasAcOnlyMarker = (source: string) =>
	containsWord(source, "ac") && !hasNonAcMarker(source);

const buildCategorySearchText = (category: MaintenanceCategoryRow) =>
	normalizeWords([category.label || "", ...category.tags].join(" "));

const EMPTY_PORTAL_CONFIG: PortalConfigState = {
	slug: "",
	is_active: false,
	portal_requires_auth: true,
	show_qr_logo: true,
	qr_logo_url: "",
};

const DEFAULT_QR_LOGO_PATH = "assets/default_qr_logo.png";

function ItemPackagesList({ itemId }: { itemId?: string }) {
	const {
		data: boxes,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["item-boxes", itemId],
		queryFn: async () => {
			if (!itemId) return [];
			const { data, error } = await supabase
				.from("pkd_item")
				.select(`
					id,
					quantity,
					order_pkg_instance (
						ipac_reference,
						order_packages (
							id,
							package_number,
							orders (
								id,
								order_name
							)
						)
					)
				`)
				.eq("maintenance_db_id", itemId);
			if (error) throw error;
			return data || [];
		},
		enabled: !!itemId,
	});

	if (isLoading) {
		return (
			<div className="py-8 flex justify-center">
				<Loader2 className="w-6 h-6 animate-spin text-primary-600" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-danger-600 bg-danger-50 rounded">
				Failed to load packages.
			</div>
		);
	}

	if (!boxes || boxes.length === 0) {
		return (
			<div className="p-4 text-neutral-500 text-center">
				Not found in any packages.
			</div>
		);
	}

	return (
		<div className="space-y-2 max-h-[60vh] overflow-y-auto">
			{boxes.map((pi: any) => {
				const instance = pi.order_pkg_instance;
				const pkg = instance?.order_packages;
				const order = pkg?.orders;

				let name = "Unknown Box";
				if (instance?.ipac_reference) {
					name = instance.ipac_reference;
				} else if (order?.order_name && pkg?.package_number) {
					name = `${order.order_name} - Box ${pkg.package_number}`;
				} else if (pkg?.package_number) {
					name = `Box ${pkg.package_number}`;
				}

				const orderId = order?.id;
				const pkgId = pkg?.id;
				const linkUrl = orderId
					? `/orders/${orderId}?packageId=${pkgId}&moveToBox=${encodeURIComponent(name)}`
					: null;

				return (
					<div
						key={pi.id}
						className="flex justify-between items-center p-3 bg-neutral-50 rounded border border-neutral-200"
					>
						<div className="font-medium text-neutral-800">
							{linkUrl ? (
								<a
									href={linkUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary-600 hover:text-primary-800 hover:underline transition-colors"
								>
									{name}
								</a>
							) : (
								name
							)}
						</div>
						<div className="text-sm font-semibold text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
							Qty: {pi.quantity}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function EditableCell({
	initialValue,
	column,
	rowId,
	updateDb,
}: {
	initialValue: any;
	column: string;
	rowId: string;
	updateDb: (id: string, col: string, val: any) => void;
}) {
	const [val, setVal] = useState(
		initialValue === null || initialValue === undefined ? "" : initialValue,
	);
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		if (!isTyping) {
			setVal(
				initialValue === null || initialValue === undefined ? "" : initialValue,
			);
		}
	}, [initialValue, isTyping]);

	useEffect(() => {
		if (!isTyping) return;
		const handler = setTimeout(() => {
			setIsTyping(false);
			updateDb(rowId, column, val === "" ? null : val);
		}, 800);
		return () => clearTimeout(handler);
	}, [val, isTyping, updateDb, rowId, column]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setVal(e.target.value);
		setIsTyping(true);
	};

	return (
		<input
			className="w-full min-w-[80px] border border-transparent hover:border-neutral-300 focus:border-primary-400 focus:bg-white bg-transparent px-1 py-0.5 rounded text-xs outline-none transition-colors"
			value={val}
			onChange={handleChange}
			title={typeof val === "string" && val.length > 50 ? val : undefined}
		/>
	);
}

function ClientWorkspacePage() {
	const { clientId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { toast } = useToastContext();
	const { user, loading: authLoading } = useAuth();

	const [mounted, setMounted] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [portalConfig, setPortalConfig] =
		useState<PortalConfigState>(EMPTY_PORTAL_CONFIG);

	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [defaultLogoUrl, setDefaultLogoUrl] = useState<string | null>(null);
	const [logoLoadFailed, setLogoLoadFailed] = useState(false);
	const [itemNumberFilter, setItemNumberFilter] = useState<string>("");
	const [itemsPage, setItemsPage] = useState<number>(1);
	const [itemsPerPage, setItemsPerPage] = useState<number>(1000);
	const [selectedProjectFilter, setSelectedProjectFilter] = useState<
		"all" | "power" | "water"
	>("all");
	const [selectedAcFilter, setSelectedAcFilter] = useState<
		"all" | "ac" | "non-ac"
	>("all");
	const clientLogoInputRef = useRef<HTMLInputElement>(null);
	const [selectedItemForPackages, setSelectedItemForPackages] =
		useState<MaintenanceDbRow | null>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const { data } = supabase.storage
			.from("media")
			.getPublicUrl(DEFAULT_QR_LOGO_PATH);
		setLogoLoadFailed(false);
		setDefaultLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
	}, []);

	useEffect(() => {
		if (!authLoading && !user) {
			navigate({ to: "/login" });
		}
	}, [authLoading, navigate, user]);

	const {
		data: client,
		isLoading: loadingClient,
		error: clientError,
	} = useQuery({
		queryKey: ["client-workspace", clientId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("clients")
				.select(
					"id, name, contact_person, email, phone, address, portal_settings_id",
				)
				.eq("id", clientId)
				.single();
			if (error) throw error;
			return data as ClientRow;
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const {
		data: categories,
		isLoading: loadingCategories,
		error: categoryError,
	} = useQuery({
		queryKey: ["client-pkg-categories", clientId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from("pkg_category")
				.select(`id, label, category_tag_map ( project_tags ( name ) )`)
				.eq("client_id", clientId)
				.order("label", { ascending: true });
			if (error) throw error;

			return ((data || []) as any[]).map((row) => {
				const tags = ((row.category_tag_map || []) as any[])
					.flatMap((mapRow) => {
						const related = mapRow?.project_tags;
						if (Array.isArray(related)) {
							return related
								.map((tag) => String(tag?.name || "").trim())
								.filter(Boolean);
						}
						const single = String(related?.name || "").trim();
						return single ? [single] : [];
					})
					.filter(Boolean);

				return {
					id: String(row.id),
					label: (row.label as string | null) || null,
					tags: Array.from(new Set(tags)),
				} as MaintenanceCategoryRow;
			});
		},
		enabled: !!client,
	});

	const {
		data: maintenanceSnapshot,
		isLoading: loadingSnapshot,
		error: snapshotError,
	} = useQuery({
		queryKey: ["client-items-db-snapshot", clientId],
		queryFn: async () => {
			const [{ count, error: countError }] = await Promise.all([
				supabase
					.from("items_db")
					.select("id", { count: "exact", head: true })
					.eq("client_id", clientId),
			]);

			if (countError) throw countError;

			// Fetch all rows bypassing standard 1000 limit
			let allRows: any[] = [];
			const batchSize = 1000;
			for (let i = 0; i < (count || 0); i += batchSize) {
				const { data: batch, error: batchError } = await supabase
					.from("items_db")
					.select("*")
					.eq("client_id", clientId)
					.order("created_at", { ascending: false })
					.range(i, i + batchSize - 1);

				if (batchError) throw batchError;
				if (batch && batch.length > 0) {
					allRows = [...allRows, ...batch];
				}
				if (!batch || batch.length < batchSize) {
					break;
				}
			}

			return {
				totalRows: count || 0,
				rows: allRows as MaintenanceDbRow[],
			};
		},
		enabled: !!client,
	});

	const { data: portalSettings, isLoading: loadingPortalSettings } = useQuery({
		queryKey: ["client-portal-settings", clientId, client?.portal_settings_id],
		queryFn: async () => {
			if (!client?.portal_settings_id) return null;
			const { data, error } = await db.getPortalSettings(
				client.portal_settings_id,
			);
			if (error) throw error;
			return data as any;
		},
		enabled: !!client,
	});

	useEffect(() => {
		if (!client) return;
		if (!portalSettings) {
			setPortalConfig(EMPTY_PORTAL_CONFIG);
			return;
		}

		setPortalConfig({
			slug: portalSettings.portal_slug || "",
			is_active: portalSettings.is_active ?? false,
			portal_requires_auth: portalSettings.requires_auth ?? true,
			show_qr_logo: portalSettings.show_qr_logo ?? true,
			qr_logo_url: portalSettings.qr_logo_url || "",
		});
	}, [client, portalSettings]);

	const categoryById = useMemo(() => {
		const entries: Array<[string, MaintenanceCategoryRow]> = (
			categories || []
		).map((category) => [category.id, category]);
		return new Map<string, MaintenanceCategoryRow>(entries);
	}, [categories]);

	const handleCellUpdate = useCallback(
		(id: string, column: string, value: any) => {
			// Optimistically update React Query Cache
			queryClient.setQueryData(
				["client-items-db-snapshot", clientId],
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						rows: old.rows.map((row: any) =>
							row.id === id ? { ...row, [column]: value } : row,
						),
					};
				},
			);

			// Fire mutation to save to DB
			supabase
				.from("items_db")
				.update({ [column]: value })
				.eq("id", id)
				.then(({ error }) => {
					if (error) {
						toast({
							title: "Failed to save edit",
							description: error.message,
							variant: "error",
						});
						// Revert on failure
						queryClient.invalidateQueries({
							queryKey: ["client-items-db-snapshot", clientId],
						});
					}
				});
		},
		[queryClient, clientId, toast],
	);

	const filteredSnapshotRows = useMemo(() => {
		const rows = maintenanceSnapshot?.rows || [];

		return rows.filter((row) => {
			const categoryId =
				typeof row.category_id === "string" ? row.category_id : null;
			const category = categoryId ? categoryById.get(categoryId) : undefined;
			const categorySearchText = category
				? buildCategorySearchText(category)
				: "";

			if (itemNumberFilter.trim() !== "") {
				const cleanItemNumStr = String(row.item_num || "")
					.toLowerCase()
					.replace(/\s+/g, "");
				const cleanFilter = itemNumberFilter.toLowerCase().replace(/\s+/g, "");
				if (!cleanItemNumStr.includes(cleanFilter)) {
					return false;
				}
			}

			if (selectedProjectFilter !== "all") {
				if (!categorySearchText) return false;
				const wantsPower = selectedProjectFilter === "power";
				const hasProjectType = wantsPower
					? containsWord(categorySearchText, "power")
					: containsWord(categorySearchText, "water");
				if (!hasProjectType) {
					return false;
				}
			}

			if (selectedAcFilter !== "all") {
				if (!categorySearchText) return false;
				if (selectedAcFilter === "ac" && !hasAcOnlyMarker(categorySearchText))
					return false;
				if (
					selectedAcFilter === "non-ac" &&
					hasAcOnlyMarker(categorySearchText)
				)
					return false;
			}

			return true;
		});
	}, [
		maintenanceSnapshot?.rows,
		categoryById,
		itemNumberFilter,
		selectedProjectFilter,
		selectedAcFilter,
	]);

	// Reset page when filters change
	// biome-ignore lint/correctness/useExhaustiveDependencies: Reset page when filters change
	useEffect(() => {
		setItemsPage(1);
	}, [filteredSnapshotRows]);

	const totalPages = Math.ceil(filteredSnapshotRows.length / itemsPerPage) || 1;
	const paginatedRows = useMemo(() => {
		const start = (itemsPage - 1) * itemsPerPage;
		return filteredSnapshotRows.slice(start, start + itemsPerPage);
	}, [filteredSnapshotRows, itemsPage, itemsPerPage]);

	const snapshotColumns = useMemo(() => {
		const rows = maintenanceSnapshot?.rows || [];
		if (!rows.length) return ITEMS_DB_COLUMN_ORDER;

		const keys = [...Object.keys(rows[0]), "packages"];
		const preferred = ITEMS_DB_COLUMN_ORDER.filter((column) =>
			keys.includes(column),
		);
		const extras = keys.filter(
			(column) =>
				!preferred.includes(column) &&
				column !== "client_id" &&
				column !== "pkd_item",
		);
		return [...preferred, ...extras];
	}, [maintenanceSnapshot?.rows]);

	const formatSnapshotCell = (row: MaintenanceDbRow, column: string) => {
		if (column === "packages") {
			const packedQty = Number(row.packed_qty || 0);
			if (packedQty === 0) return "-";

			return (
				<button
					onClick={() => setSelectedItemForPackages(row)}
					className="flex items-center gap-1 bg-primary-50 text-primary-700 hover:bg-primary-100 px-2 py-1 rounded text-xs font-semibold"
				>
					<Package className="w-3 h-3" />
					View Boxes ({packedQty})
				</button>
			);
		}

		if (column === "category_id") {
			const value = row[column];
			if (typeof value === "string") {
				const category = categoryById.get(value);
				return category?.label || "(No label)";
			}
			return "-";
		}

		const editableColumns = [
			"item_num",
			"reference",
			"description",
			"expected_qty",
			"packed_qty",
			"warehouse_location",
			"length",
			"width",
			"height",
			"ipac_comments",
		];

		if (editableColumns.includes(column)) {
			return (
				<EditableCell
					initialValue={row[column]}
					column={column}
					rowId={row.id}
					updateDb={handleCellUpdate}
				/>
			);
		}

		const value = row[column];
		if (value === null || value === undefined || value === "") return "-";

		if (typeof value === "boolean") return value ? "true" : "false";
		return String(value);
	};

	const savePortalConfigMutation = useMutation({
		mutationFn: async () => {
			if (!client) throw new Error("Client not loaded.");

			const { data: defaultLogoData } = supabase.storage
				.from("media")
				.getPublicUrl(DEFAULT_QR_LOGO_PATH);

			const resolvedQrLogoUrl = portalConfig.show_qr_logo
				? portalConfig.qr_logo_url.trim() || defaultLogoData.publicUrl
				: null;

			const payload = {
				id: client.portal_settings_id || undefined,
				slug: portalConfig.slug.trim(),
				is_active: portalConfig.is_active,
				portal_requires_auth: portalConfig.portal_requires_auth,
				show_qr_logo: portalConfig.show_qr_logo,
				qr_logo_url: resolvedQrLogoUrl,
			};

			const { data: updatedSettings, error: settingError } =
				await db.upsertPortalSettings(payload);
			if (settingError) throw settingError;

			if (!client.portal_settings_id) {
				const { error: linkError } = await db.updateClient(client.id, {
					portal_settings_id: updatedSettings.id,
				});
				if (linkError) throw linkError;
			}

			return updatedSettings;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			queryClient.invalidateQueries({
				queryKey: ["client-workspace", clientId],
			});
			queryClient.invalidateQueries({
				queryKey: ["client-portal-settings", clientId],
			});
			setFormError(null);
			toast({
				title: "Portal settings saved",
				description: "Client portal configuration updated successfully.",
				variant: "success",
			});
		},
		onError: (error: any) => {
			setFormError(error?.message || "Failed to save portal settings.");
		},
	});

	const handleUploadClientLogo = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			setUploadingLogo(true);
			const extension = file.name.split(".").pop() || "png";
			const path = `client_logos/${clientId}_${Date.now()}.${extension}`;
			const { error } = await db.uploadLogo(file, path);
			if (error) throw error;

			const { data } = supabase.storage.from("media").getPublicUrl(path);
			setPortalConfig((previous) => ({
				...previous,
				qr_logo_url: data.publicUrl,
			}));
			setFormError(null);
			toast({
				title: "Logo uploaded",
				description: "Custom QR logo ready. Save settings to persist.",
				variant: "info",
			});
		} catch (error: any) {
			setFormError(error?.message || "Failed to upload client logo.");
		} finally {
			setUploadingLogo(false);
			if (clientLogoInputRef.current) clientLogoInputRef.current.value = "";
		}
	};

	if (!mounted) return null;

	if (authLoading || loadingClient) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-neutral-50">
				<Loader2 className="w-8 h-8 animate-spin text-primary-600" />
			</div>
		);
	}

	if (clientError || !client) {
		return (
			<div className="flex h-screen bg-neutral-50">
				<Sidebar />
				<main className="flex-1 overflow-y-auto p-8">
					<div className="max-w-5xl mx-auto">
						<Link
							to="/clients"
							className="inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to Clients
						</Link>
						<div className="mt-6 rounded-xl border border-danger-200 bg-danger-50 p-4 text-danger-700">
							Could not load this client workspace.
						</div>
					</div>
				</main>
			</div>
		);
	}

	const isTaqaClient = /(taqa|taka)/i.test(client.name || "");

	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto p-8">
				<div className="max-w-6xl mx-auto space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Link
								to="/clients"
								className="inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800"
							>
								<ArrowLeft className="w-4 h-4" />
								Back to Clients
							</Link>
							<h1 className="mt-3 text-2xl font-bold text-neutral-900">
								{client.name}
							</h1>
							<p className="text-neutral-500 mt-1">
								Client workspace: portal settings, items DB snapshot, and import
								tools.
							</p>
						</div>
						<div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
							{client.contact_person && <p>Contact: {client.contact_person}</p>}
							{client.email && <p>Email: {client.email}</p>}
							{client.phone && <p>Phone: {client.phone}</p>}
						</div>
					</div>

					<section className="rounded-xl border border-neutral-200 bg-white p-6">
						<div className="flex items-center gap-2 mb-4">
							<Globe className="h-5 w-5 text-primary-700" />
							<h2 className="text-lg font-semibold text-neutral-900">
								Portal Settings
							</h2>
						</div>

						<label className="flex items-center cursor-pointer justify-between rounded-lg border border-primary-100 bg-primary-50 p-4">
							<div>
								<div className="font-semibold text-primary-900">
									Enable Client Portal
								</div>
								<div className="text-sm text-primary-700">
									Turn this on to enable QR tracking for this client.
								</div>
							</div>
							<div className="relative">
								<input
									type="checkbox"
									className="sr-only"
									checked={portalConfig.is_active}
									onChange={(event) =>
										setPortalConfig((previous) => ({
											...previous,
											is_active: event.target.checked,
										}))
									}
								/>
								<div
									className={`block h-8 w-14 rounded-full transition-colors ${
										portalConfig.is_active ? "bg-primary-600" : "bg-neutral-300"
									}`}
								/>
								<div
									className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform ${
										portalConfig.is_active ? "translate-x-6" : ""
									}`}
								/>
							</div>
						</label>

						<div
							className={`mt-5 space-y-4 ${!portalConfig.is_active ? "opacity-50" : ""}`}
						>
							<div>
								<label
									htmlFor="portal-slug"
									className="text-sm font-semibold text-neutral-700"
								>
									URL Slug *
								</label>
								<p className="mb-1 text-xs text-neutral-500">
									Example: ipac-admin.vercel.app/portal/your-slug/...
								</p>
								<input
									id="portal-slug"
									className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-primary-500"
									value={portalConfig.slug}
									onChange={(event) =>
										setPortalConfig((previous) => ({
											...previous,
											slug: event.target.value,
										}))
									}
								/>
							</div>

							<label className="flex items-center gap-3">
								<input
									type="checkbox"
									className="h-5 w-5 rounded text-primary-600"
									checked={portalConfig.portal_requires_auth}
									onChange={(event) =>
										setPortalConfig((previous) => ({
											...previous,
											portal_requires_auth: event.target.checked,
										}))
									}
								/>
								<div>
									<div className="font-medium text-neutral-800">
										Require Authentication
									</div>
									<div className="text-xs text-neutral-500">
										Require login before viewing portal data.
									</div>
								</div>
							</label>

							<label className="flex items-center gap-3">
								<input
									type="checkbox"
									className="h-5 w-5 rounded text-primary-600"
									checked={portalConfig.show_qr_logo}
									onChange={(event) =>
										setPortalConfig((previous) => ({
											...previous,
											show_qr_logo: event.target.checked,
										}))
									}
								/>
								<div>
									<div className="font-medium text-neutral-800">
										Show Logo in QR Codes
									</div>
									<div className="text-xs text-neutral-500">
										Use default or custom logo in generated QR.
									</div>
								</div>
							</label>

							<div
								className={`pt-2 ${!portalConfig.show_qr_logo ? "opacity-40 pointer-events-none" : ""}`}
							>
								<label
									htmlFor="qr-logo-upload"
									className="inline-block mb-1 text-sm font-semibold text-neutral-700"
								>
									QR Code Logo
								</label>
								<div className="flex items-center gap-4">
									<div className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-2">
										{portalConfig.qr_logo_url ? (
											<img
												src={portalConfig.qr_logo_url}
												className="h-16 w-16 object-contain"
												alt="Client custom logo"
											/>
										) : defaultLogoUrl && !logoLoadFailed ? (
											<img
												src={defaultLogoUrl}
												className="h-16 w-16 object-contain opacity-75"
												alt="Default IPAC logo"
											/>
										) : (
											<div className="flex h-16 w-16 items-center justify-center">
												<ImageIcon className="h-6 w-6 text-neutral-400" />
											</div>
										)}
									</div>

									<input
										id="qr-logo-upload"
										type="file"
										ref={clientLogoInputRef}
										className="hidden"
										accept="image/*"
										onChange={handleUploadClientLogo}
									/>

									<div className="flex flex-col gap-2">
										<button
											onClick={() => clientLogoInputRef.current?.click()}
											disabled={uploadingLogo}
											className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
										>
											{uploadingLogo ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Upload className="h-4 w-4" />
											)}
											{portalConfig.qr_logo_url
												? "Replace Image"
												: "Upload Custom Image"}
										</button>
										{portalConfig.qr_logo_url && (
											<button
												onClick={() =>
													setPortalConfig((previous) => ({
														...previous,
														qr_logo_url: "",
													}))
												}
												className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-100"
											>
												Remove Custom Logo
											</button>
										)}
									</div>
								</div>
							</div>
						</div>

						{formError && (
							<div className="mt-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
								{formError}
							</div>
						)}

						<div className="mt-6 flex justify-end">
							<button
								onClick={() => {
									setFormError(null);
									savePortalConfigMutation.mutate();
								}}
								disabled={
									savePortalConfigMutation.isPending ||
									(portalConfig.is_active && !portalConfig.slug.trim())
								}
								className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
							>
								{savePortalConfigMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Save Portal Settings"
								)}
							</button>
						</div>
					</section>

					<section className="rounded-xl border border-neutral-200 bg-white p-6">
						<div className="flex items-center gap-2 mb-4">
							<Database className="h-5 w-5 text-steel-700" />
							<h2 className="text-lg font-semibold text-neutral-900">
								Items DB Snapshot
							</h2>
						</div>

						{loadingCategories || loadingSnapshot || loadingPortalSettings ? (
							<div className="py-10 flex items-center justify-center">
								<Loader2 className="h-6 w-6 animate-spin text-primary-600" />
							</div>
						) : categoryError || snapshotError ? (
							<div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
								Could not load items_db summary.
							</div>
						) : (
							<>
								<div className="grid grid-cols-2 gap-3 mb-4 md:w-80">
									<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
										<p className="text-xs uppercase tracking-wide text-neutral-500">
											Rows
										</p>
										<p className="text-xl font-semibold text-neutral-900">
											{maintenanceSnapshot?.totalRows || 0}
										</p>
									</div>
									<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
										<p className="text-xs uppercase tracking-wide text-neutral-500">
											Categories
										</p>
										<p className="text-xl font-semibold text-neutral-900">
											{categories?.length || 0}
										</p>
									</div>
								</div>

								<div className="mb-4 space-y-3">
									<div className="flex flex-wrap items-start gap-4">
										<div>
											<p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
												Item Number Filter
											</p>
											<input
												type="text"
												placeholder="Search item number..."
												value={itemNumberFilter}
												onChange={(e) => setItemNumberFilter(e.target.value)}
												className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
											/>
										</div>

										<div>
											<p className="text-xs uppercase tracking-wide text-neutral-500">
												Project Type
											</p>
											<div className="mt-2 flex flex-wrap gap-2">
												{(["all", "power", "water"] as const).map(
													(projectType) => (
														<button
															key={projectType}
															onClick={() =>
																setSelectedProjectFilter(projectType)
															}
															className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
																selectedProjectFilter === projectType
																	? "border-primary-300 bg-primary-50 text-primary-800"
																	: "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
															}`}
														>
															{projectType === "all"
																? "All"
																: projectType === "power"
																	? "Power"
																	: "Water"}
														</button>
													),
												)}
											</div>
										</div>

										<div>
											<p className="text-xs uppercase tracking-wide text-neutral-500">
												AC Mode
											</p>
											<div className="mt-2 flex flex-wrap gap-2">
												{(["all", "ac", "non-ac"] as const).map((acMode) => (
													<button
														key={acMode}
														onClick={() => setSelectedAcFilter(acMode)}
														className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
															selectedAcFilter === acMode
																? "border-primary-300 bg-primary-50 text-primary-800"
																: "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
														}`}
													>
														{acMode === "all"
															? "All"
															: acMode === "ac"
																? "AC"
																: "Non-AC"}
													</button>
												))}
											</div>
										</div>
									</div>
								</div>

								<div className="mb-2 flex items-center justify-between">
									<p className="text-xs text-neutral-500">
										Showing {filteredSnapshotRows.length} total rows matched.
									</p>
									<div className="flex items-center gap-2 text-xs text-neutral-600">
										<span>Items per page:</span>
										<select
											value={itemsPerPage}
											onChange={(e) => {
												setItemsPerPage(Number(e.target.value));
												setItemsPage(1);
											}}
											className="rounded border border-neutral-300 px-2 py-1 outline-none focus:border-primary-500"
										>
											<option value={500}>500</option>
											<option value={1000}>1000</option>
											<option value={5000}>5000</option>
										</select>
									</div>
								</div>

								<div className="overflow-x-auto rounded-lg border border-neutral-200">
									<div className="max-h-[65vh] overflow-auto">
										<table className="min-w-max w-full text-left text-xs">
											<thead className="sticky top-0 bg-neutral-100 z-10">
												<tr>
													{snapshotColumns.map((column) => (
														<th
															key={column}
															className="p-2 font-semibold text-neutral-700 whitespace-nowrap"
														>
															{column === "category_id" ? "Category" : column}
														</th>
													))}
												</tr>
											</thead>
											<tbody className="divide-y divide-neutral-100 bg-white">
												{paginatedRows.length === 0 ? (
													<tr>
														<td
															className="p-3 text-neutral-500 text-center"
															colSpan={snapshotColumns.length}
														>
															No rows match current filters.
														</td>
													</tr>
												) : (
													paginatedRows.map((row) => (
														<tr key={row.id}>
															{snapshotColumns.map((column) => (
																<td
																	key={`${row.id}-${column}`}
																	className="p-2 text-neutral-700 whitespace-nowrap"
																>
																	{formatSnapshotCell(row, column)}
																</td>
															))}
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>

								{/* Pagination Controls */}
								{filteredSnapshotRows.length > 0 && (
									<div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
										<p className="text-sm text-neutral-700">
											Showing{" "}
											<span className="font-semibold">
												{(itemsPage - 1) * itemsPerPage + 1}
											</span>{" "}
											to{" "}
											<span className="font-semibold">
												{Math.min(
													itemsPage * itemsPerPage,
													filteredSnapshotRows.length,
												)}
											</span>{" "}
											of{" "}
											<span className="font-semibold">
												{filteredSnapshotRows.length}
											</span>{" "}
											results
										</p>
										<div className="flex gap-2">
											<button
												onClick={() => setItemsPage((p) => Math.max(1, p - 1))}
												disabled={itemsPage === 1}
												className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 disabled:opacity-50 hover:bg-neutral-50 transition-colors"
											>
												Previous
											</button>
											<span className="px-3 py-1 text-sm text-neutral-600 border border-transparent">
												Page {itemsPage} of {totalPages}
											</span>
											<button
												onClick={() =>
													setItemsPage((p) => Math.min(totalPages, p + 1))
												}
												disabled={itemsPage === totalPages}
												className="rounded border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 disabled:opacity-50 hover:bg-neutral-50 transition-colors"
											>
												Next
											</button>
										</div>
									</div>
								)}
							</>
						)}
					</section>

					<section className="rounded-xl border border-neutral-200 bg-white p-6">
						<h2 className="text-lg font-semibold text-neutral-900 mb-2">
							Add / Update Item Record
						</h2>
						<p className="text-sm text-neutral-500 mb-4">
							Quickly add a new item or update the expected quantity of an
							existing one in the database.
						</p>
						<ItemDbRecordForm
							clientId={client.id}
							items={maintenanceSnapshot?.rows || []}
							categories={categories || []}
							onSuccess={() => {
								queryClient.invalidateQueries({
									queryKey: ["client-items-db-snapshot", clientId],
								});
							}}
						/>
					</section>

					<section className="rounded-xl border border-neutral-200 bg-white p-6">
						<h2 className="text-lg font-semibold text-neutral-900 mb-2">
							Import Items DB
						</h2>
						<p className="text-sm text-neutral-500 mb-4">
							Upload workbook rows directly into items_db for this client.
						</p>

						{isTaqaClient ? (
							<TaqaDataImportPanel
								clientId={client.id}
								clientName={client.name}
							/>
						) : (
							<div className="rounded-lg border border-warning-200 bg-warning-50 p-4 text-warning-900 text-sm">
								This parser is configured for TAQA/Taka workbook format only. It
								is disabled for this client.
							</div>
						)}
					</section>
				</div>
			</main>

			<Dialog.Root
				open={!!selectedItemForPackages}
				onOpenChange={(open) => !open && setSelectedItemForPackages(null)}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
					<Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white p-6 rounded-xl shadow-xl w-[90vw] max-w-lg z-50">
						<div className="flex justify-between items-center mb-4">
							<Dialog.Title className="text-lg font-bold text-neutral-900">
								Item Packages
							</Dialog.Title>
							<Dialog.Close className="text-neutral-400 hover:text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded p-1">
								<X className="w-5 h-5" />
							</Dialog.Close>
						</div>

						<ItemPackagesList itemId={selectedItemForPackages?.id} />
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
