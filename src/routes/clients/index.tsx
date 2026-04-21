import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Building2,
	ChevronRight,
	Loader2,
	Plus,
	Search,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { db, supabase } from "../../lib/supabase";

export const Route = createFileRoute("/clients/")({
	component: ClientsIndexPage,
});

function ClientsIndexPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [mounted, setMounted] = useState(false);

	const [showAddClient, setShowAddClient] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const [newClient, setNewClient] = useState({
		name: "",
		contact_person: "",
		email: "",
		phone: "",
	});

	const defaultLogoInputRef = useRef<HTMLInputElement>(null);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [defaultLogoUrl, setDefaultLogoUrl] = useState<string | null>(null);
	const [logoLoadFailed, setLogoLoadFailed] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const { data } = supabase.storage
			.from("media")
			.getPublicUrl("assets/default_qr_logo.png");
		setLogoLoadFailed(false);
		setDefaultLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
	}, []);

	useEffect(() => {
		if (!authLoading && !user) navigate({ to: "/login" });
	}, [user, authLoading, navigate]);

	const { data: clients, isLoading } = useQuery({
		queryKey: ["clients"],
		queryFn: async () => {
			const { data, error } = await db.getClients();
			if (error) throw error;
			return data || [];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	const createClientMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await db.createClient({
				name: newClient.name.trim(),
				contact_person: newClient.contact_person.trim() || null,
				email: newClient.email.trim() || null,
				phone: newClient.phone.trim() || null,
			});
			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setShowAddClient(false);
			setFormError(null);
			setNewClient({ name: "", contact_person: "", email: "", phone: "" });
		},
		onError: (error: any) =>
			setFormError(error?.message || "Failed to add client"),
	});

	const handleUploadDefaultLogo = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			setUploadingLogo(true);
			const fileName = "default_qr_logo.png";
			const { error } = await db.uploadLogo(file, `assets/${fileName}`);
			if (error) throw error;

			const { data } = supabase.storage
				.from("media")
				.getPublicUrl(`assets/${fileName}`);
			setLogoLoadFailed(false);
			setDefaultLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
			alert("Default IPAC logo updated!");
		} catch (error: any) {
			console.error(error);
			alert(`Failed to upload default logo: ${error.message}`);
		} finally {
			setUploadingLogo(false);
			if (defaultLogoInputRef.current) defaultLogoInputRef.current.value = "";
		}
	};

	const filteredClients =
		clients?.filter((client: any) =>
			client.name?.toLowerCase().includes(debouncedSearch.toLowerCase()),
		) || [];

	if (!mounted) return null;

	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-8">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Clients</h1>
							<p className="text-gray-500 mt-1">
								Click a client row to open its workspace.
							</p>
						</div>
						<div className="flex gap-3">
							<input
								type="file"
								className="hidden"
								ref={defaultLogoInputRef}
								accept="image/*"
								onChange={handleUploadDefaultLogo}
							/>
							{defaultLogoUrl && !logoLoadFailed ? (
								<div className="flex items-center gap-3 bg-white px-3 py-2 border border-gray-200 rounded-lg shadow-sm">
									<img
										src={defaultLogoUrl}
										className="w-8 h-8 object-contain rounded"
										alt="Default IPAC Logo"
										onError={() => setLogoLoadFailed(true)}
									/>
									<button
										onClick={() => defaultLogoInputRef.current?.click()}
										disabled={uploadingLogo}
										className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
									>
										{uploadingLogo ? "Uploading..." : "Change Logo"}
									</button>
								</div>
							) : (
								<button
									onClick={() => defaultLogoInputRef.current?.click()}
									disabled={uploadingLogo}
									className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-200 transition-colors disabled:opacity-50"
								>
									{uploadingLogo ? (
										<Loader2 className="w-5 h-5 animate-spin" />
									) : (
										<Upload className="w-5 h-5" />
									)}
									Upload IPAC Logo
								</button>
							)}
							<button
								onClick={() => {
									setFormError(null);
									setShowAddClient(true);
								}}
								className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								<Plus className="w-5 h-5" />
								Add Client
							</button>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
						<div className="flex flex-wrap gap-4">
							<div className="flex-1 min-w-50 relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search clients..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
							</div>
						) : filteredClients.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12">
								<Building2 className="w-12 h-12 text-gray-300 mb-4" />
								<p className="text-gray-500">No clients found</p>
							</div>
						) : (
							<div className="divide-y divide-gray-100">
								{filteredClients.map((client: any) => (
									<Link
										key={client.id}
										to="/clients/$clientId"
										params={{ clientId: client.id }}
										className="grid grid-cols-[2fr_1.5fr_1.5fr_auto] items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-colors"
									>
										<div className="min-w-0">
											<p className="font-semibold text-gray-900 truncate">
												{client.name}
											</p>
											{client.contact_person && (
												<p className="text-xs text-gray-500 truncate">
													{client.contact_person}
												</p>
											)}
										</div>
										<p className="text-sm text-gray-600 truncate">
											{client.email || "-"}
										</p>
										<p className="text-sm text-gray-600 truncate">
											{client.phone || "-"}
										</p>
										<ChevronRight className="w-4 h-4 text-gray-400 justify-self-end" />
									</Link>
								))}
							</div>
						)}
					</div>
				</div>
			</main>

			{showAddClient && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
						<div className="flex justify-between mb-4">
							<h2 className="text-xl font-bold text-gray-900">Add Client</h2>
							<button
								onClick={() => setShowAddClient(false)}
								className="text-gray-400 hover:text-gray-600"
							>
								✕
							</button>
						</div>

						<div className="grid gap-4">
							<div>
								<label
									htmlFor="client-name"
									className="text-sm font-medium text-gray-700"
								>
									Company Name *
								</label>
								<input
									id="client-name"
									className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
									value={newClient.name}
									onChange={(e) =>
										setNewClient((previous) => ({
											...previous,
											name: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<label
									htmlFor="client-contact"
									className="text-sm font-medium text-gray-700"
								>
									Contact Person
								</label>
								<input
									id="client-contact"
									className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
									value={newClient.contact_person}
									onChange={(e) =>
										setNewClient((previous) => ({
											...previous,
											contact_person: e.target.value,
										}))
									}
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label
										htmlFor="client-email"
										className="text-sm font-medium text-gray-700"
									>
										Email
									</label>
									<input
										id="client-email"
										className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
										value={newClient.email}
										onChange={(e) =>
											setNewClient((previous) => ({
												...previous,
												email: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<label
										htmlFor="client-phone"
										className="text-sm font-medium text-gray-700"
									>
										Phone
									</label>
									<input
										id="client-phone"
										className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
										value={newClient.phone}
										onChange={(e) =>
											setNewClient((previous) => ({
												...previous,
												phone: e.target.value,
											}))
										}
									/>
								</div>
							</div>
						</div>

						{formError && (
							<div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
								{formError}
							</div>
						)}

						<div className="flex justify-end gap-3 mt-6">
							<button
								onClick={() => setShowAddClient(false)}
								className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
							>
								Cancel
							</button>
							<button
								onClick={() => {
									setFormError(null);
									createClientMutation.mutate();
								}}
								disabled={createClientMutation.isPending || !newClient.name}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>
								{createClientMutation.isPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									"Save Client"
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
