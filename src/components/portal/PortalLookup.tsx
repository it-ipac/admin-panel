import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Box, Loader2, Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const SEARCH_EXIT_MS = 180;

const getItemNumberCandidate = (query: string) => {
	const labelMatch = query.match(PRINTED_ITEM_LABEL_PATTERN);
	return labelMatch?.[1] || query;
};

export function PortalLookup({ clientId }: { clientId: string | null }) {
	const navigate = useNavigate();
	const shouldReduceMotion = useReducedMotion();
	const rootRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const activationTimeoutRef = useRef<number | null>(null);
	const exitTimeoutRef = useRef<number | null>(null);
	const ignoreScrollUntilRef = useRef(0);
	const [value, setValue] = useState("");
	const [result, setResult] = useState<ItemLookupResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [isActivated, setIsActivated] = useState(false);
	const [isSearchActive, setIsSearchActive] = useState(false);
	const [isSearchExiting, setIsSearchExiting] = useState(false);

	const closeFeedback = () => {
		setError(null);
		setResult(null);
	};

	const clearExitTimer = () => {
		if (!exitTimeoutRef.current) return;
		window.clearTimeout(exitTimeoutRef.current);
		exitTimeoutRef.current = null;
	};

	const activateSearchState = () => {
		clearExitTimer();
		setIsSearchExiting(false);
		setIsSearchActive(true);
	};

	const closeSearch = (blurInput = false) => {
		closeFeedback();
		setIsActivated(false);
		setIsSearchActive(false);

		if (shouldReduceMotion) {
			clearExitTimer();
			setIsSearchExiting(false);
			if (blurInput) inputRef.current?.blur();
			return;
		}

		setIsSearchExiting(true);
		clearExitTimer();
		exitTimeoutRef.current = window.setTimeout(() => {
			setIsSearchExiting(false);
			exitTimeoutRef.current = null;
			if (blurInput) inputRef.current?.blur();
		}, SEARCH_EXIT_MS);
	};

	const hasFeedback = Boolean(error || result);
	const isSpotlightPresent = isSearchActive || isSearchExiting;

	useEffect(() => {
		const activateSearch = () => {
			activateSearchState();
			setIsActivated(true);
			ignoreScrollUntilRef.current =
				performance.now() + (shouldReduceMotion ? 0 : 560);
			window.scrollTo({
				top: 0,
				behavior: shouldReduceMotion ? "auto" : "smooth",
			});
			window.requestAnimationFrame(() => {
				inputRef.current?.focus({ preventScroll: true });
			});

			if (activationTimeoutRef.current) {
				window.clearTimeout(activationTimeoutRef.current);
			}
			activationTimeoutRef.current = window.setTimeout(() => {
				setIsActivated(false);
			}, shouldReduceMotion ? 0 : 260);
		};

		window.addEventListener("portal-search-activate", activateSearch);
		return () => {
			window.removeEventListener("portal-search-activate", activateSearch);
			if (activationTimeoutRef.current) {
				window.clearTimeout(activationTimeoutRef.current);
			}
			clearExitTimer();
		};
	}, [shouldReduceMotion]);

	useEffect(() => {
		if (!isSpotlightPresent && !hasFeedback) return;

		const dismissOnPageScroll = () => {
			if (performance.now() < ignoreScrollUntilRef.current) return;
			closeSearch(true);
		};
		const dismissOnEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			closeSearch(true);
		};

		window.addEventListener("scroll", dismissOnPageScroll, { passive: true });
		document.addEventListener("keydown", dismissOnEscape);
		return () => {
			window.removeEventListener("scroll", dismissOnPageScroll);
			document.removeEventListener("keydown", dismissOnEscape);
		};
	}, [isSpotlightPresent, hasFeedback]);

	const boxLookupFields = `
		id,
		ipac_reference,
		client_reference,
		destination,
		status,
		order_pkg_overview!inner (
			orders!inner (client_id)
		)
	`;

	const findBox = async (query: string) => {
		if (!clientId) return null;

		const byIpac = await supabase
			.from("order_pkg_instance")
			.select(boxLookupFields)
			.eq("order_pkg_overview.orders.client_id", clientId)
			.ilike("ipac_reference", query)
			.limit(1);
		if (byIpac.error) throw byIpac.error;
		if (byIpac.data?.[0]) return byIpac.data[0];

		const byClientReference = await supabase
			.from("order_pkg_instance")
			.select(boxLookupFields)
			.eq("order_pkg_overview.orders.client_id", clientId)
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
			)
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
					: query.ilike("ipac_reference", "%-SB-%");

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
		if (!clientId) return null;

		const packageUrlMatch = query.match(/\/portal\/package\/([^/?#\s]+)/i);
		const directCandidate = packageUrlMatch
			? decodeURIComponent(packageUrlMatch[1])
			: query;

		if (UUID_PATTERN.test(directCandidate)) {
			const byId = await supabase
				.from("order_pkg_instance")
				.select(boxLookupFields)
				.eq("order_pkg_overview.orders.client_id", clientId)
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
			.select(boxLookupFields)
			.eq("order_pkg_overview.orders.client_id", clientId)
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
		if (byItemNumber.data && byItemNumber.data.length > 0)
			return byItemNumber.data;

		const byReference = await supabase
			.from("items_db")
			.select(fields)
			.eq("client_id", clientId)
			.ilike("reference", query)
			.limit(100);
		if (byReference.error) throw byReference.error;
		if (byReference.data && byReference.data.length > 0)
			return byReference.data;

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
			const quantity = Number.isFinite(numericQuantity)
				? numericQuantity
				: null;
			const existing = boxes.get(instance.id);
			if (existing) {
				if (quantity != null)
					existing.quantity = (existing.quantity || 0) + quantity;
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

		activateSearchState();
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
				closeSearch();
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
				closeSearch();
				navigate({
					to: "/portal/package/$id",
					params: { id: developerBox.id },
				});
				return;
			}

			setError(
				"No matching box number or item reference was found for your account.",
			);
		} catch (lookupError: any) {
			setError(
				lookupError?.message || "Unable to search right now. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	const resultTitle =
		result?.title ||
		result?.itemReference ||
		result?.itemNumbers[0] ||
		result?.query ||
		"Item";

	const bodyBackdrop =
		typeof document !== "undefined"
			? createPortal(
					isSpotlightPresent ? (
						<motion.button
							type="button"
							tabIndex={-1}
							aria-label="Close search spotlight"
							initial={shouldReduceMotion ? false : { opacity: 0 }}
							animate={{ opacity: isSearchActive ? 1 : 0 }}
							transition={{
								duration: shouldReduceMotion
									? 0
									: isSearchActive
										? 0.16
										: 0.14,
								delay: !shouldReduceMotion && !isSearchActive ? 0.025 : 0,
								ease: isSearchActive ? "easeOut" : "easeIn",
							}}
							onPointerDown={(event) => {
								event.preventDefault();
								closeSearch(true);
							}}
							className="fixed inset-0 z-30 cursor-default bg-black/70 will-change-[opacity] focus:outline-none dark:bg-black/80"
						/>
					) : null,
					document.body,
				)
			: null;

	return (
		<>
			{bodyBackdrop}
			<div
				ref={rootRef}
				className={`relative min-w-0 max-w-[36rem] flex-1 basis-0 md:mx-2 lg:mx-3 ${isSpotlightPresent ? "z-[60]" : "z-auto"}`}
				onBlur={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
						closeSearch();
					}
				}}
			>
				{isSpotlightPresent && (
					<motion.button
						type="button"
						tabIndex={-1}
						aria-hidden="true"
						initial={shouldReduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: isSearchActive ? 1 : 0 }}
						transition={{
							duration: shouldReduceMotion
								? 0
								: isSearchActive
									? 0.14
									: 0.12,
							delay: !shouldReduceMotion && !isSearchActive ? 0.02 : 0,
							ease: isSearchActive ? "easeOut" : "easeIn",
						}}
						onPointerDown={(event) => {
							event.preventDefault();
							closeSearch(true);
						}}
						className="fixed inset-0 z-40 cursor-default bg-black/70 will-change-[opacity] focus:outline-none dark:bg-black/80"
					/>
				)}

				<motion.div
					initial={false}
					animate={
						isActivated && !shouldReduceMotion ? { scale: 1.004 } : { scale: 1 }
					}
					transition={{ duration: shouldReduceMotion ? 0 : 0.14, ease: "easeOut" }}
					className="relative z-50"
				>
					<form
						role="search"
						aria-label="Package and item search"
						onSubmit={(event) => {
							event.preventDefault();
							void handleSubmit();
						}}
					>
						<label htmlFor="portal-header-lookup" className="sr-only">
							Find a box or item
						</label>
						<div
							className={`relative rounded-xl transition-[box-shadow] duration-150 ${
								isSearchActive
									? "shadow-[0_14px_34px_-16px_rgba(0,0,0,0.55)]"
									: ""
							}`}
						>
							<Search
								className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-700 dark:text-primary-300 sm:left-3"
								aria-hidden="true"
							/>
							<input
								ref={inputRef}
								id="portal-header-lookup"
								type="search"
								value={value}
								onFocus={activateSearchState}
								onChange={(event) => {
									setValue(event.target.value);
									activateSearchState();
									closeFeedback();
								}}
								placeholder={
									clientId ? "Find a box or item" : "Loading package search…"
								}
								autoComplete="off"
								spellCheck={false}
								disabled={!clientId}
								aria-controls={hasFeedback ? "portal-lookup-feedback" : undefined}
								aria-describedby={hasFeedback ? "portal-lookup-feedback" : undefined}
								aria-expanded={hasFeedback}
								className={`h-9 w-full rounded-xl border bg-app-surface py-2 pl-8 pr-10 text-xs font-medium text-app-text-strong transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-normal placeholder:text-app-text-muted focus:outline-none focus:ring-2 disabled:cursor-wait disabled:opacity-60 dark:shadow-none sm:h-10 sm:pl-10 sm:pr-[4.75rem] sm:text-sm md:h-11 ${
									isSearchActive
										? "border-primary-400 ring-1 ring-primary-500/20 focus:border-primary-400 focus:ring-primary-500/35"
										: "border-app-border bg-app-surface-muted/80 hover:border-primary-300 hover:bg-app-surface focus:border-primary-500 focus:ring-primary-500/30"
								}`}
							/>
							<button
								type="submit"
								disabled={!value.trim() || loading || !clientId}
								className="absolute bottom-1 right-1 top-1 inline-flex w-8 min-w-8 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-0 text-xs font-bold text-white shadow-[0_2px_6px_rgba(0,94,168,0.2)] transition-[background-color,box-shadow,transform] hover:bg-primary-700 hover:shadow-[0_3px_9px_rgba(0,94,168,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-primary-500 dark:hover:bg-primary-400 sm:w-auto sm:min-w-16 sm:px-2.5"
							>
								{loading ? (
									<Loader2
										className="h-3.5 w-3.5 animate-spin text-white"
										aria-hidden="true"
									/>
								) : (
									<Search className="h-3.5 w-3.5 text-white" aria-hidden="true" />
								)}
								<span className="hidden text-white sm:inline">Find</span>
							</button>
						</div>
					</form>
				</motion.div>

				<AnimatePresence initial={false}>
					{hasFeedback && (
						<motion.div
							id="portal-lookup-feedback"
							initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
							animate={{ opacity: 1, y: 0 }}
							exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
							transition={{
								duration: shouldReduceMotion ? 0 : 0.14,
								ease: "easeOut",
							}}
							className="fixed left-2 right-2 top-[4.25rem] z-[70] max-h-[calc(100dvh-5.25rem)] overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] sm:left-3 sm:right-3 md:absolute md:left-0 md:right-0 md:top-[calc(100%+0.5rem)] md:max-h-[min(70dvh,34rem)]"
							role={error ? "alert" : "region"}
							aria-label={error ? "Search error" : "Search results"}
							aria-live="polite"
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
									onClick={() => closeSearch(true)}
									className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-app-text-muted transition-colors hover:bg-app-surface hover:text-app-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:h-9 sm:w-9 sm:rounded-lg"
									aria-label="Close search results"
								>
									<X className="h-4 w-4" aria-hidden="true" />
								</button>
							</div>

							{result &&
								(result.boxes.length === 0 ? (
									<p className="px-4 py-4 text-sm text-app-text-muted">
										{result.title === "Standard Box packages"
											? "No Standard Box packages found."
											: result.title === "AUH destinations"
												? "No AUH packages found."
												: "Item found, but no packed box is linked yet."}
									</p>
								) : (
									<div
										className="max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain p-1.5 md:max-h-[28rem]"
										aria-label={`${result.boxes.length} matching boxes`}
									>
										{result.boxes.map((box) => (
											<button
												type="button"
												key={box.id}
												onClick={() => {
													closeSearch();
													navigate({
														to: "/portal/package/$id",
														params: { id: box.id },
													});
												}}
												className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
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
														{box.status && (
															<span className="capitalize">{box.status}</span>
														)}
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
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</>
	);
}
