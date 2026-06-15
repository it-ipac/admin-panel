import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AttendanceChange, AttendanceLog } from "../types";
import { calculateAttendanceChanges } from "../utils/attendanceCleaner";

/**
 * State + actions for the "Clean Attendance" modal: proposes shift
 * end-time fixes for a day and applies the approved ones.
 */
export function useAttendanceCleaner(
	orderId: string,
	attendanceLogs: AttendanceLog[] | undefined,
	selectedAttendanceDate: string | null,
) {
	const queryClient = useQueryClient();
	const [cleanerModalOpen, setCleanerModalOpen] = useState(false);
	const [proposedChanges, setProposedChanges] = useState<AttendanceChange[]>(
		[],
	);
	const [applyingChanges, setApplyingChanges] = useState(false);

	// Calculate proposed attendance changes - handles both morning and afternoon shifts
	const calculateProposedChanges = (): void => {
		if (!attendanceLogs || !selectedAttendanceDate) return;
		setProposedChanges(
			calculateAttendanceChanges(attendanceLogs, selectedAttendanceDate),
		);
		setCleanerModalOpen(true);
	};

	// Toggle individual approval
	const toggleApproval = (id: string): void => {
		setProposedChanges((prev) =>
			prev.map((change) =>
				change.id === id ? { ...change, approved: !change.approved } : change,
			),
		);
	};

	// Approve all changes
	const approveAll = (): void => {
		setProposedChanges((prev) =>
			prev.map((change) => ({ ...change, approved: true })),
		);
	};

	// Apply approved changes mutation
	const applyChangesMutation = useMutation({
		mutationFn: async (changesToApply: AttendanceChange[]) => {
			const approvedChanges = changesToApply.filter((c) => c.approved);

			if (approvedChanges.length === 0) {
				throw new Error("No changes selected to apply");
			}

			const updates = approvedChanges.map((change) =>
				supabase
					.from("attendance_logs")
					.update({ end_time: change.newEnd })
					.eq("id", change.id),
			);

			const results = await Promise.all(updates);
			const errors = results.filter((r) => r.error);
			if (errors.length > 0) {
				throw new Error(`Failed to update ${errors.length} record(s)`);
			}

			return { updated: approvedChanges.length };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["attendance", orderId] });
			setCleanerModalOpen(false);
			setProposedChanges([]);
		},
		onError: (error) => {
			console.error("Error applying changes:", error);
		},
	});

	// Apply selected changes
	const applySelectedChanges = async (): Promise<void> => {
		setApplyingChanges(true);
		try {
			await applyChangesMutation.mutateAsync(proposedChanges);
		} finally {
			setApplyingChanges(false);
		}
	};

	return {
		cleanerModalOpen,
		setCleanerModalOpen,
		proposedChanges,
		applyingChanges,
		calculateProposedChanges,
		toggleApproval,
		approveAll,
		applySelectedChanges,
	};
}
