import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabase";

export type SignatureRow = {
	id: string;
	user_id: string;
	label: string;
	image_path: string;
	is_public: boolean;
	created_at: string;
};

const BUCKET = "signatures";

export function getSignatureUrl(imagePath: string): string {
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(imagePath);
	return data.publicUrl;
}

async function fetchSignatures(): Promise<SignatureRow[]> {
	const { data, error } = await supabase
		.from("signatures")
		.select("id, user_id, label, image_path, is_public, created_at")
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as SignatureRow[];
}

export function useSignatures() {
	const qc = useQueryClient();

	const query = useQuery({
		queryKey: ["signatures"],
		queryFn: fetchSignatures,
		staleTime: 30_000,
	});

	const upload = useMutation({
		mutationFn: async ({
			file,
			userId,
			label,
			isPublic,
		}: {
			file: File;
			userId: string;
			label: string;
			isPublic: boolean;
		}) => {
			const ext = file.name.split(".").pop() ?? "png";
			const path = `${userId}/${crypto.randomUUID()}.${ext}`;

			const { error: uploadErr } = await supabase.storage
				.from(BUCKET)
				.upload(path, file, { upsert: false, contentType: file.type });
			if (uploadErr) throw uploadErr;

			const { data, error: dbErr } = await supabase
				.from("signatures")
				.insert({
					user_id: userId,
					label,
					image_path: path,
					is_public: isPublic,
				})
				.select("*")
				.single();
			if (dbErr) {
				// Cleanup orphaned storage file on DB failure
				await supabase.storage.from(BUCKET).remove([path]);
				throw dbErr;
			}
			return data as SignatureRow;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["signatures"] }),
	});

	const remove = useMutation({
		mutationFn: async ({
			id,
			imagePath,
		}: {
			id: string;
			imagePath: string;
		}) => {
			await supabase.storage.from(BUCKET).remove([imagePath]);
			const { error } = await supabase.from("signatures").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["signatures"] }),
	});

	const updateLabel = useMutation({
		mutationFn: async ({ id, label }: { id: string; label: string }) => {
			const { error } = await supabase
				.from("signatures")
				.update({ label })
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["signatures"] }),
	});

	const setPublic = useMutation({
		mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
			const { error } = await supabase
				.from("signatures")
				.update({ is_public: isPublic })
				.eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["signatures"] }),
	});

	return { query, upload, remove, updateLabel, setPublic };
}
