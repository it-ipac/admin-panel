import { CalendarDays, GitCommitHorizontal, Tag } from "lucide-react";
import {
	formatReleaseDate,
	getShortSha,
	releaseInfo,
} from "../services/releaseInfo";

export function ReleaseInfoPanel() {
	const hasFeatures = releaseInfo.features.length > 0;

	return (
		<div className="space-y-6 max-w-2xl">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
					<div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-500">
						<Tag className="h-4 w-4" />
						Version
					</div>
					<p className="mt-2 text-sm font-semibold text-neutral-900">
						v{releaseInfo.version}
					</p>
				</div>
				<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
					<div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-500">
						<CalendarDays className="h-4 w-4" />
						Updated
					</div>
					<p className="mt-2 text-sm font-semibold text-neutral-900">
						{formatReleaseDate(releaseInfo.updatedAt)}
					</p>
				</div>
				<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
					<div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-500">
						<GitCommitHorizontal className="h-4 w-4" />
						Commit
					</div>
					<p className="mt-2 text-sm font-semibold text-neutral-900">
						{getShortSha(releaseInfo.commitSha)}
					</p>
				</div>
				<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
					<div className="flex items-center gap-2 text-xs font-medium uppercase text-neutral-500">
						<Tag className="h-4 w-4" />
						Release Type
					</div>
					<p className="mt-2 text-sm font-semibold text-neutral-900 capitalize">
						{releaseInfo.releaseType}
					</p>
				</div>
			</div>

			<div>
				<h3 className="font-medium text-neutral-900 mb-3">Release Features</h3>
				{hasFeatures ? (
					<ul className="space-y-2">
						{releaseInfo.features.map((feature) => (
							<li
								key={feature}
								className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700"
							>
								{feature}
							</li>
						))}
					</ul>
				) : (
					<div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
						No feature notes were provided for this deployment.
					</div>
				)}
			</div>
		</div>
	);
}
