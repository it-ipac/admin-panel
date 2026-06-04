import type React from "react";
import { useEffect, useRef, useState } from "react";

interface EditableValueProps {
	value: string | number | null | undefined;
	onSave: (val: string | number | null) => Promise<void>;
	type?: "text" | "number";
	editable?: boolean;
	style?: React.CSSProperties;
	className?: string;
	placeholder?: string;
	isDimension?: boolean;
	tabDimensionsOnly?: boolean;
}

export const EditableValue: React.FC<EditableValueProps> = ({
	value,
	onSave,
	type = "text",
	editable = false,
	style,
	className,
	placeholder = "—",
	isDimension = false,
	tabDimensionsOnly = false,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState<string | number>(value ?? "");
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
		"idle",
	);
	const [optimisticValue, setOptimisticValue] = useState<
		string | number | null | undefined
	>(undefined);
	const inputRef = useRef<HTMLInputElement>(null);
	const lastSavedValue = useRef<string | number | null | undefined>(value);

	// Sync local value when prop changes externally (e.g., after refetch)
	useEffect(() => {
		if (!isEditing) {
			if (value === lastSavedValue.current) {
				setOptimisticValue(undefined);
			}
			if (optimisticValue !== undefined) {
				setInputValue(optimisticValue ?? "");
			} else {
				setInputValue(value ?? "");
			}
			lastSavedValue.current = value;
		}
	}, [value, isEditing, optimisticValue]);

	// Auto-focus input when entering edit mode
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	// Debounce save handler
	// biome-ignore lint/correctness/useExhaustiveDependencies: handleSave is not a stable dependency
	useEffect(() => {
		if (!isEditing) return;

		const currentStr = inputValue.toString().trim();
		const originalStr = (lastSavedValue.current ?? "").toString().trim();

		// Don't trigger if value hasn't changed
		if (currentStr === originalStr) return;

		const timer = setTimeout(() => {
			handleSave();
		}, 800); // 800ms debounce

		return () => clearTimeout(timer);
	}, [inputValue, isEditing]);

	const handleSave = async () => {
		const currentStr = inputValue.toString().trim();
		const parsedVal =
			type === "number"
				? currentStr === ""
					? null
					: Number(currentStr)
				: currentStr === ""
					? null
					: currentStr;

		const originalVal =
			type === "number"
				? lastSavedValue.current === null ||
					lastSavedValue.current === undefined
					? null
					: Number(lastSavedValue.current)
				: lastSavedValue.current === null ||
						lastSavedValue.current === undefined
					? null
					: lastSavedValue.current;

		if (parsedVal === originalVal) return;

		setOptimisticValue(parsedVal);
		setStatus("saving");
		try {
			await onSave(parsedVal);
			lastSavedValue.current = parsedVal;
			setStatus("saved");
			setTimeout(() => {
				setStatus((s) => (s === "saved" ? "idle" : s));
			}, 2000);
		} catch (err) {
			console.error("Error saving inline edit:", err);
			setStatus("error");
			setOptimisticValue(undefined);
		}
	};

	const findSibling = (forward = true): HTMLElement | null => {
		const selector = tabDimensionsOnly
			? ".editable-dimension"
			: ".editable-value-container";
		const containers = Array.from(document.querySelectorAll(selector));
		const currentContainer = inputRef.current?.closest(
			".editable-value-container",
		);
		if (!currentContainer) return null;

		const currentIndex = containers.indexOf(currentContainer);
		if (currentIndex === -1) return null;

		const targetIndex = forward ? currentIndex + 1 : currentIndex - 1;
		if (targetIndex >= 0 && targetIndex < containers.length) {
			return containers[targetIndex] as HTMLElement;
		}
		return null;
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSave();
			setIsEditing(false);
		} else if (e.key === "Escape") {
			setInputValue(lastSavedValue.current ?? "");
			setOptimisticValue(undefined);
			setIsEditing(false);
			setStatus("idle");
		} else if (e.key === "Tab") {
			e.preventDefault();
			const sibling = findSibling(!e.shiftKey);
			handleSave();
			setIsEditing(false);
			if (sibling) {
				// Defer focusing next element to allow React state update
				setTimeout(() => {
					sibling.click();
				}, 50);
			}
		}
	};

	const handleBlur = () => {
		handleSave();
		setIsEditing(false);
	};

	// If not in editing mode on the screen (e.g. printing or viewing non-editable copy)
	if (!editable) {
		const displayVal =
			value !== null && value !== undefined && value !== ""
				? value
				: placeholder;
		return (
			<span style={style} className={className}>
				{displayVal}
			</span>
		);
	}

	if (isEditing) {
		const charCount = inputValue.toString().length;
		const width = Math.max(32, charCount * 8 + 14);

		return (
			<span
				style={{ position: "relative", display: "inline-block", ...style }}
				className={`editable-value-container ${isDimension ? "editable-dimension" : ""} ${className || ""}`}
			>
				<input
					ref={inputRef}
					type={type}
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={handleBlur}
					style={{
						border: "1px solid #3b82f6",
						outline: "none",
						backgroundColor: "#eff6ff",
						color: "#1e3a8a",
						fontFamily: "inherit",
						fontSize: "inherit",
						fontWeight: "600",
						padding: "0 2px",
						margin: "0",
						textAlign: "inherit",
						width: `${width}px`,
						borderRadius: "3px",
						transition: "width 0.1s ease",
					}}
				/>
				{status !== "idle" && (
					<span
						style={{
							position: "absolute",
							top: "-4px",
							right: "-4px",
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							backgroundColor:
								status === "saving"
									? "#3b82f6"
									: status === "saved"
										? "#10b981"
										: "#ef4444",
							boxShadow: "0 0 4px rgba(0,0,0,0.3)",
							animation:
								status === "saving"
									? "pulse-anim 1s infinite alternate"
									: "none",
						}}
						title={
							status === "saving"
								? "Saving..."
								: status === "saved"
									? "Saved"
									: "Save Error"
						}
					/>
				)}
				<style>{`
					@keyframes pulse-anim {
						from { opacity: 0.4; transform: scale(0.8); }
						to { opacity: 1; transform: scale(1.2); }
					}
				`}</style>
			</span>
		);
	}

	const displayVal =
		optimisticValue !== undefined
			? optimisticValue !== null && optimisticValue !== ""
				? optimisticValue
				: placeholder
			: value !== null && value !== undefined && value !== ""
				? value
				: placeholder;

	return (
		<span
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					setIsEditing(true);
				}
			}}
			onClick={() => setIsEditing(true)}
			className={`editable-value-container group/editable ${isDimension ? "editable-dimension" : ""} ${className || ""}`}
			style={{
				cursor: "pointer",
				borderBottom: "1px dotted #94a3b8",
				transition: "background-color 0.2s, border-bottom-color 0.2s",
				padding: "0 2px",
				borderRadius: "2px",
				position: "relative",
				display: "inline-block",
				...style,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.08)";
				e.currentTarget.style.borderBottomColor = "#3b82f6";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = "transparent";
				e.currentTarget.style.borderBottomColor = "#94a3b8";
			}}
			title="Click to edit value"
		>
			{displayVal}
			{status !== "idle" && (
				<span
					style={{
						position: "absolute",
						top: "-3px",
						right: "-3px",
						width: "5px",
						height: "5px",
						borderRadius: "50%",
						backgroundColor:
							status === "saving"
								? "#3b82f6"
								: status === "saved"
									? "#10b981"
									: "#ef4444",
					}}
				/>
			)}
		</span>
	);
};
