import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Box, Loader2, Search, X } from "lucide-react";
import { useState } from "react";
import { parseQrToken } from "../../features/orders/hooks/useInstanceQr";
import { supabase } from "../../lib/supabase";

type BoxLocation = {
	id: string;
	reference: string;
	destination: string | null;
	status: string | null;
	quantity: number | null;
};

type ItemLookupResult = {
	query: string;
	title?: string | null;
	itemReference: string | null;
	itemNumbers: string[];
	description: string | null;
	matchedRecords: number;
	boxes: BoxLocation[];
};

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRINTED_ITEM_LABEL_PATTERN = /^P-([A-Z0-9._/-]+)-QTY:\s*\d+$/i;

const getItemNumberCandidate = (query: string) => {
	const labelMatch = query.match(PRINTED_ITEM_LABEL_PATTERN);
	return labelMatch?.[1] || query;
};

export function PortalLookup({ clientId }: { clientId: string | null }) {
	const navigate = useNavigate();
	const [value, setValue] = useState("");
	const [result, setResult] = useState<ItemLookupResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const closeFeedback = () => {
		setError(null);
		setResult(null);
	};

	const findBox = async (query: string) => {
		const fields = "id, ipac_reference, client_reference, destination, status";
		const byIpac = await supabase
			.from("order_pkg_instance")
			.select(fields)
			.ilike("ipac_reference", query)
			.limit(1);
		if (byIpac.error) throw byIpac.error;
		if (byIpac.data?.[0]) return byIpac.data[0];

		const byClientReference = await supabase
			.from("order_pkg_instance")
			.select(fields)
			.ilike("client_reference", query)
			.limit(1);
		if (byClientReference.error) throw byClientReference.error;
		return byClientReference.data?.[0] || null;
	};

	const findShortcutBoxes = async (shortcut: "auh" | "sb") => {
		if (!clientId) return [];

		const fields = `
			id,
			ipac_reference,
			client_reference,
			destination,
			status,
			order_pkg_overview!inner (
				orders!inner (client_id)
			),
			order_package:order_packages!inner (maintenance_package_type)
		`;
		const pageSize = 1000;
		const boxes: BoxLocation[] = [];

		for (let from = 0; ; from += pageSize) {
			let query = supabase
				.from("order_pkg_instance")
				.select(fields)
				.eq("order_pkg_overview.orders.client_id", clientId);

			query =
				shortcut === "auh"
					? query.ilike("destination", "%AUH%")
					: query.eq("order_package.maintenance_package_type", "standard_box");

			const { data, error } = await query
				.order("ipac_reference", { ascending: true, nullsFirst: false })
				.range(from, from + pageSize - 1);
			if (error) throw error;

			for (const row of data || []) {
				boxes.push({
					id: row.id,
					reference:
						row.ipac_reference ||
						row.client_reference ||
						`Box ${row.id.slice(0, 8)}`,
					destination: row.destination || null,
					status: row.status || null,
					quantity: null,
				});
			}

			if (!data || data.length < pageSize) break;
		}

		return boxes;
	};

	const findDeveloperBox = async (query: string) => {
		const fields = "id, ipac_reference, client_reference, destination, status";
		const packageUrlMatch = query.match(/\/portal\/package\/([^/?#\s]+)/i);
		const directCandidate = packageUrlMatch
			? decodeURIComponent(packageUrlMatch[1])
			: query;

		if (UUID_PATTERN.test(directCandidate)) {
			const byId = await supabase
				.from("order_pkg_instance")
				.select(fields)
				.eq("id", directCandidate)
				.limit(1);
			if (byId.error) throw byId.error;
			if (byId.data?.[0]) return byId.data[0];
		}

		const token = parseQrToken(query);
		if (!token) return null;
		const { data: qrRows, error: qrError } = await supabase
			.from("qr_codes")
			.select("entity_id")
			.eq("entity_type", "package")
			.eq("token", token)
			.limit(1);
		if (qrError) throw qrError;
		const qrRow = qrRows?.[0];
		if (!qrRow?.entity_id) return null;

		const byQrEntity = await supabase
			.from("order_pkg_instance")
			.select(fields)
			.eq("id", qrRow.entity_id)
			.limit(1);
		if (byQrEntity.error) throw byQrEntity.error;
		return byQrEntity.data?.[0] || null;
	};

	const findItems = async (query: string) => {
		if (!clientId) return [];
		const fields = "id, item_num, reference, description";
		const itemNumberCandidate = getItemNumberCandidate(query);
		const byItemNumber = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.ilike("item_num", itemNumberCandidate)
			.limit(100);
		if (byItemNumber.error) throw byItemNumber.error;
		if (byItemNumber.data && byItemNumber.data.length > 0) return byItemNumber.data;

		const byReference = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.ilike("reference", query)
			.limit(100);
		if (byReference.error) throw byReference.error;
		if (byReference.data && byReference.data.length > 0) return byReference.data;

		const itemUrlMatch = query.match(/\/portal\/item\/([^/?#\s]+)/i);
		const developerItemId = itemUrlMatch
			? decodeURIComponent(itemUrlMatch[1])
			: query;
		if (!UUID_PATTERN.test(developerItemId)) return [];

		const byId = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.eq("id", developerItemId)
			.limit(1);
		if (byId.error) throw byId.error;
		return byId.data || [];
	};

	const buildItemResult = async (query: string, itemRows: any[]) => {
		const itemIds = itemRows.map((item) => item.id).filter(Boolean);
		const itemNumbers = Array.from(
			new Set(itemRows.map((item) => item.item_num).filter(Boolean)),
		) as string[];
		const references = Array.from(
			new Set(itemRows.map((item) => item.reference).filter(Boolean)),
		) as string[];
		const descriptions = Array.from(
			new Set(itemRows.map((item) => item.description).filter(Boolean)),
		) as string[];

		if (itemIds.length === 0) {
			return {
				query,
				itemReference: references[0] || null,
				itemNumbers,
				description: descriptions.length === 1 ? descriptions[0] : null,
				matchedRecords: itemRows.length,
				boxes: [],
			};
		}

		const { data: packedRows, error: packedRowsError } = await supabase
			.from("pkd_item")
			.select(`
				id,
				quantity,
				order_pkg_instance:pkg_instance_id (
					id,
					ipac_reference,
					client_reference,
					destination,
					status
				)
			`)
			.in("maintenance_db_id", itemIds)
			.not("pkg_instance_id", "is", null);
		if (packedRowsError) throw packedRowsError;

		const boxes = new Map<string, BoxLocation>();
		for (const row of packedRows || []) {
			const instance = Array.isArray((row as any).order_pkg_instance)
				? (row as any).order_pkg_instance[0]
				: (row as any).order_pkg_instance;
			if (!instance?.id) continue;

			const numericQuantity = Number((row as any).quantity);
			const quantity = Number.isFinite(numericQuantity) ? numericQuantity : null;
			const existing = boxes.get(instance.id);
			if (existing) {
				if (quantity != null) existing.quantity = (existing.quantity || 0) + quantity;
				continue;
			}

			boxes.set(instance.id, {
				id: instance.id,
				reference:
					instance.ipac_reference ||
					instance.client_reference ||
					`Box ${instance.id.slice(0, 8)}`,
				destination: instance.destination || null,
				status: instance.status || null,
				quantity,
			});
		}

		return {
			query,
			itemReference:
				references.length === 1 ? references[0] : references[0] || null,
			itemNumbers,
			description: descriptions.length === 1 ? descriptions[0] : null,
			matchedRecords: itemRows.length,
			boxes: Array.from(boxes.values()).sort((a, b) =>
				a.reference.localeCompare(b.reference),
			),
		};
	};

	const buildShortcutResult = (
		query: string,
		shortcut: "auh" | "sb",
		boxes: BoxLocation[],
	): ItemLookupResult => ({
		query,
		title: shortcut === "auh" ? "AUH destinations" : "Standard Box packages",
		itemReference: null,
		itemNumbers: [],
		description: null,
		matchedRecords: boxes.length,
		boxes,
	});

	const handleSubmit = async () => {
		const query = value.trim();
		if (!query || !clientId) return;
		const shortcut = query.toLowerCase();

		setLoading(true);
		closeFeedback();
		try {
			if (shortcut === "auh" || shortcut === "sb") {
				const boxes = await findShortcutBoxes(shortcut);
				setResult(buildShortcutResult(query, shortcut, boxes));
				return;
			}

			const box = await findBox(query);
			if (box?.id) {
				navigate({ to: "/portal/package/$id", params: { id: box.id } });
				return;
			}

			const itemRows = await findItems(query);
			if (itemRows.length > 0) {
				setResult(await buildItemResult(query, itemRows));
				return;
			}

			const developerBox = await findDeveloperBox(query);
			if (developerBox?.id) {
				navigate({ to: "/portal/package/$id", params: { id: developerBox.id } });
				return;
			}

			setError("No matching box number or item reference was found for your account.");
		} catch (lookupError: any) {
			setError(lookupError?.message || "Unable to search right now. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const hasFeedback = Boolean(error || result);
	const resultTitle =
		result?.title || result?.itemReference || result?.itemNumbers[0] || result?.query || "Item";

	return (
		<div className="relative order-3 w-full basis-full lg:order-none lg:mx-5 lg:min-w-0 lg:flex-1 lg:max-w-xl">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void handleSubmit();
				}}
			>
				<label htmlFor="portal-header-lookup" className="sr-only">
					Find a box or item
				</label>
				<div className="relative">
					<Search
						className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-700 dark:text-primary-300"
						aria-hidden="true"
					/>
					<input
						id="portal-header-lookup"
						type="text"
						value={value}
						onChange={(event) => {
							setValue(event.target.value);
							closeFeedback();
						}}
						placeholder={clientId ? "Find a box or item" : "Loading package search…"}
						autoComplete="off"
						spellCheck={false}
						disabled={!clientId}
						className="h-10 w-full rounded-xl border border-app-border bg-app-surface-muted/80 py-2 pl-10 pr-[4.75rem] text-sm font-medium text-app-text-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-[background-color,border-color,box-shadow] placeholder:font-normal placeholder:text-app-text-muted hover:border-primary-200 focus:border-primary-500 focus:bg-app-surface focus:outline-none focus:ring-2 focus:ring-primary-500/25 disabled:cursor-wait disabled:opacity-60 dark:shadow-none sm:h-11"
					/>
					<button
						type="submit"
						disabled={!value.trim() || loading || !clientId}
						className="absolute bottom-1 right-1 top-1 inline-flex min-w-16 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-2.5 text-xs font-bold text-white shadow-[0_2px_6px_rgba(0,94,168,0.2)] transition-[background-color,box-shadow,transform] hover:bg-primary-700 hover:shadow-[0_3px_9px_rgba(0,94,168,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-primary-500 dark:hover:bg-primary-400"
					>
						{loading ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-white" aria-hidden="true" />
						) : (
							<Search className="h-3.5 w-3.5 text-white" aria-hidden="true" />
						)}
						<span className="text-white">Find</span>
					</button>
				</div>
			</form>

			{hasFeedback && (
				<div
					id="portal-lookup-feedback"
					className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_18px_48px_-20px_rgba(15,23,42,0.35)]"
					role={error ? "alert" : "status"}
				>
					<div className="flex items-start justify-between gap-3 border-b border-app-border bg-app-surface-muted px-4 py-3">
						<div className="min-w-0">
							<p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">
								{error ? "Lookup" : "Item locations"}
							</p>
							<p className="mt-0.5 truncate text-sm font-bold text-app-text-strong">
								{error || resultTitle}
							</p>
							{result?.description && (
								<p className="mt-0.5 line-clamp-1 text-xs text-app-text-muted">
									{result.description}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={closeFeedback}
							className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-text-muted transition-colors hover:bg-app-surface hover:text-app-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
							aria-label="Close lookup results"
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</button>
					</div>

					{result &&
						(result.boxes.length === 0 ? (
							<p className="px-4 py-4 text-sm text-app-text-muted">
								Item found, but no packed box is linked yet.
							</p>
						) : (
							<div className="max-h-72 overflow-y-auto p-1.5">
								{result.boxes.map((box) => (
									<button
										type="button"
										key={box.id}
										onClick={() =>
											navigate({ to: "/portal/package/$id", params: { id: box.id } })
										}
										className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
									>
										<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-300">
											<Box className="h-4 w-4" aria-hidden="true" />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-bold text-app-text-strong">
												{box.reference}
											</span>
											<span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-app-text-muted">
												{box.destination && <span>{box.destination}</span>}
												{box.quantity != null && <span>Qty {box.quantity}</span>}
												{box.status && <span className="capitalize">{box.status}</span>}
											</span>
										</span>
										<ArrowRight
											className="h-4 w-4 shrink-0 text-primary-700 transition-transform group-hover:translate-x-0.5 dark:text-primary-300"
											aria-hidden="true"
										/>
									</button>
								))}
							</div>
						))}
				</div>
			)}
		</div>
	);
}
