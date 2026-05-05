import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useDebounce } from "../../lib/useDebounce";

export interface DimensionsTriple {
	length: number | null;
	width: number | null;
	height: number | null;
}

interface DimensionsCardProps {
	heading: string;
	original: DimensionsTriple | null | undefined;
	final: DimensionsTriple | null | undefined;
	onChangeOriginal?: (patch: Partial<DimensionsTriple>) => void;
	onChangeFinal?: (patch: Partial<DimensionsTriple>) => void;
	originalEditable?: boolean;
	finalEditable?: boolean;
	className?: string;
}

const fmt = (v: number | null | undefined) => (v === 0 || v ? String(v) : "—");

const isSameTriple = (
	a: DimensionsTriple | null | undefined,
	b: DimensionsTriple | null | undefined,
) => {
	const normalize = (v: number | null | undefined) =>
		v === null || v === undefined ? null : v;
	if (!a && !b) return true;
	if (!a || !b) return false;
	return (
		normalize(a.length) === normalize(b.length) &&
		normalize(a.width) === normalize(b.width) &&
		normalize(a.height) === normalize(b.height)
	);
};

const TripleRowReadOnly: React.FC<{
	title: string;
	dims: DimensionsTriple | null | undefined;
}> = ({ title, dims }) => (
	<div className="bg-white border border-indigo-200 rounded-lg px-2 py-2 mb-2 flex flex-col items-center justify-center">
		<span className="text-[10px] text-amber-900 mb-1 bg-amber-100 text-center w-full rounded-sm">
			{title}
		</span>
		<div className="flex flex-row items-center justify-between w-[75%] gap-2">
			<div className="flex flex-col items-center w-[70px]">
				<span className="text-[10px] text-gray-500">Length</span>
				<span className="text-gray-900 text-sm font-semibold text-center">
					{fmt(dims?.length)}
				</span>
			</div>
			<div className="flex flex-col items-center w-[70px]">
				<span className="text-[10px] text-gray-500">Width</span>
				<span className="text-gray-900 text-sm font-semibold text-center">
					{fmt(dims?.width)}
				</span>
			</div>
			<div className="flex flex-col items-center w-[70px]">
				<span className="text-[10px] text-gray-500">Height</span>
				<span className="text-gray-900 text-sm font-semibold text-center">
					{fmt(dims?.height)}
				</span>
			</div>
		</div>
	</div>
);

const TripleRowEditable: React.FC<{
	title: string;
	value: DimensionsTriple | null | undefined;
	onChange: (patch: Partial<DimensionsTriple>) => void;
	isOriginal?: boolean;
}> = ({ title, value, onChange, isOriginal = false }) => {
	const [draft, setDraft] = useState<DimensionsTriple>(
		value ?? { length: null, width: null, height: null },
	);
	const debouncedDraft = useDebounce(draft, 500);

	// Always have the latest onChange without adding it to effect deps
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	});

	// Sync INWARD only: when the external value changes (e.g. after a save/refetch),
	// and the user is NOT currently editing (draft matches the old value), update draft.
	// We track the previous external value with a ref to avoid the effect running on every render.
	const prevValueRef = useRef(value);
	useEffect(() => {
		if (!isSameTriple(prevValueRef.current, value)) {
			prevValueRef.current = value;
			// Only reset draft if it hasn't diverged from the previous external value.
			// This means we DON'T overwrite what the user is currently typing.
			if (isSameTriple(draft, prevValueRef.current)) {
				setDraft(value ?? { length: null, width: null, height: null });
			}
		}
	}, [value, draft]);

	// Fire the callback when the debounced draft differs from the last saved external value
	const lastFiredRef = useRef(value);
	useEffect(() => {
		if (isSameTriple(debouncedDraft, lastFiredRef.current)) return;
		lastFiredRef.current = debouncedDraft;
		onChangeRef.current(debouncedDraft);
	}, [debouncedDraft]);

	const pick = (field: keyof DimensionsTriple): string => {
		const v = draft[field];
		return v === null || v === undefined ? "" : String(v);
	};
	const toNumberOrNull = (s: string) => {
		const t = s.trim();
		if (t.length === 0) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	};
	const labelColor = isOriginal
		? "text-amber-900 bg-amber-100"
		: "text-green-900 bg-green-100";

	return (
		<div className="bg-gray-50 border border-indigo-200 rounded-lg px-2 py-2 mb-2 flex flex-col items-center justify-center">
			<span
				className={cn(
					"text-[10px] mb-1 text-center w-full rounded-sm",
					labelColor,
				)}
			>
				{title}
			</span>
			<div className="flex flex-row items-center justify-between w-[75%] gap-2">
				<div className="flex flex-col items-center">
					<span className="text-[10px] text-gray-500">Length</span>
					<input
						className="border border-gray-300 bg-white rounded py-1 text-center w-[70px] text-sm focus:outline-none focus:border-blue-500"
						value={pick("length")}
						onChange={(e) =>
							setDraft((prev) => ({
								...prev,
								length: toNumberOrNull(e.target.value),
							}))
						}
						type="number"
					/>
				</div>
				<div className="flex flex-col items-center">
					<span className="text-[10px] text-gray-500">Width</span>
					<input
						className="border border-gray-300 bg-white rounded py-1 text-center w-[70px] text-sm focus:outline-none focus:border-blue-500"
						value={pick("width")}
						onChange={(e) =>
							setDraft((prev) => ({
								...prev,
								width: toNumberOrNull(e.target.value),
							}))
						}
						type="number"
					/>
				</div>
				<div className="flex flex-col items-center">
					<span className="text-[10px] text-gray-500">Height</span>
					<input
						className="border border-gray-300 bg-white rounded py-1 text-center w-[70px] text-sm focus:outline-none focus:border-blue-500"
						value={pick("height")}
						onChange={(e) =>
							setDraft((prev) => ({
								...prev,
								height: toNumberOrNull(e.target.value),
							}))
						}
						type="number"
					/>
				</div>
			</div>
		</div>
	);
};

export const DimensionsCard: React.FC<DimensionsCardProps> = ({
	heading,
	original,
	final,
	onChangeOriginal,
	onChangeFinal,
	originalEditable = false,
	finalEditable = true,
	className,
}) => {
	return (
		<div
			className={cn(
				"bg-blue-50 rounded-xl border border-indigo-200 p-2 m-1 flex-1 min-w-[300px]",
				className,
			)}
		>
			<div className="px-3 py-1 rounded-full self-center mb-2 flex justify-center">
				<span className="text-blue-800 text-xs font-semibold text-center">
					{heading}
				</span>
			</div>
			{originalEditable && onChangeOriginal ? (
				<TripleRowEditable
					title="Original"
					value={original}
					onChange={onChangeOriginal}
					isOriginal
				/>
			) : (
				<TripleRowReadOnly title="Original" dims={original} />
			)}

			{finalEditable && onChangeFinal ? (
				<TripleRowEditable
					title="Final"
					value={final}
					onChange={onChangeFinal}
				/>
			) : (
				<TripleRowReadOnly title="Final" dims={final} />
			)}
		</div>
	);
};
