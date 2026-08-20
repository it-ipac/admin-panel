import { Camera, Loader2, ScanLine, X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

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
	const closeButtonRef = useRef<HTMLButtonElement | null>(null);
	const previouslyFocusedRef = useRef<HTMLElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [starting, setStarting] = useState(true);
	const titleId = useId();
	const descriptionId = useId();
	const onCloseEvent = useEffectEvent(onClose);
	const onResultEvent = useEffectEvent(onResult);

	useEffect(() => {
		if (!open) return;

		previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const focusFrame = requestAnimationFrame(() =>
			closeButtonRef.current?.focus(),
		);
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onCloseEvent();
		};
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			cancelAnimationFrame(focusFrame);
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
			previouslyFocusedRef.current?.focus();
		};
	}, [open]);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		let decodeQr: typeof import("jsqr")["default"] | null = null;
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
			const code = decodeQr?.(image.data, image.width, image.height, {
				inversionAttempts: "dontInvert",
			});
			if (code?.data) {
				onResultEvent(code.data.trim());
				return; // stop scanning; parent closes the modal
			}
			rafRef.current = requestAnimationFrame(tick);
		};

		(async () => {
			try {
				if (!navigator.mediaDevices?.getUserMedia) {
					throw new Error("Camera not available in this browser.");
				}
				const [decoderModule, stream] = await Promise.all([
					import("jsqr"),
					navigator.mediaDevices.getUserMedia({
						video: { facingMode: "environment" },
						audio: false,
					}),
				]);
				decodeQr = decoderModule.default;
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
	}, [open]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
		>
			<div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-neutral-950 shadow-2xl ring-1 ring-white/15">
				<div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
					<div className="flex min-w-0 items-center gap-3">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/10">
							<Camera className="h-5 w-5" aria-hidden="true" />
						</span>
						<div>
							<div
								id={titleId}
								role="heading"
								aria-level={2}
								className="font-bold text-white"
							>
								Scan package QR
							</div>
							<p className="mt-0.5 text-sm text-white/60">
								Camera starts automatically
							</p>
						</div>
					</div>
					<button
						ref={closeButtonRef}
						type="button"
						onClick={onClose}
						className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition-[background-color,transform] hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 active:scale-100"
						aria-label="Close QR scanner"
						title="Close scanner (Escape)"
					>
						<X className="h-5 w-5" aria-hidden="true" />
					</button>
				</div>

				<div className="px-3 sm:px-6">
					{error ? (
						<div className="flex min-h-64 flex-col items-center justify-center rounded-2xl bg-danger-950/70 p-6 text-center text-white ring-1 ring-danger-400/40">
							<Camera
								className="mb-4 h-8 w-8 text-danger-300"
								aria-hidden="true"
							/>
							<p className="max-w-sm font-semibold text-white">{error}</p>
							<p className="mt-2 max-w-sm text-sm text-white/60">
								You can close this window and paste the QR token instead.
							</p>
						</div>
					) : (
						<div className="relative min-h-64 overflow-hidden rounded-2xl bg-black ring-1 ring-white/15">
							{starting && (
								<div
									className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white"
									role="status"
								>
									<Loader2
										className="h-7 w-7 animate-spin"
										aria-hidden="true"
									/>
									<span className="text-sm font-medium text-white/75">
										Starting camera...
									</span>
								</div>
							)}
							<video
								ref={videoRef}
								className="max-h-[62vh] min-h-64 w-full object-cover"
								playsInline
								muted
							>
								<track kind="captions" />
							</video>
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,transparent_0,transparent_34%,rgba(0,0,0,0.42)_35%)]">
								<div className="flex aspect-square w-[62%] max-w-64 items-center justify-center rounded-3xl ring-2 ring-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_0_40px_rgba(37,99,235,0.3)]">
									<ScanLine
										className="h-10 w-10 text-white/80"
										aria-hidden="true"
									/>
								</div>
							</div>
						</div>
					)}
				</div>

				<canvas ref={canvasRef} className="hidden" />
				<p
					id={descriptionId}
					className="px-6 py-5 text-center text-sm leading-6 text-white/65"
				>
					Hold the label inside the frame. The package opens automatically when
					the code is detected.
				</p>
			</div>
		</div>
	);
}
