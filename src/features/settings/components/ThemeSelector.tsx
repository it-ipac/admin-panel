import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { ThemePreference } from "../../../lib/theme";

interface ThemeSelectorProps {
	value: ThemePreference;
	onChange: (preference: ThemePreference) => void;
	/** Rendered under the group; use it to say when the choice takes effect. */
	hint?: string;
}

const OPTIONS: Array<{
	value: ThemePreference;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}> = [
	{
		value: "light",
		label: "Light",
		description: "Always use the light theme",
		icon: Sun,
	},
	{
		value: "dark",
		label: "Dark",
		description: "Always use the dark theme",
		icon: Moon,
	},
	{
		value: "system",
		label: "System",
		description: "Follow the operating system setting",
		icon: Monitor,
	},
];

/**
 * Theme picker for Settings → Appearance.
 *
 * Native radios (visually hidden, styled through `peer-*`) so the browser
 * supplies single-selection, arrow-key navigation and Space activation, and
 * assistive tech reads a real radiogroup.
 *
 * The swatches use the fixed `--color-preview-*` tokens rather than the app's
 * theme-aware ones. That is the whole point: a Light card has to look light
 * even while the app is running dark. Using bg-app-surface / bg-neutral-900
 * here made the previews mirror the active theme, so Light looked dark and Dark
 * looked light.
 */
export function ThemeSelector({ value, onChange, hint }: ThemeSelectorProps) {
	return (
		<fieldset>
			<legend className="mb-1 font-medium text-neutral-900">Theme</legend>
			{hint && <p className="mb-4 text-sm text-neutral-500">{hint}</p>}

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{OPTIONS.map((option) => {
					const selected = value === option.value;
					const Icon = option.icon;
					return (
						<label
							key={option.value}
							className="group cursor-pointer"
							data-testid={`theme-option-${option.value}`}
						>
							<input
								type="radio"
								name="theme-preference"
								value={option.value}
								checked={selected}
								onChange={() => onChange(option.value)}
								className="peer sr-only"
							/>
							<span
								className={cn(
									"block rounded-xl border-2 p-3 transition-colors",
									"peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2",
									selected
										? "border-primary-600 bg-primary-50"
										: "border-neutral-200 group-hover:border-neutral-300",
								)}
							>
								<ThemeSwatch variant={option.value} />
								<span className="mt-2 flex items-center justify-between gap-2">
									<span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
										<Icon
											className="size-4 text-neutral-600"
											aria-hidden="true"
										/>
										{option.label}
									</span>
									{/* A shape, not just colour, marks the selection (WCAG 1.4.1) */}
									{selected && (
										<Check
											className="size-4 shrink-0 text-primary-700 dark:text-primary-300"
											aria-hidden="true"
										/>
									)}
								</span>
								{/* neutral-600, not 500: the selected card is tinted
								    bg-primary-50, where the lighter step only reaches
								    3.96:1. */}
								<span className="mt-0.5 block text-xs text-neutral-600">
									{option.description}
								</span>
							</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

/** Miniature window. Fixed colours — never inherits the running theme. */
function ThemeSwatch({ variant }: { variant: ThemePreference }) {
	if (variant === "system") {
		return (
			<span
				className="flex h-20 w-full overflow-hidden rounded-lg border border-preview-edge"
				aria-hidden="true"
			>
				<span className="w-1/2 border-r border-preview-edge bg-preview-light-bg p-1.5">
					<Bars tone="light" />
				</span>
				<span className="w-1/2 bg-preview-dark-bg p-1.5">
					<Bars tone="dark" />
				</span>
			</span>
		);
	}
	const dark = variant === "dark";
	return (
		<span
			className={cn(
				"block h-20 w-full overflow-hidden rounded-lg border border-preview-edge p-1.5",
				dark ? "bg-preview-dark-bg" : "bg-preview-light-bg",
			)}
			aria-hidden="true"
		>
			<Bars tone={dark ? "dark" : "light"} />
		</span>
	);
}

/** Sidebar block plus three text lines, so the swatch reads as an interface. */
function Bars({ tone }: { tone: "light" | "dark" }) {
	const surface =
		tone === "dark" ? "bg-preview-dark-surface" : "bg-preview-light-surface";
	const ink = tone === "dark" ? "bg-preview-dark-ink" : "bg-preview-light-ink";
	return (
		<span className="flex h-full w-full gap-1">
			<span className={cn("h-full w-1/4 rounded", surface)} />
			<span className="flex h-full flex-1 flex-col justify-start gap-1 pt-0.5">
				<span className={cn("h-1 w-3/4 rounded-full", ink)} />
				<span className={cn("h-1 w-1/2 rounded-full opacity-60", ink)} />
				<span className={cn("h-1 w-2/3 rounded-full opacity-40", ink)} />
			</span>
		</span>
	);
}
