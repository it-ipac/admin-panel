import React, { useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import {
	getSignatureUrl,
	useSignatures,
	type SignatureRow,
} from "../hooks/useSignatures";

interface Props {
	/** Currently selected signature id (from signature_fields[i].image_id) */
	selectedId: string | null | undefined;
	onSelect: (sig: SignatureRow | null) => void;
	onClose: () => void;
}

type Tab = "mine" | "public";

export const SignaturePickerModal: React.FC<Props> = ({
	selectedId,
	onSelect,
	onClose,
}) => {
	const { user, profile } = useAuth();
	const { query, upload, remove, updateLabel, setPublic } = useSignatures();
	const [tab, setTab] = useState<Tab>("mine");
	const [uploadLabel, setUploadLabel] = useState("");
	const [uploadPublic, setUploadPublic] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	const isAdmin =
		profile?.roles?.name === "admin" ||
		profile?.roles?.name === "executive";

	const allSigs = query.data ?? [];
	const mineSigs = allSigs.filter((s) => s.user_id === user?.id);
	const publicSigs = allSigs.filter((s) => s.is_public);
	const displayed = tab === "mine" ? mineSigs : publicSigs;

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !user) return;
		await upload.mutateAsync({
			file,
			userId: user.id,
			label: uploadLabel || file.name.replace(/\.[^.]+$/, ""),
			isPublic: uploadPublic,
		});
		setUploadLabel("");
		if (fileRef.current) fileRef.current.value = "";
	};

	const handleStartEdit = (sig: SignatureRow) => {
		setEditingId(sig.id);
		setEditLabel(sig.label);
	};

	const handleSaveEdit = async (id: string) => {
		await updateLabel.mutateAsync({ id, label: editLabel });
		setEditingId(null);
	};

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 9999,
				background: "rgba(0,0,0,0.45)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				style={{
					background: "#fff",
					borderRadius: 12,
					width: 520,
					maxHeight: "80vh",
					display: "flex",
					flexDirection: "column",
					boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
					overflow: "hidden",
				}}
			>
				{/* Header */}
				<div
					style={{
						padding: "14px 18px",
						borderBottom: "1px solid #e5e7eb",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>
						Choose Signature
					</span>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							fontSize: 20,
							cursor: "pointer",
							color: "#888",
							lineHeight: 1,
						}}
					>
						×
					</button>
				</div>

				{/* Tabs */}
				<div
					style={{
						display: "flex",
						borderBottom: "1px solid #e5e7eb",
						padding: "0 18px",
					}}
				>
					{(["mine", "public"] as Tab[]).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setTab(t)}
							style={{
								background: "none",
								border: "none",
								borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
								padding: "8px 14px",
								fontWeight: tab === t ? 600 : 400,
								fontSize: 13,
								color: tab === t ? "#2563eb" : "#666",
								cursor: "pointer",
								marginBottom: -1,
							}}
						>
							{t === "mine" ? "My Signatures" : "Public Signatures"}
						</button>
					))}
				</div>

				{/* Body */}
				<div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
					{/* Upload strip (mine tab only) */}
					{tab === "mine" && (
						<div
							style={{
								background: "#f8fafc",
								border: "1px dashed #cbd5e1",
								borderRadius: 8,
								padding: "10px 14px",
								marginBottom: 14,
								display: "flex",
								flexDirection: "column",
								gap: 8,
							}}
						>
							<span
								style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}
							>
								Upload New Signature
							</span>
							<input
								type="text"
								placeholder="Label (e.g. John Smith)"
								value={uploadLabel}
								onChange={(e) => setUploadLabel(e.target.value)}
								style={{
									border: "1px solid #e2e8f0",
									borderRadius: 6,
									padding: "4px 8px",
									fontSize: 12,
									outline: "none",
								}}
							/>
							{isAdmin && (
								<label
									style={{
										display: "flex",
										gap: 6,
										alignItems: "center",
										fontSize: 12,
										color: "#64748b",
										cursor: "pointer",
									}}
								>
									<input
										type="checkbox"
										checked={uploadPublic}
										onChange={(e) => setUploadPublic(e.target.checked)}
									/>
									Make available to everyone (public)
								</label>
							)}
							<input
								ref={fileRef}
								type="file"
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
								onChange={handleFileChange}
								style={{ fontSize: 12 }}
							/>
							{upload.isPending && (
								<span style={{ fontSize: 11, color: "#94a3b8" }}>
									Uploading…
								</span>
							)}
						</div>
					)}

					{/* Grid */}
					{query.isLoading ? (
						<div
							style={{
								textAlign: "center",
								color: "#94a3b8",
								padding: "24px 0",
								fontSize: 13,
							}}
						>
							Loading…
						</div>
					) : displayed.length === 0 ? (
						<div
							style={{
								textAlign: "center",
								color: "#94a3b8",
								padding: "24px 0",
								fontSize: 13,
								fontStyle: "italic",
							}}
						>
							{tab === "mine"
								? "No signatures yet. Upload one above."
								: "No public signatures available."}
						</div>
					) : (
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
								gap: 10,
							}}
						>
							{displayed.map((sig) => {
								const isSelected = sig.id === selectedId;
								const isOwner = sig.user_id === user?.id;
								return (
									<div
										key={sig.id}
										style={{
											border: isSelected
												? "2px solid #2563eb"
												: "1px solid #e2e8f0",
											borderRadius: 8,
											overflow: "hidden",
											background: isSelected ? "#eff6ff" : "#fff",
											display: "flex",
											flexDirection: "column",
											cursor: "pointer",
										}}
										onClick={() => onSelect(isSelected ? null : sig)}
									>
										{/* Thumbnail */}
										<div
											style={{
												background: "#f8fafc",
												height: 60,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												padding: 6,
											}}
										>
											<img
												src={getSignatureUrl(sig.image_path)}
												alt={sig.label}
												style={{
													maxWidth: "100%",
													maxHeight: "100%",
													objectFit: "contain",
												}}
											/>
										</div>

										{/* Meta */}
										<div
											style={{ padding: "6px 8px", borderTop: "1px solid #f1f5f9" }}
										>
											{editingId === sig.id ? (
												<div style={{ display: "flex", gap: 4 }}>
													<input
														type="text"
														value={editLabel}
														onChange={(e) => setEditLabel(e.target.value)}
														onClick={(e) => e.stopPropagation()}
														style={{
															flex: 1,
															fontSize: 11,
															border: "1px solid #cbd5e1",
															borderRadius: 4,
															padding: "1px 4px",
															outline: "none",
														}}
													/>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleSaveEdit(sig.id);
														}}
														style={{
															fontSize: 10,
															background: "#2563eb",
															color: "#fff",
															border: "none",
															borderRadius: 4,
															padding: "1px 5px",
															cursor: "pointer",
														}}
													>
														✓
													</button>
												</div>
											) : (
												<span
													style={{
														fontSize: 11,
														color: "#374151",
														fontWeight: 500,
														display: "block",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
													}}
												>
													{sig.label || "(no label)"}
												</span>
											)}

											{/* Actions row (owner only) */}
											{isOwner && (
												<div
													style={{
														display: "flex",
														gap: 4,
														marginTop: 4,
														flexWrap: "wrap",
													}}
												>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleStartEdit(sig);
														}}
														style={actionBtnStyle}
													>
														✏️
													</button>
													{isAdmin && (
														<button
															type="button"
															title={
																sig.is_public ? "Make private" : "Make public"
															}
															onClick={(e) => {
																e.stopPropagation();
																setPublic.mutate({
																	id: sig.id,
																	isPublic: !sig.is_public,
																});
															}}
															style={{
																...actionBtnStyle,
																background: sig.is_public ? "#dcfce7" : "#f1f5f9",
																color: sig.is_public ? "#16a34a" : "#64748b",
															}}
														>
															{sig.is_public ? "🌐" : "🔒"}
														</button>
													)}
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															if (
																confirm(
																	"Delete this signature? This cannot be undone.",
																)
															) {
																remove.mutate({ id: sig.id, imagePath: sig.image_path });
																if (isSelected) onSelect(null);
															}
														}}
														style={{ ...actionBtnStyle, color: "#ef4444" }}
													>
														🗑️
													</button>
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div
					style={{
						padding: "10px 18px",
						borderTop: "1px solid #e5e7eb",
						display: "flex",
						justifyContent: "flex-end",
						gap: 8,
					}}
				>
					{selectedId && (
						<button
							type="button"
							onClick={() => onSelect(null)}
							style={{
								fontSize: 12,
								padding: "5px 12px",
								border: "1px solid #e2e8f0",
								borderRadius: 6,
								background: "#fff",
								color: "#64748b",
								cursor: "pointer",
							}}
						>
							Clear Selection
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						style={{
							fontSize: 12,
							padding: "5px 16px",
							border: "none",
							borderRadius: 6,
							background: "#2563eb",
							color: "#fff",
							cursor: "pointer",
							fontWeight: 600,
						}}
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
};

const actionBtnStyle: React.CSSProperties = {
	fontSize: 11,
	background: "#f1f5f9",
	border: "none",
	borderRadius: 4,
	padding: "2px 5px",
	cursor: "pointer",
	color: "#374151",
};
