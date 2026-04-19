import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Database,
	Globe,
	Image as ImageIcon,
	Loader2,
	Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
	"client_id",
	"category_id",
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
	"created_at",
	"updated_at",
];

const normalizeWords = (value: string | null | undefined) =>
	(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const containsWord = (source: string, word: string) =>
	new RegExp(`\\b${word}\\b`, "i").test(source);

const hasNonAcMarker = (source: string) =>
	containsWord(source, "non") || source.includes("without ac") || source.includes("no ac");

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
	const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
	const [selectedProjectFilter, setSelectedProjectFilter] = useState<
		"all" | "power" | "water"
	>("all");
	const [selectedAcFilter, setSelectedAcFilter] = useState<"all" | "ac" | "non-ac">("all");
	const clientLogoInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const { data } = supabase.storage
			.from("media")
			.getPublicUrl("assets/default_qr_logo.png");
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
				.select("id, name, contact_person, email, phone, address, portal_settings_id")
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
				.select(
					`id, label, category_tag_map ( project_tags ( name ) )`,
				)
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
			const [{ count, error: countError }, { data, error: rowsError }] =
				await Promise.all([
					supabase
						.from("items_db")
						.select("id", { count: "exact", head: true })
						.eq("client_id", clientId),
					supabase
						.from("items_db")
						.select("*")
						.eq("client_id", clientId)
						.order("created_at", { ascending: false }),
				]);

			if (countError) throw countError;
			if (rowsError) throw rowsError;

			return {
				totalRows: count || 0,
				rows: (data || []) as MaintenanceDbRow[],
			};
		},
		enabled: !!client,
	});

	const { data: portalSettings, isLoading: loadingPortalSettings } = useQuery({
		queryKey: ["client-portal-settings", clientId, client?.portal_settings_id],
		queryFn: async () => {
			if (!client?.portal_settings_id) return null;
			const { data, error } = await db.getPortalSettings(client.portal_settings_id);
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
		const entries: Array<[string, MaintenanceCategoryRow]> = (categories || []).map(
			(category) => [category.id, category],
		);
		return new Map<string, MaintenanceCategoryRow>(entries);
	}, [categories]);

	const filteredSnapshotRows = useMemo(() => {
		const rows = maintenanceSnapshot?.rows || [];

		return rows.filter((row) => {
			const categoryId = typeof row.category_id === "string" ? row.category_id : null;
			const category = categoryId ? categoryById.get(categoryId) : undefined;
			const categorySearchText = category ? buildCategorySearchText(category) : "";

			if (selectedCategoryFilter !== "all" && categoryId !== selectedCategoryFilter) {
				return false;
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
				if (selectedAcFilter === "ac" && !hasAcOnlyMarker(categorySearchText)) return false;
				if (selectedAcFilter === "non-ac" && hasAcOnlyMarker(categorySearchText)) return false;
			}

			return true;
		});
	}, [
		maintenanceSnapshot?.rows,
		categoryById,
		selectedCategoryFilter,
		selectedProjectFilter,
		selectedAcFilter,
	]);

	useEffect(() => {
		if (selectedCategoryFilter === "all") return;
		const stillExists = (categories || []).some(
			(category) => category.id === selectedCategoryFilter,
		);
		if (!stillExists) {
			setSelectedCategoryFilter("all");
		}
	}, [categories, selectedCategoryFilter]);

	const snapshotColumns = useMemo(() => {
		const rows = maintenanceSnapshot?.rows || [];
		if (!rows.length) return ITEMS_DB_COLUMN_ORDER;

		const keys = Object.keys(rows[0]);
		const preferred = ITEMS_DB_COLUMN_ORDER.filter((column) =>
			keys.includes(column),
		);
		const extras = keys.filter((column) => !preferred.includes(column));
		return [...preferred, ...extras];
	}, [maintenanceSnapshot?.rows]);

	const formatSnapshotCell = (row: MaintenanceDbRow, column: string) => {
		const value = row[column];
		if (value === null || value === undefined || value === "") return "-";

		if (column === "category_id" && typeof value === "string") {
			const category = categoryById.get(value);
			const label = category?.label || "(No label)";
			return category ? `${value} (${label})` : value;
		}

		if (typeof value === "boolean") return value ? "true" : "false";
		return String(value);
	};

	const savePortalConfigMutation = useMutation({
		mutationFn: async () => {
			if (!client) throw new Error("Client not loaded.");

			const payload = {
				id: client.portal_settings_id || undefined,
				slug: portalConfig.slug.trim(),
				is_active: portalConfig.is_active,
				portal_requires_auth: portalConfig.portal_requires_auth,
				show_qr_logo: portalConfig.show_qr_logo,
				qr_logo_url: portalConfig.qr_logo_url || null,
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
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	if (clientError || !client) {
		return (
			<div className="flex h-screen bg-gray-50">
				<Sidebar />
				<main className="flex-1 overflow-y-auto p-8">
					<div className="max-w-5xl mx-auto">
						<Link
							to="/clients"
							className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
						>
							<ArrowLeft className="w-4 h-4" />
							Back to Clients
						</Link>
						<div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
							Could not load this client workspace.
						</div>
					</div>
				</main>
			</div>
		);
	}

	const isTaqaClient = /(taqa|taka)/i.test(client.name || "");

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto p-8">
				<div className="max-w-6xl mx-auto space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Link
								to="/clients"
								className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800"
							>
								<ArrowLeft className="w-4 h-4" />
								Back to Clients
							</Link>
							<h1 className="mt-3 text-2xl font-bold text-gray-900">{client.name}</h1>
							<p className="text-gray-500 mt-1">
								Client workspace: portal settings, items DB snapshot, and
								import tools.
							</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
							{client.contact_person && <p>Contact: {client.contact_person}</p>}
							{client.email && <p>Email: {client.email}</p>}
							{client.phone && <p>Phone: {client.phone}</p>}
						</div>
					</div>

					<section className="rounded-xl border border-gray-200 bg-white p-6">
							<div className="flex items-center gap-2 mb-4">
								<Globe className="h-5 w-5 text-blue-700" />
								<h2 className="text-lg font-semibold text-gray-900">Portal Settings</h2>
							</div>

							<label className="flex items-center cursor-pointer justify-between rounded-lg border border-blue-100 bg-blue-50 p-4">
								<div>
									<div className="font-semibold text-blue-900">Enable Client Portal</div>
									<div className="text-sm text-blue-700">
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
											portalConfig.is_active ? "bg-blue-600" : "bg-gray-300"
										}`}
									/>
									<div
										className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform ${
											portalConfig.is_active ? "translate-x-6" : ""
										}`}
									/>
								</div>
							</label>

							<div className={`mt-5 space-y-4 ${!portalConfig.is_active ? "opacity-50" : ""}`}>
								<div>
									<label className="text-sm font-semibold text-gray-700">URL Slug *</label>
									<p className="mb-1 text-xs text-gray-500">
										Example: ipac-admin.vercel.app/portal/your-slug/...
									</p>
									<input
										className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
										className="h-5 w-5 rounded text-blue-600"
										checked={portalConfig.portal_requires_auth}
										onChange={(event) =>
											setPortalConfig((previous) => ({
												...previous,
												portal_requires_auth: event.target.checked,
											}))
										}
									/>
									<div>
										<div className="font-medium text-gray-800">Require Authentication</div>
										<div className="text-xs text-gray-500">Require login before viewing portal data.</div>
									</div>
								</label>

								<label className="flex items-center gap-3">
									<input
										type="checkbox"
										className="h-5 w-5 rounded text-blue-600"
										checked={portalConfig.show_qr_logo}
										onChange={(event) =>
											setPortalConfig((previous) => ({
												...previous,
												show_qr_logo: event.target.checked,
											}))
										}
									/>
									<div>
										<div className="font-medium text-gray-800">Show Logo in QR Codes</div>
										<div className="text-xs text-gray-500">Use default or custom logo in generated QR.</div>
									</div>
								</label>

								<div className={`pt-2 ${!portalConfig.show_qr_logo ? "opacity-40 pointer-events-none" : ""}`}>
									<label className="inline-block mb-1 text-sm font-semibold text-gray-700">QR Code Logo</label>
									<div className="flex items-center gap-4">
										<div className="relative rounded-lg border border-gray-200 bg-gray-50 p-2">
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
													<ImageIcon className="h-6 w-6 text-gray-400" />
												</div>
											)}
										</div>

										<input
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
												className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
											>
												{uploadingLogo ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Upload className="h-4 w-4" />
												)}
												{portalConfig.qr_logo_url ? "Replace Image" : "Upload Custom Image"}
											</button>
											{portalConfig.qr_logo_url && (
												<button
													onClick={() =>
														setPortalConfig((previous) => ({ ...previous, qr_logo_url: "" }))
													}
													className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
												>
													Remove Custom Logo
												</button>
											)}
										</div>
									</div>
								</div>
							</div>

							{formError && (
								<div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
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
									className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
								>
									{savePortalConfigMutation.isPending ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										"Save Portal Settings"
									)}
								</button>
							</div>
					</section>

					<section className="rounded-xl border border-gray-200 bg-white p-6">
						<div className="flex items-center gap-2 mb-4">
							<Database className="h-5 w-5 text-slate-700" />
							<h2 className="text-lg font-semibold text-gray-900">Items DB Snapshot</h2>
						</div>

						{loadingCategories || loadingSnapshot || loadingPortalSettings ? (
							<div className="py-10 flex items-center justify-center">
								<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
							</div>
						) : categoryError || snapshotError ? (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								Could not load items_db summary.
							</div>
						) : (
							<>
								<div className="grid grid-cols-2 gap-3 mb-4 md:w-80">
									<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
										<p className="text-xs uppercase tracking-wide text-gray-500">Rows</p>
										<p className="text-xl font-semibold text-gray-900">
											{maintenanceSnapshot?.totalRows || 0}
										</p>
									</div>
									<div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
										<p className="text-xs uppercase tracking-wide text-gray-500">Categories</p>
										<p className="text-xl font-semibold text-gray-900">
											{categories?.length || 0}
										</p>
									</div>
								</div>

								<div className="mb-4 space-y-3">
									<div>
										<p className="text-xs uppercase tracking-wide text-gray-500">Category Labels</p>
										<div className="mt-2 flex flex-wrap gap-2">
											<button
												onClick={() => setSelectedCategoryFilter("all")}
												className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
													selectedCategoryFilter === "all"
														? "border-blue-300 bg-blue-50 text-blue-800"
														: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
												}`}
											>
												All Labels
											</button>
											{(categories || []).map((category) => (
												<button
													key={category.id}
													onClick={() => setSelectedCategoryFilter(category.id)}
													className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
														selectedCategoryFilter === category.id
															? "border-blue-300 bg-blue-50 text-blue-800"
															: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
													}`}
												>
													{category.label || "(No label)"}
												</button>
											))}
										</div>
									</div>

									<div className="flex flex-wrap items-start gap-4">
										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500">Project Type</p>
											<div className="mt-2 flex flex-wrap gap-2">
												{(["all", "power", "water"] as const).map((projectType) => (
													<button
														key={projectType}
														onClick={() => setSelectedProjectFilter(projectType)}
														className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
															selectedProjectFilter === projectType
																? "border-blue-300 bg-blue-50 text-blue-800"
																: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
														}`}
													>
														{projectType === "all"
															? "All"
															: projectType === "power"
																? "Power"
																: "Water"}
													</button>
												))}
											</div>
										</div>

										<div>
											<p className="text-xs uppercase tracking-wide text-gray-500">AC Mode</p>
											<div className="mt-2 flex flex-wrap gap-2">
												{(["all", "ac", "non-ac"] as const).map((acMode) => (
													<button
														key={acMode}
														onClick={() => setSelectedAcFilter(acMode)}
														className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
															selectedAcFilter === acMode
																? "border-blue-300 bg-blue-50 text-blue-800"
																: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
														}`}
													>
														{acMode === "all" ? "All" : acMode === "ac" ? "AC" : "Non-AC"}
													</button>
												))}
											</div>
										</div>
									</div>
								</div>

								<p className="mb-2 text-xs text-gray-500">
									Showing {filteredSnapshotRows.length} of {(maintenanceSnapshot?.rows || []).length} rows.
								</p>

								<div className="overflow-x-auto rounded-lg border border-gray-200">
									<div className="max-h-[65vh] overflow-auto">
										<table className="min-w-max w-full text-left text-xs">
											<thead className="sticky top-0 bg-gray-100">
												<tr>
													{snapshotColumns.map((column) => (
														<th key={column} className="p-2 font-semibold text-gray-700 whitespace-nowrap">
															{column}
														</th>
													))}
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-100 bg-white">
												{filteredSnapshotRows.length === 0 ? (
													<tr>
														<td className="p-3 text-gray-500" colSpan={snapshotColumns.length}>
															No rows match current filters.
														</td>
													</tr>
												) : (
													filteredSnapshotRows.map((row) => (
														<tr key={row.id}>
															{snapshotColumns.map((column) => (
																<td key={`${row.id}-${column}`} className="p-2 text-gray-700 whitespace-nowrap">
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
							</>
						)}
					</section>

					<section className="rounded-xl border border-gray-200 bg-white p-6">
						<h2 className="text-lg font-semibold text-gray-900 mb-2">
							Import Items DB
						</h2>
						<p className="text-sm text-gray-500 mb-4">
							Upload workbook rows directly into items_db for this client.
						</p>

						{isTaqaClient ? (
							<TaqaDataImportPanel clientId={client.id} clientName={client.name} />
						) : (
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
								This parser is configured for TAQA/Taka workbook format only. It is disabled for this client.
							</div>
						)}
					</section>
				</div>
			</main>
		</div>
	);
}
