import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { db } from "../../../lib/supabase";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { useToastContext } from "../../../components/ui/ToastProvider";

export const Route = createFileRoute("/portal/scan/$token")({
	component: TokenResolver,
});

function TokenResolver() {
	const { token } = useParams({ from: '/portal/scan/$token' });
	const navigate = useNavigate();
	const { user, loading: authLoading } = useAuth();
    const { toast } = useToastContext();
	const [resolving, setResolving] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (authLoading) return;

		let isMounted = true;

		async function resolveToken() {
			try {
				// 1. Find the QR Code token in the database
				const { data: qrData, error: qrError } = await supabase
					.from('qr_codes')
					.select('*')
					.eq('token', token)
					.single();

				if (qrError || !qrData) {
					throw new Error("Invalid or expired QR code.");
				}

				if (!qrData.is_active) {
					throw new Error("This QR code has been deactivated.");
				}

				// 2. Identify who owns this entity to find their portal settings
				let clientId = null;
				let targetUrl = '';

				if (qrData.entity_type === 'package') {
					// We need to look up the order package, then its order, then client
					const { data: pkg } = await supabase
						.from('order_packages')
						.select('order_id')
						.eq('id', qrData.entity_id)
						.single();
						
					if (pkg) {
						const { data: order } = await supabase
							.from('orders')
							.select('client_id')
							.eq('id', pkg.order_id)
							.single();
						clientId = order?.client_id;
					}
					targetUrl = `/portal/package/${qrData.entity_id}`;
				} else if (qrData.entity_type === 'item') {
					// We need to look up the item in maintenance_db
					const { data: mDb } = await supabase
						.from('maintenance_db')
						.select('client_id')
						.eq('id', qrData.entity_id)
						.single();
					clientId = mDb?.client_id;
					targetUrl = `/portal/item/${qrData.entity_id}`;
				}

				if (!clientId) {
					throw new Error("Cannot identify the owner of this item.");
				}

				// 3. Look up Client Portal Settings
				const { data: clientData } = await supabase
					.from('clients')
					.select('portal_settings_id')
					.eq('id', clientId)
					.single();

				if (!clientData?.portal_settings_id) {
					throw new Error("The portal for this client has not been configured.");
				}

				const { data: portalSettings } = await db.getPortalSettings(clientData.portal_settings_id);

				if (!portalSettings?.is_active) {
					throw new Error("This client portal is currently disabled.");
				}

				// 4. Handle Authentication if required by Portal Settings
				if (portalSettings.requires_auth) {
					if (!user) {
						// User is not logged in, redirect them to login with a returnUrl to this exact scan endpoint
						toast({
							title: "Authentication Required",
							description: "Please log in to view this item.",
							variant: "default",
						});
						navigate({ to: '/portal/login', search: { returnUrl: `/portal/scan/${token}` } });
						return;
					}

					// User IS logged in. We must verify they belong to THIS exact client
					const { data: profile } = await db.getProfile(user.id);
					
					// Admins and Directors can view anything, but Clients must match IDs
					const isRestrictedRole = profile.roles?.name === 'client' || profile.roles?.name === 'sales';
					if (isRestrictedRole && profile.client_id !== clientId) {
						throw new Error("You do not have permission to view items belonging to this client.");
					}
				}

				// 5. All checks passed! Redirect to the actual resource page
				if (isMounted) navigate({ to: targetUrl });

			} catch (e: any) {
				if (isMounted) {
					setError(e.message || "An unknown error occurred resolving this QR code.");
					setResolving(false);
				}
			}
		}

		resolveToken();

		return () => { isMounted = false; };
	}, [token, user, authLoading, navigate]);

	if (resolving || authLoading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
				<div className="relative">
					<div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="w-6 h-6 bg-blue-600 rounded-sm"></div>
					</div>
				</div>
				<h2 className="mt-6 text-xl font-bold text-gray-900">Resolving QR Code...</h2>
				<p className="text-gray-500 mt-2">Checking security clearance</p>
			</div>
		);
	}

	// Only reached if there was an error
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<AlertCircle className="w-8 h-8 text-red-600" />
				</div>
				<h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
				<p className="text-gray-600 mb-8">{error}</p>
				<button 
					onClick={() => navigate({ to: '/portal/login' })}
					className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-colors"
				>
					Return Home
				</button>
			</div>
		</div>
	);
}
