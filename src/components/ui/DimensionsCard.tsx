import type React from "react";
import { cn } from "../../lib/cn";

export interface DimensionsTriple {
	length: number | null;
	width: number | null;
	height: number | null;
}

interface DimensionsCardProps {
	heading: string;
	original: DimensionsTriple | null | undefined;
	final: DimensionsTriple | null | undefined;
	onChangeFinal: (patch: Partial<DimensionsTriple>) => void;
	className?: string;
}

const fmt = (v: number | null | undefined) => (v === 0 || v ? String(v) : "—");

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
}> = ({ title, value, onChange }) => {
	const pick = (field: keyof DimensionsTriple): string => {
		const v = value?.[field];
		return v === null || v === undefined ? "" : String(v);
	};
	const toNumberOrNull = (s: string) => {
		const t = s.trim();
		if (t.length === 0) return null;
		const n = Number(t);
		return Number.isFinite(n) ? n : null;
	};
	return (
		<div className="bg-gray-50 border border-indigo-200 rounded-lg px-2 py-2 mb-2 flex flex-col items-center justify-center">
			<span className="text-[10px] text-green-900 mb-1 bg-green-100 text-center w-full rounded-sm">
				{" "}
				{title}
			</span>
			<div className="flex flex-row items-center justify-between w-[75%] gap-2">
				<div className="flex flex-col items-center">
					<span className="text-[10px] text-gray-500">Length</span>
					<input
						className="border border-gray-300 bg-white rounded py-1 text-center w-[70px] text-sm focus:outline-none focus:border-blue-500"
						value={pick("length")}
						onChange={(e) =>
							onChange({ length: toNumberOrNull(e.target.value) })
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
							onChange({ width: toNumberOrNull(e.target.value) })
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
							onChange({ height: toNumberOrNull(e.target.value) })
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
	onChangeFinal,
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
			<TripleRowReadOnly title="Original" dims={original} />
			<TripleRowEditable title="Final" value={final} onChange={onChangeFinal} />
		</div>
	);
};
