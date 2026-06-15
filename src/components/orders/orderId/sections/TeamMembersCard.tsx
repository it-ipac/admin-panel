import { User, Users } from "lucide-react";
import type { TeamMember } from "@/features/orders/types";

interface TeamMembersCardProps {
	teamMembers: TeamMember[] | undefined;
}

/** Grid of packers assigned to the order, team lead first. */
export function TeamMembersCard({ teamMembers }: TeamMembersCardProps) {
	return (
		<div className="bg-white rounded-lg border shadow-sm overflow-hidden">
			<div className="px-6 py-4 border-b flex items-center gap-2">
				<Users className="w-5 h-5 text-neutral-500" />
				<h2 className="text-lg font-semibold text-neutral-900">Team Members</h2>
				<span className="ml-auto text-sm text-neutral-500">
					{teamMembers?.length || 0} packers
				</span>
			</div>
			{teamMembers && teamMembers.length > 0 ? (
				<div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
					{teamMembers
						.sort((a, b) => (b.is_team_lead ? 1 : 0) - (a.is_team_lead ? 1 : 0))
						.map((member) => (
							<div
								key={member.id}
								className={`flex items-center gap-3 p-3 rounded-lg border ${
									member.is_team_lead
										? "bg-primary-50 border-primary-200"
										: "bg-neutral-50 border-neutral-200"
								}`}
							>
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center ${
										member.is_team_lead ? "bg-primary-500" : "bg-neutral-400"
									}`}
								>
									<User className="w-5 h-5 text-white" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="font-medium text-neutral-900 truncate">
										{member.packer?.full_name || "Unknown"}
									</p>
									{member.is_team_lead && (
										<span className="text-xs text-primary-600 font-medium">
											Team Lead
										</span>
									)}
								</div>
							</div>
						))}
				</div>
			) : (
				<div className="p-6 text-center text-neutral-500">
					<Users className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
					<p>No team members assigned</p>
				</div>
			)}
		</div>
	);
}
