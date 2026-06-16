import { Camera, Loader2, QrCode, X } from "lucide-react";
import { useState } from "react";
import type { PackageInstance } from "@/features/orders/types";
import { QrScanner } from "./QrScanner";

interface SyncQrModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	instance: PackageInstance | null;
	currentToken?: string | null;
	isSaving: boolean;
	onLink: (instanceId: string, raw: string) => void;
	onGenerate: (instanceId: string) => void;
}

export function SyncQrModal({
	open,
	onOpenChange,
	instance,
	currentToken,
	isSaving,
	onLink,
	onGenerate,
}: SyncQrModalProps) {
	const [raw, setRaw] = useState("");
	const [scanning, setScanning] = useState(false);

	if (!open || !instance) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
				<div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
					<h3 className="font-semibold text-neutral-800 flex items-center gap-2">
						<QrCode className="w-4 h-4" /> Link QR code
					</h3>
					<button
						onClick={() => onOpenChange(false)}
						className="text-neutral-400 hover:text-neutral-600"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-4 space-y-3">
					<p className="text-sm text-neutral-600">
						Box{" "}
						<span className="font-medium text-neutral-800">
							{instance.ipac_reference || `#${instance.instance_number ?? ""}`}
						</span>
						.{" "}
						{currentToken
							? "A QR is already linked — pasting a new value replaces it."
							: "No QR is linked yet."}
					</p>

					{currentToken && (
						<div className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-100 rounded p-2 break-all">
							Current token: <span className="font-mono">{currentToken}</span>
						</div>
					)}

					<label className="block text-sm font-medium text-neutral-700">
						Scanned link or token
					</label>
					<div className="flex gap-2">
						<input
							className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
							placeholder="https://…/portal/scan/abc123  or  abc123"
							value={raw}
							onChange={(e) => setRaw(e.target.value)}
						/>
						<button
							onClick={() => setScanning(true)}
							className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 whitespace-nowrap"
							title="Scan the box's QR with the camera"
						>
							<Camera className="w-4 h-4" /> Scan
						</button>
					</div>
					<p className="text-xs text-neutral-500">
						Scan or paste the QR already printed on the box to keep that label
						working. The box's UUID and report stay the same.
					</p>
				</div>

				<QrScanner
					open={scanning}
					onClose={() => setScanning(false)}
					onResult={(text) => {
						setScanning(false);
						setRaw(text);
						onLink(instance.id, text);
					}}
				/>

				<div className="px-4 py-3 border-t border-neutral-100 flex justify-between gap-2 bg-neutral-50">
					<button
						onClick={() => onGenerate(instance.id)}
						disabled={isSaving}
						className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded disabled:opacity-50"
						title="No physical label yet — mint a fresh token"
					>
						Generate new instead
					</button>
					<div className="flex gap-2">
						<button
							onClick={() => onOpenChange(false)}
							className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-200 rounded"
						>
							Cancel
						</button>
						<button
							onClick={() => onLink(instance.id, raw)}
							disabled={isSaving || !raw.trim()}
							className="px-3 py-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 rounded flex items-center gap-2 disabled:opacity-50"
						>
							{isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
							Link QR
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
