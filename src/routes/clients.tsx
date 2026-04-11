import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Building2,
	Globe,
	Image as ImageIcon,
	Loader2,
	Plus,
	Search,
	Settings as SettingsIcon,
	Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { db, supabase } from "../lib/supabase";

export const Route = createFileRoute("/clients")({
	component: ClientsPage,
});

function ClientsPage() {
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebouncedValue(search, 200);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const [showAddClient, setShowAddClient] = useState(false);
	const [showPortalConfig, setShowPortalConfig] = useState<any | null>(null);
	const [formError, setFormError] = useState<string | null>(null);

	const [newClient, setNewClient] = useState({
		name: "",
		contact_person: "",
		email: "",
		phone: "",
	});

	const [portalConfig, setPortalConfig] = useState({
		slug: "",
		is_active: false,
		portal_requires_auth: true,
		show_qr_logo: true,
		qr_logo_url: "",
	});

	const defaultLogoInputRef = useRef<HTMLInputElement>(null);
	const clientLogoInputRef = useRef<HTMLInputElement>(null);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [defaultLogoUrl, setDefaultLogoUrl] = useState<string | null>(null);
	const [logoLoadFailed, setLogoLoadFailed] = useState(false);

	// Predictable filename — set URL optimistically, fall back on error
	useEffect(() => {
		const { data } = supabase.storage.from('media').getPublicUrl('assets/default_qr_logo.png');
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
			// We might need portal_settings, so we should fetch it when expanding or we can just fetch it when opening the modal.
			return data || [];
		},
		enabled: !!user,
		staleTime: 30000,
	});

	// Mutations
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
		onError: (error: any) => setFormError(error?.message || "Failed to add client"),
	});

	const handleUploadDefaultLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploadingLogo(true);
			
			// Always force it to be default_qr_logo.png to avoid needing list() permissions
			const fileName = `default_qr_logo.png`;
			const { error } = await db.uploadLogo(file, `assets/${fileName}`);
			if (error) throw error;
			
			const { data } = supabase.storage.from('media').getPublicUrl(`assets/${fileName}`);
			setLogoLoadFailed(false);
			setDefaultLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
			alert("Default IPAC logo updated!");
		} catch (error: any) {
			console.error(error);
			alert("Failed to upload default logo: " + error.message);
		} finally {
			setUploadingLogo(false);
			if (defaultLogoInputRef.current) defaultLogoInputRef.current.value = "";
		}
	};

	const fetchPortalSettings = async (client: any) => {
		try {
			setFormError(null);
			setShowPortalConfig(client);
			setPortalConfig({ slug: "", is_active: false, portal_requires_auth: true, show_qr_logo: true, qr_logo_url: "" });
			
			// If client has no settings created, we just show empty
			// Actually clients table must fetch portal_settings_id but our getClients doesn't select it currently.
			// Let's do a quick lookup
			const { data: ct, error: err } = await supabase.from('clients').select('portal_settings_id').eq('id', client.id).single();
			if (ct?.portal_settings_id) {
				const { data: settings } = await db.getPortalSettings(ct.portal_settings_id);
				if (settings) {
					setPortalConfig({
						slug: settings.portal_slug || "",
						is_active: settings.is_active ?? false,
						portal_requires_auth: settings.requires_auth ?? true,
						show_qr_logo: settings.show_qr_logo ?? true,
						qr_logo_url: settings.qr_logo_url || "",
					});
				}
			}
		} catch (e) {
			console.error("fetchPortalSettings err", e);
		}
	};

	const savePortalConfigMutation = useMutation({
		mutationFn: async () => {
			if (!showPortalConfig) return;
			
			const { data: ct } = await supabase.from('clients').select('portal_settings_id').eq('id', showPortalConfig.id).single();
			
			const payload = {
				id: ct?.portal_settings_id || undefined,
				slug: portalConfig.slug.trim(),
				is_active: portalConfig.is_active,
				portal_requires_auth: portalConfig.portal_requires_auth,
				show_qr_logo: portalConfig.show_qr_logo,
				qr_logo_url: portalConfig.qr_logo_url || null,
			};
			
			const { data: updatedSettings, error: settingErr } = await db.upsertPortalSettings(payload);
			if (settingErr) throw settingErr;

			if (!ct?.portal_settings_id) {
				// Link it to the client
				const { error: clientErr } = await db.updateClient(showPortalConfig.id, {
					portal_settings_id: updatedSettings.id
				});
				if (clientErr) throw clientErr;
			}
			return updatedSettings;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setShowPortalConfig(null);
			setFormError(null);
		},
		onError: (error: any) => setFormError(error?.message || "Failed to save portal config"),
	});

	const handleUploadClientLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !showPortalConfig) return;
		try {
			setUploadingLogo(true);
			const ext = file.name.split('.').pop() || 'png';
			const path = `client_logos/${showPortalConfig.id}_${Date.now()}.${ext}`;
			const { data, error } = await db.uploadLogo(file, path);
			if (error) throw error;
			
			// Construct public URL
			const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
			setPortalConfig((prev) => ({ ...prev, qr_logo_url: urlData.publicUrl }));
			
		} catch (error: any) {
			console.error(error);
			setFormError("Failed to upload client logo: " + error.message);
		} finally {
			setUploadingLogo(false);
			if (clientLogoInputRef.current) clientLogoInputRef.current.value = "";
		}
	};

	const filteredClients = clients?.filter((c: any) => 
		c.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
	) || [];

	// Return null on server/before hydration to avoid mismatch,
	// then show a spinner while auth resolves on the client.
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
								Manage clients and their portal configurations
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
										onError={() => {
											// File URL resolves but the file doesn't exist yet — show upload button
											setLogoLoadFailed(true);
										}}
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
									{uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
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

					{/* Search */}
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

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{isLoading ? (
							<div className="col-span-full flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-blue-600" />
							</div>
						) : filteredClients.length === 0 ? (
							<div className="col-span-full flex flex-col items-center justify-center py-12">
								<Building2 className="w-12 h-12 text-gray-300 mb-4" />
								<p className="text-gray-500">No clients found</p>
							</div>
						) : (
							filteredClients.map((c: any) => (
								<div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 card-hover">
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
												<Building2 className="text-blue-600 w-6 h-6" />
											</div>
											<div>
												<h3 className="font-semibold text-gray-900">{c.name}</h3>
												{c.contact_person && (
													<p className="text-sm text-gray-500">{c.contact_person}</p>
												)}
											</div>
										</div>
									</div>
									<div className="text-sm text-gray-600 space-y-1 mb-4">
										{c.email && <p>✉️ {c.email}</p>}
										{c.phone && <p>📞 {c.phone}</p>}
									</div>
									
									<div className="pt-4 border-t border-gray-100">
										<button
											onClick={() => fetchPortalSettings(c)}
											className="w-full flex justify-center items-center gap-2 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 text-gray-700 hover:text-blue-700 rounded-lg transition-colors font-medium text-sm"
										>
											<Globe className="w-4 h-4" />
											Configure Portal
										</button>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</main>

			{/* Add Client Modal */}
			{showAddClient && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
						<div className="flex justify-between mb-4">
							<h2 className="text-xl font-bold text-gray-900">Add Client</h2>
							<button onClick={() => setShowAddClient(false)} className="text-gray-400 hover:text-gray-600">✕</button>
						</div>
						
						<div className="grid gap-4">
							<div>
								<label className="text-sm font-medium text-gray-700">Company Name *</label>
								<input
									className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
									value={newClient.name} onChange={e => setNewClient(p => ({...p, name: e.target.value}))}
								/>
							</div>
							<div>
								<label className="text-sm font-medium text-gray-700">Contact Person</label>
								<input
									className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
									value={newClient.contact_person} onChange={e => setNewClient(p => ({...p, contact_person: e.target.value}))}
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="text-sm font-medium text-gray-700">Email</label>
									<input
										className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
										value={newClient.email} onChange={e => setNewClient(p => ({...p, email: e.target.value}))}
									/>
								</div>
								<div>
									<label className="text-sm font-medium text-gray-700">Phone</label>
									<input
										className="mt-1 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
										value={newClient.phone} onChange={e => setNewClient(p => ({...p, phone: e.target.value}))}
									/>
								</div>
							</div>
						</div>

						{formError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{formError}</div>}

						<div className="flex justify-end gap-3 mt-6">
							<button onClick={() => setShowAddClient(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
							<button
								onClick={() => { setFormError(null); createClientMutation.mutate(); }}
								disabled={createClientMutation.isPending || !newClient.name}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>
								{createClientMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Client"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Portal Config Modal */}
			{showPortalConfig && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6">
						<div className="flex justify-between mb-2">
							<div>
								<h2 className="text-xl font-bold text-gray-900">Portal Settings</h2>
								<p className="text-sm text-gray-500">For {showPortalConfig.name}</p>
							</div>
							<button onClick={() => setShowPortalConfig(null)} className="text-gray-400 hover:text-gray-600">✕</button>
						</div>
						
						<div className="mt-6 space-y-5">
							{/* Toggle switch for is_active */}
							<label className="flex items-center cursor-pointer justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
								<div>
									<div className="font-semibold text-blue-900">Enable Client Portal</div>
									<div className="text-sm text-blue-700 w-64">Turn this on to enable the QR tracking portal for this client's packages.</div>
								</div>
								<div className="relative">
									<input type="checkbox" className="sr-only" checked={portalConfig.is_active} onChange={e => setPortalConfig(p => ({...p, is_active: e.target.checked}))} />
									<div className={`block w-14 h-8 rounded-full transition-colors ${portalConfig.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
									<div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${portalConfig.is_active ? 'translate-x-6' : ''}`}></div>
								</div>
							</label>

							<div className={`space-y-4 ${!portalConfig.is_active ? 'opacity-50 pointer-events-none' : ''}`}>
								<div>
									<label className="text-sm font-semibold text-gray-700">URL Slug *</label>
									<p className="text-xs text-gray-500 mb-1">
										e.g., 'adnoc' maps to {typeof window !== 'undefined' ? window.location.host : 'ipac-admin.vercel.app'}/portal/adnoc/...
									</p>
									<input
										className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
										value={portalConfig.slug} onChange={e => setPortalConfig(p => ({...p, slug: e.target.value}))}
									/>
								</div>

								<label className="flex items-center gap-3">
									<input 
										type="checkbox" 
										className="w-5 h-5 text-blue-600 rounded" 
										checked={portalConfig.portal_requires_auth} 
										onChange={e => setPortalConfig(p => ({...p, portal_requires_auth: e.target.checked}))}
									/>
									<div>
										<div className="font-medium text-gray-800">Require Authentication</div>
										<div className="text-xs text-gray-500">Require client to log in before viewing portal data.</div>
									</div>
								</label>

								<label className="flex items-center gap-3">
									<input 
										type="checkbox" 
										className="w-5 h-5 text-blue-600 rounded" 
										checked={portalConfig.show_qr_logo} 
										onChange={e => setPortalConfig(p => ({...p, show_qr_logo: e.target.checked}))}
									/>
									<div>
										<div className="font-medium text-gray-800">Show Logo on QR Codes</div>
										<div className="text-xs text-gray-500">Renders the default IPAC or Custom QR Logo inside generated QR codes.</div>
									</div>
								</label>

								<div className={`pt-2 transition-opacity ${!portalConfig.show_qr_logo ? 'opacity-40 pointer-events-none' : ''}`}>
									<label className="text-sm font-semibold text-gray-700 inline-block mb-1">QR Code Logo</label>
									<div className="text-xs text-gray-500 mb-3">Upload a custom logo to override the default IPAC logo in the center of the QR code.</div>
									
									<div className="flex items-center gap-4">
										<div className="relative border border-gray-200 rounded-lg p-2 bg-gray-50">
											{portalConfig.qr_logo_url ? (
												<>
													<span className="absolute -top-2.5 -left-2.5 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-sm z-10">
														CUSTOM
													</span>
													<img src={portalConfig.qr_logo_url} className="w-16 h-16 object-contain" alt="QR Custom" />
												</>
											) : (defaultLogoUrl && !logoLoadFailed) ? (
												<>
													<span className="absolute -top-2.5 -left-2.5 bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-300 shadow-sm z-10">
														DEFAULT
													</span>
													<img src={defaultLogoUrl} className="w-16 h-16 object-contain opacity-75" alt="Default IPAC Logo" />
												</>
											) : (
												<div className="w-16 h-16 flex items-center justify-center">
													<ImageIcon className="w-6 h-6 text-gray-400" />
												</div>
											)}
										</div>
										<input type="file" ref={clientLogoInputRef} className="hidden" accept="image/*" onChange={handleUploadClientLogo} />
										<div className="flex flex-col gap-2">
											<div className="flex items-center gap-2">
												<button 
													onClick={() => clientLogoInputRef.current?.click()}
													disabled={uploadingLogo}
													className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm"
												>
													{uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
													{portalConfig.qr_logo_url ? "Replace Image" : "Upload Custom Image"}
												</button>
												{portalConfig.qr_logo_url && (
													<button 
														onClick={() => setPortalConfig(p => ({...p, qr_logo_url: ""}))}
														disabled={uploadingLogo}
														className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors shadow-sm"
													>
														Remove Custom Logo
													</button>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{formError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{formError}</div>}

						<div className="flex justify-end gap-3 mt-6">
							<button onClick={() => setShowPortalConfig(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
							<button
								onClick={() => { setFormError(null); savePortalConfigMutation.mutate(); }}
								disabled={savePortalConfigMutation.isPending || (portalConfig.is_active && !portalConfig.slug)}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
							>
								{savePortalConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Settings"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
