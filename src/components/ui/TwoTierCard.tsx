import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useDebounce } from "../../lib/useDebounce";

interface TwoTierCardProps {
	label: string;
	original: string | number | null | undefined;
	final: string | number | null | undefined;
	type?: "text" | "number" | "switch" | "select";
	onChangeOriginal?: (val: any) => void;
	onChangeFinal?: (val: any) => void;
	selectItems?: { label: string; value: string }[];
	className?: string;
	originalEditable?: boolean;
	finalEditable?: boolean;
	editable?: boolean;
	highlightChanges?: boolean;
}

const formatValue = (v: any) => {
	if (v === null || v === undefined) return "—";
	if (typeof v === "boolean") return v ? "Yes" : "No";
	return String(v);
};

const isSameScalar = (a: any, b: any) => {
	// Treat null and undefined as equal
	const normA = a === null || a === undefined ? null : a;
	const normB = b === null || b === undefined ? null : b;
	return normA === normB;
};

export const TwoTierCard: React.FC<TwoTierCardProps> = ({
	label,
	original,
	final,
	type = "text",
	onChangeOriginal,
	onChangeFinal,
	selectItems,
	className,
	originalEditable = false,
	finalEditable = true,
	editable,
	highlightChanges = false,
}) => {
	const [draftOriginal, setDraftOriginal] = useState(original);
	const [draftFinal, setDraftFinal] = useState(final);

	// Always have latest callbacks without them being effect dependencies
	const onChangeOriginalRef = useRef(onChangeOriginal);
	const onChangeFinalRef = useRef(onChangeFinal);
	useEffect(() => {
		onChangeOriginalRef.current = onChangeOriginal;
	});
	useEffect(() => {
		onChangeFinalRef.current = onChangeFinal;
	});

	// Debounce only for text/number inputs
	const debouncedOriginal = useDebounce(
		type === "text" || type === "number" ? draftOriginal : original,
		500,
	);
	const debouncedFinal = useDebounce(
		type === "text" || type === "number" ? draftFinal : final,
		500,
	);

	// Sync INWARD: when external prop changes (after save/refetch), update draft
	// only if the draft hasn't diverged from the previous external value.
	const prevOriginalRef = useRef(original);
	useEffect(() => {
		if (!isSameScalar(prevOriginalRef.current, original)) {
			prevOriginalRef.current = original;
			setDraftOriginal(original);
		}
	}, [original]);

	const prevFinalRef = useRef(final);
	useEffect(() => {
		if (!isSameScalar(prevFinalRef.current, final)) {
			prevFinalRef.current = final;
			setDraftFinal(final);
		}
	}, [final]);

	// Fire outward mutations only when the debounced value actually differs from
	// the last value we fired — prevents re-firing on every re-render.
	const lastFiredOriginalRef = useRef(original);
	useEffect(() => {
		if (type !== "text" && type !== "number") return;
		if (isSameScalar(debouncedOriginal, lastFiredOriginalRef.current)) return;
		lastFiredOriginalRef.current = debouncedOriginal;
		onChangeOriginalRef.current?.(debouncedOriginal);
	}, [debouncedOriginal, type]);

	const lastFiredFinalRef = useRef(final);
	useEffect(() => {
		if (type !== "text" && type !== "number") return;
		if (isSameScalar(debouncedFinal, lastFiredFinalRef.current)) return;
		lastFiredFinalRef.current = debouncedFinal;
		onChangeFinalRef.current?.(debouncedFinal);
	}, [debouncedFinal, type]);

	const hasChanged =
		final !== null && final !== undefined && original !== final;
	const showChangeHighlight = highlightChanges && hasChanged;

	const borderColor = showChangeHighlight
		? "border-orange-400"
		: "border-indigo-200";
	const headerBgColor = showChangeHighlight ? "bg-orange-50" : "bg-blue-50";
	const headerTextColor = showChangeHighlight
		? "text-orange-900"
		: "text-blue-800";

	const renderTier = (
		tierLabel: string,
		value: any,
		draftValue: any,
		setDraftValue: (v: any) => void,
		editable: boolean,
		onChange?: (val: any) => void,
		isOriginal = false,
	) => {
		const labelColor = isOriginal
			? "text-amber-900 bg-amber-100"
			: showChangeHighlight
				? "text-orange-900 bg-orange-100"
				: "text-green-900 bg-green-100";

		return (
			<div
				className={cn(
					"border rounded-lg px-1 py-1 flex flex-col items-center justify-center min-h-[50px]",
					isOriginal
						? "border-indigo-200 bg-gray-50 mb-1"
						: showChangeHighlight
							? "border-orange-400 bg-orange-50"
							: "border-indigo-200 bg-white",
				)}
			>
				<span
					className={cn(
						"text-[10px] text-center w-full rounded-sm mb-1",
						labelColor,
					)}
				>
					{tierLabel}
					{!isOriginal && showChangeHighlight ? " ✓" : ""}
				</span>

				{editable && onChange ? (
					type === "select" ? (
						<select
							className="w-full text-center text-sm border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:border-blue-500"
							value={
								draftValue === null || draftValue === undefined
									? ""
									: String(draftValue)
							}
							onChange={(e) => {
								setDraftValue(e.target.value);
								onChange(e.target.value);
							}}
						>
							<option value="">Select</option>
							{selectItems?.map((item) => (
								<option key={item.value} value={item.value}>
									{item.label}
								</option>
							))}
						</select>
					) : type === "switch" ? (
						<button
							className="w-full text-center text-sm py-0.5 rounded hover:bg-gray-100"
							onClick={() => {
								const newVal = !draftValue;
								setDraftValue(newVal);
								onChange(newVal);
							}}
						>
							{draftValue ? "Yes" : "No"}
						</button>
					) : (
						<input
							type={type === "number" ? "number" : "text"}
							className="w-full text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
							value={
								draftValue === null || draftValue === undefined
									? ""
									: String(draftValue)
							}
							onChange={(e) => {
								const val = e.target.value;
								const parsed =
									type === "number" ? (val === "" ? null : Number(val)) : val;
								setDraftValue(parsed);
							}}
						/>
					)
				) : (
					<span className="text-gray-900 text-sm font-semibold text-center w-full truncate px-1">
						{formatValue(value)}
					</span>
				)}
			</div>
		);
	};

	const finalIsEditable = editable !== undefined ? editable : finalEditable;

	return (
		<div
			className={cn(
				`flex flex-col border rounded-xl p-1 m-1 min-w-[100px] flex-1 ${borderColor} ${headerBgColor}`,
				className,
			)}
		>
			<div className="mb-1 px-2 rounded-full self-center">
				<span
					className={cn(
						`${headerTextColor} text-xs font-semibold text-center block`,
					)}
				>
					{label}
					{showChangeHighlight ? " *" : ""}
				</span>
			</div>

			{renderTier(
				"Original",
				original,
				draftOriginal,
				setDraftOriginal,
				originalEditable,
				onChangeOriginal,
				true,
			)}
			{renderTier(
				"Final",
				final,
				draftFinal,
				setDraftFinal,
				finalIsEditable,
				onChangeFinal,
				false,
			)}
		</div>
	);
};
