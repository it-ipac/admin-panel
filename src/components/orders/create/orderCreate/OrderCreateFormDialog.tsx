import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../../../../hooks/useDebouncedValue";
import { ExcelDropzone } from "../ExcelDropzone";
import type {
	AppliedExcelTemplateMode,
	ClientOption,
	ExcelTemplateMode,
	OrderCategoryOption,
} from "./types";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	clientMode: "existing" | "new";
	setClientMode: (mode: "existing" | "new") => void;
	selectedClientId: string;
	setSelectedClientId: (id: string) => void;
	newClient: {
		name: string;
		contact_person: string;
		email: string;
		phone: string;
		address: string;
	};
	setNewClient: React.Dispatch<
		React.SetStateAction<{
			name: string;
			contact_person: string;
			email: string;
			phone: string;
			address: string;
		}>
	>;
	orderName: string;
	setOrderName: (value: string) => void;
	clients: ClientOption[];
	clientsLoading: boolean;
	clientCategories: OrderCategoryOption[];
	categoriesLoading: boolean;
	selectedCategoryIds: string[];
	setSelectedCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
	validationErrors: Record<string, string>;
	setValidationErrors: React.Dispatch<
		React.SetStateAction<Record<string, string>>
	>;
	excelFile: File | null;
	worksheetNames: string[];
	packageCount: number;
	excelVersionMode: ExcelTemplateMode;
	detectedExcelVersion: number | null;
	appliedTemplateMode: AppliedExcelTemplateMode;
	isParsing: boolean;
	fileError: string | null;
	hasUnresolvedMappings: boolean;
	onFileSelected: (file: File) => Promise<void>;
	onExcelVersionModeChange: (mode: ExcelTemplateMode) => Promise<void>;
	onClearFile: () => void;
	setFileError: (value: string | null) => void;
	onReview: (options?: { selectedClientId?: string }) => Promise<void>;
	isSubmitting: boolean;
	globalDestination: string;
	setGlobalDestination: (value: string) => void;
}

