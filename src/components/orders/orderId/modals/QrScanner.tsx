import jsQR from "jsqr";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface QrScannerProps {
	open: boolean;
	onClose: () => void;
	onResult: (text: string) => void;
}

/**
 * Live camera QR scanner. Grabs frames from the rear camera and decodes with
 * jsQR; the first successful read is handed back via onResult. Used to relink a
 * box to the QR token already printed on its physical label.
 */
export function QrScanner({ open, onClose, onResult }: QrScannerProps) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [starting, setStarting] = useState(true);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		setError(null);
		setStarting(true);

		const stop = () => {
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
			streamRef.current?.getTracks().forEach((t) => {
				t.stop();
			});
			streamRef.current = null;
		};

		const tick = () => {
			const video = videoRef.current;
			const canvas = canvasRef.current;
			if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
				rafRef.current = requestAnimationFrame(tick);
				return;
			}
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) return;
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const code = jsQR(image.data, image.width, image.height, {
				inversionAttempts: "dontInvert",
			});
			if (code?.data) {
				onResult(code.data.trim());
				return; // stop scanning; parent closes the modal
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		(async () => {
			try {
				if (!navigator.mediaDevices?.getUserMedia) {
					throw new Error("Camera not available in this browser.");
				}
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment" },
					audio: false,
				});
				if (cancelled) {
					stream.getTracks().forEach((t) => {
						t.stop();
					});
					return;
				}
				streamRef.current = stream;
				const video = videoRef.current;
				if (video) {
					video.srcObject = stream;
					await video.play();
				}
				setStarting(false);
				rafRef.current = requestAnimationFrame(tick);
			} catch (e: any) {
				if (!cancelled) {
					setError(
						e?.name === "NotAllowedError"
							? "Camera permission denied. Allow access and try again."
							: e?.message || "Could not start the camera.",
					);
					setStarting(false);
				}
			}
		})();

		return () => {
			cancelled = true;
			stop();
		};
	}, [open, onResult]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[60] p-4">
			<button
				onClick={onClose}
				className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
				title="Close scanner"
			>
				<X className="w-5 h-5" />
			</button>

			<h3 className="text-white font-semibold mb-3">Scan the box's QR label</h3>

			{error ? (
				<div className="max-w-sm text-center text-white/90 bg-danger-600/30 border border-danger-400/40 rounded-lg p-4">
					{error}
				</div>
			) : (
				<div className="relative">
					{starting && (
						<div className="absolute inset-0 flex items-center justify-center text-white">
							<Loader2 className="w-6 h-6 animate-spin" />
						</div>
					)}
					<video
						ref={videoRef}
						className="max-w-[90vw] max-h-[70vh] rounded-lg"
						playsInline
						muted
					>
						<track kind="captions" />
					</video>
					<div className="absolute inset-0 border-2 border-white/60 rounded-lg pointer-events-none" />
				</div>
			)}

			<canvas ref={canvasRef} className="hidden" />
			<p className="text-white/70 text-sm mt-3 text-center max-w-sm">
				Point the camera at the QR printed on the box. It links automatically
				once detected.
			</p>
		</div>
	);
}
