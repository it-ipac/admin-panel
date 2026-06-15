import {
	Calendar,
	ClipboardList,
	Clock,
	Mail,
	MapPin,
	Phone,
	User,
} from "lucide-react";
import type { AttendanceLog, Order, TeamMember } from "@/features/orders/types";
import { formatDate, formatDateTime } from "../orderDetailPresentation";

/** Client contact details card. */
export function ClientInfoCard({ order }: { order: Order }) {
	return (
		<div className="bg-white rounded-lg border shadow-sm p-6">
			<h2 className="text-lg font-semibold text-neutral-900 mb-4">
				Client Information
			</h2>
			<div className="space-y-4">
				<div className="flex items-start gap-3">
					<User className="w-5 h-5 text-neutral-400 mt-0.5" />
					<div>
						<p className="text-sm text-neutral-500">Client Name</p>
						<p className="font-medium text-neutral-900">
							{order.clients?.name || "N/A"}
						</p>
					</div>
				</div>
				{order.clients?.contact_person && (
					<div className="flex items-start gap-3">
						<User className="w-5 h-5 text-neutral-400 mt-0.5" />
						<div>
							<p className="text-sm text-neutral-500">Contact Person</p>
							<p className="font-medium text-neutral-900">
								{order.clients.contact_person}
							</p>
						</div>
					</div>
				)}
				{order.clients?.email && (
					<div className="flex items-start gap-3">
						<Mail className="w-5 h-5 text-neutral-400 mt-0.5" />
						<div>
							<p className="text-sm text-neutral-500">Email</p>
							<a
								href={`mailto:${order.clients.email}`}
								className="font-medium text-primary-600 hover:underline"
							>
								{order.clients.email}
							</a>
						</div>
					</div>
				)}
				{order.clients?.phone && (
					<div className="flex items-start gap-3">
						<Phone className="w-5 h-5 text-neutral-400 mt-0.5" />
						<div>
							<p className="text-sm text-neutral-500">Phone</p>
							<a
								href={`tel:${order.clients.phone}`}
								className="font-medium text-primary-600 hover:underline"
							>
								{order.clients.phone}
							</a>
						</div>
					</div>
				)}
				{order.clients?.address && (
					<div className="flex items-start gap-3">
						<MapPin className="w-5 h-5 text-neutral-400 mt-0.5" />
						<div>
							<p className="text-sm text-neutral-500">Address</p>
							<p className="font-medium text-neutral-900">
								{order.clients.address}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

/** Dates / project lead / last-updated card. */
export function OrderDetailsCard({ order }: { order: Order }) {
	return (
		<div className="bg-white rounded-lg border shadow-sm p-6">
			<h2 className="text-lg font-semibold text-neutral-900 mb-4">
				Order Details
			</h2>
			<div className="space-y-4">
				<div className="flex items-start gap-3">
					<Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
					<div>
						<p className="text-sm text-neutral-500">Start Date</p>
						<p className="font-medium text-neutral-900">
							{formatDate(order.start_date)}
						</p>
					</div>
				</div>
				<div className="flex items-start gap-3">
					<Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
					<div>
						<p className="text-sm text-neutral-500">Completion Date</p>
						<p className="font-medium text-neutral-900">
							{formatDate(order.completion_date)}
						</p>
					</div>
				</div>
				{order.project_lead && (
					<div className="flex items-start gap-3">
						<User className="w-5 h-5 text-neutral-400 mt-0.5" />
						<div>
							<p className="text-sm text-neutral-500">Project Lead</p>
							<p className="font-medium text-neutral-900">
								{order.project_lead.full_name}
							</p>
						</div>
					</div>
				)}
				<div className="flex items-start gap-3">
					<Clock className="w-5 h-5 text-neutral-400 mt-0.5" />
					<div>
						<p className="text-sm text-neutral-500">Last Updated</p>
						<p className="font-medium text-neutral-900">
							{formatDateTime(order.updated_at)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Team size / sessions / days / hours summary card. */
export function WorkSummaryCard({
	teamMembers,
	attendanceLogs,
}: {
	teamMembers: TeamMember[] | undefined;
	attendanceLogs: AttendanceLog[] | undefined;
}) {
	if (!(teamMembers?.length || attendanceLogs?.length)) return null;
	return (
		<div className="bg-white rounded-lg border shadow-sm p-6">
			<h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
				<ClipboardList className="w-5 h-5" />
				Work Summary
			</h2>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<span className="text-neutral-600">Team Size</span>
					<span className="font-medium text-neutral-900">
						{teamMembers?.length || 0} packers
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-neutral-600">Work Sessions</span>
					<span className="font-medium text-neutral-900">
						{attendanceLogs?.length || 0}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-neutral-600">Work Days</span>
					<span className="font-medium text-neutral-900">
						{new Set(attendanceLogs?.map((l) => l.log_date)).size || 0}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-neutral-600">Total Hours</span>
					<span className="font-medium text-neutral-900">
						{attendanceLogs
							?.filter((l) => l.start_time && l.end_time)
							.reduce((sum, l) => {
								const start = new Date(l.start_time!).getTime();
								const end = new Date(l.end_time!).getTime();
								return sum + (end - start) / (1000 * 60 * 60);
							}, 0)
							.toFixed(1) || "0"}{" "}
						hrs
					</span>
				</div>
			</div>
		</div>
	);
}