export function OrderCreateFormDialog({
	open,
	onOpenChange,
	clientMode,
	setClientMode,
	selectedClientId,
	setSelectedClientId,
	newClient,
	setNewClient,
	orderName,
	setOrderName,
	clients,
	clientsLoading,
	clientCategories,
	categoriesLoading,
	selectedCategoryIds,
	setSelectedCategoryIds,
	validationErrors,
	setValidationErrors,
	excelFile,
	worksheetNames,
	packageCount,
	excelVersionMode,
	detectedExcelVersion,
	appliedTemplateMode,
	isParsing,
	fileError,
	hasUnresolvedMappings,
	onFileSelected,
	onExcelVersionModeChange,
	onClearFile,
	setFileError,
	onReview,
	isSubmitting,
	globalDestination,
	setGlobalDestination,
}: Props) {
	const [clientSearchQuery, setClientSearchQuery] = useState("");
	const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
	const clientPickerRef = useRef<HTMLDivElement | null>(null);
	const debouncedClientSearchQuery = useDebouncedValue(clientSearchQuery, 200);

	const filteredClients = useMemo(() => {
		const query = debouncedClientSearchQuery.trim().toLowerCase();
		if (!query) return clients;
		return clients.filter((client) => {
			const name = client.name.toLowerCase();
			const contact = (client.contact_person || "").toLowerCase();
			const email = (client.email || "").toLowerCase();
			return (
				name.includes(query) || contact.includes(query) || email.includes(query)
			);
		});
	}, [debouncedClientSearchQuery, clients]);

	const trimmedClientSearchQuery = clientSearchQuery.trim();
	const hasExactClientMatch = useMemo(() => {
		if (!trimmedClientSearchQuery) return false;
		const normalizedQuery = trimmedClientSearchQuery.toLowerCase();
		return clients.some(
			(client) => client.name.trim().toLowerCase() === normalizedQuery,
		);
	}, [clients, trimmedClientSearchQuery]);
	const shouldShowCreateClientAction =
		trimmedClientSearchQuery.length > 0 && !hasExactClientMatch;

	const getCategorySearchText = useCallback(
		(category: OrderCategoryOption) =>
			`${category.label} ${(category.tags || []).join(" ")}`.toLowerCase(),
		[],
	);
	const waterCategoryIds = useMemo(
		() =>
			clientCategories
				.filter((category) => getCategorySearchText(category).includes("water"))
				.map((category) => category.id),
		[clientCategories, getCategorySearchText],
	);

	const powerCategoryIds = useMemo(
		() =>
			clientCategories
				.filter((category) => getCategorySearchText(category).includes("power"))
				.map((category) => category.id),
		[clientCategories, getCategorySearchText],
	);
	const setCategorySelection = (ids: string[]) => {
		setSelectedCategoryIds(Array.from(new Set(ids.filter(Boolean))));
	};

	const toggleCategorySelection = (categoryId: string, checked: boolean) => {
		setSelectedCategoryIds((prev) => {
			if (checked) return Array.from(new Set([...prev, categoryId]));
			return prev.filter((id) => id !== categoryId);
		});
	};

	useEffect(() => {
		if (!open) {
			setClientSearchQuery("");
			setIsClientDropdownOpen(false);
			return;
		}
		if (clientMode !== "existing") {
			setIsClientDropdownOpen(false);
			return;
		}
		if (!selectedClientId) return;
		const selectedClient = clients.find(
			(client) => client.id === selectedClientId,
		);
		if (!selectedClient) return;
		setClientSearchQuery(selectedClient.name);
	}, [open, clientMode, selectedClientId, clients]);

	const handleUseSearchAsNewClient = () => {
		const clientName = trimmedClientSearchQuery;
		if (!clientName) return;
		setClientMode("new");
		setSelectedClientId("");
		setNewClient((prev) => ({
			...prev,
			name: clientName,
		}));
		setValidationErrors((prev) => ({ ...prev, client: "" }));
		setIsClientDropdownOpen(false);
	};

	const handleClientPickerBlur = (event: React.FocusEvent<HTMLDivElement>) => {
		const nextFocusedElement = event.relatedTarget;
		if (
			nextFocusedElement &&
			clientPickerRef.current?.contains(nextFocusedElement)
		) {
			return;
		}
		setIsClientDropdownOpen(false);
	};

	const resolveExistingClientIdFromSearch = (): string => {
		if (clientMode !== "existing") return "";
		if (selectedClientId) return selectedClientId;
		if (!trimmedClientSearchQuery) return "";
		const normalizedQuery = trimmedClientSearchQuery.toLowerCase();
		const exactMatches = clients.filter(
			(client) => client.name.trim().toLowerCase() === normalizedQuery,
		);
		if (exactMatches.length !== 1) return "";
		return exactMatches[0].id;
	};

	const isV54Applied = appliedTemplateMode === "v54plus";
	const appliedVersionLabel = isV54Applied ? "54+" : "53-";
	const versionTextClassName = isV54Applied
		? "text-blue-700"
		: "text-amber-600";
	const versionBadgeClassName = isV54Applied
		? "border-blue-200 bg-blue-50 text-blue-700"
		: "border-amber-200 bg-amber-50 text-amber-600";
	const shouldShowCategoryMapping =
		clientMode === "existing" &&
		!!selectedClientId &&
		!categoriesLoading &&
		clientCategories.length > 0;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6">
					<div className="mb-6 flex items-start justify-between gap-4">
						<div>
							<Dialog.Title className="text-lg font-semibold text-gray-900 mb-1">
								Create order from Excel
							</Dialog.Title>
							<Dialog.Description className="text-sm text-gray-500">
								Upload a spreadsheet, confirm the details, and generate the base
								order.
							</Dialog.Description>
						</div>
						<div className="flex items-center gap-2 pt-1">
							<span className={`text-sm font-semibold ${versionTextClassName}`}>
								V
							</span>
							<button
								type="button"
								onClick={() => {
									const nextMode: ExcelTemplateMode = isV54Applied
										? "legacy"
										: "v54plus";
									void onExcelVersionModeChange(nextMode);
								}}
								className={`min-w-14 rounded-md border px-2.5 py-1.5 text-sm font-semibold transition-colors ${versionBadgeClassName}`}
								title="Click to switch version"
							>
								{appliedVersionLabel}
							</button>
							{excelVersionMode !== "auto" && (
								<button
									type="button"
									onClick={() => {
										void onExcelVersionModeChange("auto");
									}}
									className="text-xs text-gray-500 hover:text-gray-700"
								>
									Auto
								</button>
							)}
						</div>
					</div>

					<div className="space-y-6">
						<div className="space-y-2">
							<p className="text-sm font-medium text-gray-900">Client</p>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => setClientMode("existing")}
									className={`px-3 py-1.5 text-xs rounded-full border ${clientMode === "existing" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
								>
									Existing client
								</button>
								<button
									type="button"
									onClick={() => setClientMode("new")}
									className={`px-3 py-1.5 text-xs rounded-full border ${clientMode === "new" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}
								>
									Create new client
								</button>
							</div>

							{clientMode === "existing" ? (
								<div
									ref={clientPickerRef}
									className="relative mt-2"
									onBlurCapture={handleClientPickerBlur}
								>
									<input
										type="text"
										value={clientSearchQuery}
										onFocus={() => setIsClientDropdownOpen(true)}
										onChange={(event) => {
											setClientSearchQuery(event.target.value);
											setSelectedClientId("");
											setValidationErrors((prev) => ({ ...prev, client: "" }));
											setIsClientDropdownOpen(true);
										}}
										placeholder="Type to search client by name, contact, or email"
										className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									{shouldShowCreateClientAction && (
										<button
											type="button"
											onMouseDown={(event) => {
												event.preventDefault();
											}}
											onClick={handleUseSearchAsNewClient}
											className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
										>
											Create client
										</button>
									)}
									{isClientDropdownOpen && (
										<div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
											{clientsLoading ? (
												<p className="px-3 py-2 text-xs text-gray-500">
													Loading clients...
												</p>
											) : filteredClients.length === 0 ? (
												<div className="px-3 py-2">
													<p className="text-xs text-gray-500">
														No clients match your search
													</p>
													{shouldShowCreateClientAction && (
														<button
															type="button"
															onClick={handleUseSearchAsNewClient}
															className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
														>
															Create client “{trimmedClientSearchQuery}”
														</button>
													)}
												</div>
											) : (
												filteredClients.map((client) => (
													<button
														key={client.id}
														type="button"
														onClick={() => {
															setSelectedClientId(client.id);
															setClientSearchQuery(client.name);
															setValidationErrors((prev) => ({
																...prev,
																client: "",
															}));
															setIsClientDropdownOpen(false);
														}}
														className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
													>
														{client.name}
													</button>
												))
											)}
										</div>
									)}
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
									{(
										[
											"name",
											"contact_person",
											"email",
											"phone",
											"address",
										] as const
									).map((field) => (
										<input
											key={field}
											type={
												field === "email"
													? "email"
													: field === "phone"
														? "tel"
														: "text"
											}
											value={newClient[field]}
											onChange={(event) => {
												setNewClient((prev) => ({
													...prev,
													[field]: event.target.value,
												}));
												if (field === "name")
													setValidationErrors((prev) => ({
														...prev,
														client: "",
													}));
											}}
											placeholder={
												field === "name"
													? "Client name *"
													: field === "contact_person"
														? "Contact person"
														: field === "address"
															? "Address"
															: field[0].toUpperCase() + field.slice(1)
											}
											className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${field === "address" ? "md:col-span-2" : ""}`}
										/>
									))}
								</div>
							)}
							{validationErrors.client && (
								<p className="text-xs text-red-600 mt-1">
									{validationErrors.client}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="order-name"
								className="block text-sm font-medium text-gray-900 mb-1"
							>
								Order name
							</label>
							<input
								id="order-name"
								type="text"
								value={orderName}
								onChange={(event) => {
									setOrderName(event.target.value);
									setValidationErrors((prev) => ({ ...prev, orderName: "" }));
								}}
								placeholder="Order name (defaults to Excel filename)"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							{validationErrors.orderName && (
								<p className="text-xs text-red-600 mt-1">
									{validationErrors.orderName}
								</p>
							)}
						</div>

						<div>
							<label
								htmlFor="global-destination"
								className="block text-sm font-medium text-gray-900 mb-1"
							>
								Global destination (Optional)
							</label>
							<input
								id="global-destination"
								type="text"
								value={globalDestination}
								onChange={(event) => setGlobalDestination(event.target.value)}
								placeholder="e.g. MZC, ALD, or leave empty"
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<p className="mt-1 text-[11px] text-gray-500">
								When set, this will be applied to all boxes as the default
								destination.
							</p>
						</div>

						{shouldShowCategoryMapping && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-sm font-medium text-gray-900">
										Category mapping (optional)
									</p>
									{selectedCategoryIds.length > 0 && (
										<span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
											{selectedCategoryIds.length} selected
										</span>
									)}
								</div>
								<p className="text-xs text-gray-500">
									When selected, packers will only browse catalog items from
									these categories for this order.
								</p>

								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => setCategorySelection(powerCategoryIds)}
										className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
									>
										Select power
									</button>
									<button
										type="button"
										onClick={() => setCategorySelection(waterCategoryIds)}
										className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100"
									>
										Select water
									</button>
									<button
										type="button"
										onClick={() =>
											setCategorySelection(
												clientCategories.map((category) => category.id),
											)
										}
										className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
									>
										Select all
									</button>
									<button
										type="button"
										onClick={() => setCategorySelection([])}
										className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
									>
										Clear
									</button>
								</div>

								<div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
									{clientCategories.map((category) => {
										const checked = selectedCategoryIds.includes(category.id);
										return (
											<label
												key={category.id}
												className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
											>
												<input
													type="checkbox"
													checked={checked}
													onChange={(event) =>
														toggleCategorySelection(
															category.id,
															event.target.checked,
														)
													}
													className="mt-0.5"
												/>
												<div>
													<p className="text-sm text-gray-800">
														{category.label}
													</p>
													{category.tags.length > 0 && (
														<div className="mt-1 flex flex-wrap gap-1">
															{category.tags.map((tag) => (
																<span
																	key={`${category.id}-${tag}`}
																	className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600"
																>
																	{tag}
																</span>
															))}
														</div>
													)}
												</div>
											</label>
										);
									})}
								</div>
							</div>
						)}

						{excelVersionMode === "auto" && (
							<p className="-mt-2 text-xs text-gray-600">
								{detectedExcelVersion === null
									? "Auto detect could not find a version in the order name; using v53 and below."
									: `Detected V${detectedExcelVersion} from order name.`}
							</p>
						)}

						<div>
							<div className="flex items-center justify-between mb-2">
								<p className="text-sm font-medium text-gray-900">
									Excel upload
								</p>
								{isParsing ? (
									<span className="inline-flex items-center gap-2 text-xs text-gray-500">
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
										Processing...
									</span>
								) : (
									worksheetNames.length > 0 && (
										<span className="text-xs text-gray-500">
											{worksheetNames.length} sheet(s) detected
										</span>
									)
								)}
							</div>
							<ExcelDropzone
								file={excelFile}
								onFileSelected={onFileSelected}
								onClear={onClearFile}
								onInvalidFile={(file) =>
									setFileError(
										`Unsupported file type: ${file.name}. Please upload .xlsx, .xls, .xlsm, or .xlsb.`,
									)
								}
								error={fileError || validationErrors.file}
								helperText="We parse the Calculation sheet and detect package rows."
							/>
							{packageCount > 0 && (
								<p className="mt-2 text-xs text-gray-600">
									Detected {packageCount} package row(s) in column B starting at
									row 4.
								</p>
							)}
							{hasUnresolvedMappings && (
								<p className="mt-1 text-xs text-amber-600">
									Some rows need box type,
									{isV54Applied
										? " SEI category/protection,"
										: " packing type,"}
									or manufacturing material selections. Review in the
									confirmation step.
								</p>
							)}
						</div>
					</div>

					<div className="flex justify-end gap-2 mt-6">
						<Dialog.Close asChild>
							<button className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
								Cancel
							</button>
						</Dialog.Close>
						<button
							type="button"
							onClick={() => {
								const resolvedClientId = resolveExistingClientIdFromSearch();
								if (resolvedClientId && resolvedClientId !== selectedClientId) {
									setSelectedClientId(resolvedClientId);
									const resolvedClient = clients.find(
										(client) => client.id === resolvedClientId,
									);
									if (resolvedClient) {
										setClientSearchQuery(resolvedClient.name);
									}
								}
								void onReview(
									resolvedClientId
										? { selectedClientId: resolvedClientId }
										: undefined,
								);
							}}
							disabled={isParsing}
							className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${isParsing ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
						>
							{(isParsing || isSubmitting) && (
								<Loader2 className="w-4 h-4 animate-spin" />
							)}
							Review & confirm
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
