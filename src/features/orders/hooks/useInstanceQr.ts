import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/** Pulls the bare QR token out of either a raw token or a scanned
 *  `…/portal/scan/<token>` URL. */
export function parseQrToken(raw: string): string {
	const trimmed = raw.trim();
	const m = trimmed.match(/\/scan\/([^/?#\s]+)/i);
	if (m) return decodeURIComponent(m[1]);
	// strip any stray query/hash/whitespace if a bare value was pasted
	return trimmed.split(/[?#\s]/)[0];
}

/**
 * QR-code linking for package instances (entity_type = "package", entity_id =
 * instance id). The admin panel never minted these (only the ops app did), so
 * boxes created/edited here can lack a row. This lets an admin paste the token
 * printed on a physical label and bind it, so the existing label keeps working
 * without a reprint — or generate a fresh token when there is no label yet.
 */
export function useInstanceQr(instanceIds: string[]) {
	const queryClient = useQueryClient();

	const { data: tokenByInstance } = useQuery({
		queryKey: ["instanceQr", instanceIds],
		enabled: instanceIds.length > 0,
		queryFn: async () => {
			const { data, error } = await supabase
				.from("qr_codes")
				.select("entity_id, token, is_active")
				.eq("entity_type", "package")
				.in("entity_id", instanceIds);
			if (error) throw error;
			const map = new Map<string, { token: string; is_active: boolean }>();
			for (const row of data || []) {
				map.set(row.entity_id, { token: row.token, is_active: row.is_active });
			}
			return map;
		},
	});

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["instanceQr"] });

	// Link an existing (printed) token, or replace whatever is bound.
	const linkQrMutation = useMutation({
		mutationFn: async ({
			instanceId,
			raw,
		}: {
			instanceId: string;
			raw: string;
		}) => {
			const token = parseQrToken(raw);
			if (!token) throw new Error("Enter a QR token or scan URL.");

			// Guard: token must not already belong to a different entity.
			const { data: clash, error: clashErr } = await supabase
				.from("qr_codes")
				.select("entity_id")
				.eq("token", token)
				.maybeSingle();
			if (clashErr) throw clashErr;
			if (clash && clash.entity_id !== instanceId) {
				throw new Error("That QR token is already linked to another box.");
			}

			const { data: existing, error: existErr } = await supabase
				.from("qr_codes")
				.select("id")
				.eq("entity_type", "package")
				.eq("entity_id", instanceId)
				.maybeSingle();
			if (existErr) throw existErr;

			if (existing) {
				const { error } = await supabase
					.from("qr_codes")
					.update({ token, is_active: true })
					.eq("id", existing.id);
				if (error) throw error;
			} else {
				const { error } = await supabase
					.from("qr_codes")
					.insert({ entity_type: "package", entity_id: instanceId, token });
				if (error) throw error;
			}
			return token;
		},
		onSuccess: invalidate,
	});

	// Mint a fresh token (DB default) for a box with no physical label yet.
	const generateQrMutation = useMutation({
		mutationFn: async ({ instanceId }: { instanceId: string }) => {
			const { error } = await supabase
				.from("qr_codes")
				.insert({ entity_type: "package", entity_id: instanceId });
			if (error) throw error;
		},
		onSuccess: invalidate,
	});

	return { tokenByInstance, linkQrMutation, generateQrMutation };
}
