import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToastContext } from "../ui/ToastProvider";
import { ManifestDumpDropzone } from "./manifest/ManifestDumpDropzone";
import { ManifestReviewModal } from "./manifest/ManifestReviewModal";
import { runManifestImport } from "./manifest/manifestImport.service";
import {
	type ManifestDumpPayload,
	useManifestDump,
} from "./manifest/useManifestDump";

interface ManifestDumpPanelProps {
	clientId: string;
	/** When provided, the panel imports directly into this order (Way 2 — order page). */
	orderId?: string | null;
	/** Reports the approved payload as selections change (Way 1 — order-create modal). */
	onPayloadChange?: (payload: ManifestDumpPayload | null) => void;
	onImported?: () => void;
}

export function ManifestDumpPanel({
	clientId,
	orderId,
	onPayloadChange,
	onImported,
}: ManifestDumpPanelProps) {
	const { toast } = useToastContext();
	const dump = useManifestDump(clientId);
	const [approvedKeys, setApprovedKeys] = useState<Set<string>>(new Set());
	const [reviewOpen, setReviewOpen] = useState(false);

	const { categoryPlan, parseResult, buildPayload } = dump;

	// Default: approve creating every newly-detected category.
	useEffect(() => {
		if (categoryPlan) {
			setApprovedKeys(new Set(categoryPlan.toCreate.map((c) => c.key)));
		}
	}, [categoryPlan]);

	const payload = useMemo(
		() => buildPayload(approvedKeys),
		[buildPayload, approvedKeys],
	);

	// Report the payload upward without re-firing on callback identity changes.
	const onPayloadChangeRef = useRef(onPayloadChange);
	onPayloadChangeRef.current = onPayloadChange;
	useEffect(() => {
		onPayloadChangeRef.current?.(payload);
	}, [payload]);

	const summary = useMemo(() => {
		const rows = parseResult?.rows ?? [];
		const items = new Set(rows.map((r) => r.item_num)).size;
		const destinations = Array.from(
			new Set(rows.map((r) => r.destination || "UNASSIGNED")),
		);
		const sb = rows.filter((r) => r.is_standard_box).length;
		return { rows: rows.length, items, destinations, sb };
	}, [parseResult]);

	const importMutation = useMutation({
		mutationFn: async () => {
			if (!orderId || !payload) throw new Error("Nothing to import.");
			return runManifestImport({ clientId, orderId, ...payload });
		},
		onSuccess: (result) => {
			toast({
				title: "Items imported",
				description: `${result.itemsUpserted} items · ${result.allocationsWritten} allocations · ${result.categoriesCreated} new categories.`,
				variant: "success",
			});
			dump.reset();
			setReviewOpen(false);
			onImported?.();
		},
		onError: (error: unknown) => {
			toast({
				title: "Import failed",
				description: error instanceof Error ? error.message : "Unknown error.",
				variant: "error",
			});
		},
	});

	const toggleKey = (key: string) =>
		setApprovedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const handleFile = (file: File) => {
		void dump.processFile(file).then(() => setReviewOpen(true));
	};

	const hasResult = !!parseResult && !dump.error;

	return (
		<>
			<ManifestDumpDropzone
				fileName={dump.fileName}
				parsing={dump.parsing}
				error={dump.error}
				itemCount={summary.items}
				hasResult={hasResult}
				onFile={handleFile}
				onReview={() => setReviewOpen(true)}
			/>

			{parseResult && !dump.error && (
				<ManifestReviewModal
					open={reviewOpen}
					onOpenChange={setReviewOpen}
					fileName={dump.fileName}
					parseResult={parseResult}
					categoryPlan={categoryPlan}
					summary={summary}
					approvedKeys={approvedKeys}
					onToggleKey={toggleKey}
					showImport={!!orderId}
					importPending={importMutation.isPending}
					importDisabled={!payload}
					onImport={() => importMutation.mutate()}
				/>
			)}
		</>
	);
}
