interface NumberInputProps {
	value: number | null;
	onChange: (value: number | null) => void;
	inputId?: string;
	className?: string;
}

const parseInputNumber = (value: string) => {
	if (!value.trim()) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

export function NumberInput({
	value,
	onChange,
	inputId,
	className,
}: NumberInputProps) {
	return (
		<input
			id={inputId}
			type="number"
			value={value ?? ""}
			onChange={(event) => onChange(parseInputNumber(event.target.value))}
			className={
				className ||
				"w-full mt-1 px-2 py-1.5 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
			}
		/>
	);
}

export const formatNumber = (value: number | null) => {
	if (value === null || Number.isNaN(value)) return "—";
	const rounded = Math.round(value * 100) / 100;
	return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
};
