import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useToastContext } from "../../../components/ui/ToastProvider";
import { useAuth } from "../../../hooks/useAuth";
import { db, supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/portal/scan/$token")({
	component: TokenResolver,
});

function TokenResolver() {
	const { token } = useParams({ from: "/portal/scan/$token" });
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
					.from("qr_codes")
					.select("*")
					.eq("token", token)
					.single();

				if (qrError || !qrData) {
					throw new Error("Invalid or expired QR code.");
				}

				if (!qrData.is_active) {
					throw new Error("This QR code has been deactivated.");
				}

				// 2. Identify who owns this entity to find their portal settings
				let clientId = null;
				let targetEntity:
					| { type: "package"; id: string }
					| { type: "item"; id: string }
					| null = null;

				if (qrData.entity_type === "package") {
					// New flow: package QR represents an order_pkg_instance id.
					const { data: pkgInstance, error: pkgInstanceError } = await supabase
						.from("order_pkg_instance")
						.select(`
							id,
							order_pkg_overview (order_id),
							order_package:order_packages (order_id)
						`)
						.eq("id", qrData.entity_id)
						.maybeSingle();

					if (pkgInstanceError && pkgInstanceError.code !== "PGRST116") {
						throw pkgInstanceError;
					}

					if (pkgInstance) {
						const orderId =
							(Array.isArray(pkgInstance.order_pkg_overview)
								? pkgInstance.order_pkg_overview[0]?.order_id
								: (pkgInstance.order_pkg_overview as any)?.order_id) ||
							(Array.isArray(pkgInstance.order_package)
								? pkgInstance.order_package[0]?.order_id
								: (pkgInstance.order_package as any)?.order_id) ||
							null;

						if (orderId) {
							const { data: order } = await supabase
								.from("orders")
								.select("client_id")
								.eq("id", orderId)
								.single();
							clientId = order?.client_id;
						}
					} else {
						// Legacy fallback: token may still target order_packages.id.
						const { data: pkg } = await supabase
							.from("order_packages")
							.select("order_id")
							.eq("id", qrData.entity_id)
							.maybeSingle();

						if (pkg?.order_id) {
							const { data: order } = await supabase
								.from("orders")
								.select("client_id")
								.eq("id", pkg.order_id)
								.single();
							clientId = order?.client_id;
						}
					}

					targetEntity = {
						type: "package",
						id: String(qrData.entity_id),
					};
				} else if (qrData.entity_type === "item") {
					// Legacy: token points to items_db
					const { data: mDb } = await supabase
						.from("items_db")
						.select("client_id")
						.eq("id", qrData.entity_id)
						.single();
					clientId = mDb?.client_id;
					targetEntity = {
						type: "item",
						id: String(qrData.entity_id),
					};
				} else if (qrData.entity_type === "pkd_item") {
					// New flow: token points to a specific pkd_item (physical packed instance)
					const { data: pkdItem } = await supabase
						.from("pkd_item")
						.select(`
							id,
							pkg_instance_id,
							order_pkg_instance:pkg_instance_id (
								order_packages:order_package_id (
									order_id
								)
							)
						`)
						.eq("id", qrData.entity_id)
						.maybeSingle();

					if (pkdItem) {
						const pkgInstance = Array.isArray(pkdItem.order_pkg_instance)
							? pkdItem.order_pkg_instance[0]
							: pkdItem.order_pkg_instance;
						const orderPackage = Array.isArray(pkgInstance?.order_packages)
							? pkgInstance.order_packages[0]
							: (pkgInstance?.order_packages as any);
						const orderId = orderPackage?.order_id;
						if (orderId) {
							const { data: order } = await supabase
								.from("orders")
								.select("client_id")
								.eq("id", orderId)
								.single();
							clientId = order?.client_id;
						}
					}

					targetEntity = {
						type: "item",
						id: String(qrData.entity_id),
					};
				} else {
					throw new Error("Unsupported QR entity type.");
				}

				if (!clientId) {
					throw new Error("Cannot identify the owner of this item.");
				}

				// 3. Look up Client Portal Settings
				const { data: clientData } = await supabase
					.from("clients")
					.select("portal_settings_id")
					.eq("id", clientId)
					.single();

				if (!clientData?.portal_settings_id) {
					throw new Error(
						"The portal for this client has not been configured.",
					);
				}

				const { data: portalSettings } = await db.getPortalSettings(
					clientData.portal_settings_id,
				);

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
							variant: "info",
						});
						navigate({
							to: "/portal/login",
							search: { returnUrl: `/portal/scan/${token}` },
						});
						return;
					}

					// User IS logged in. We must verify they belong to THIS exact client
					const { data: profile } = await db.getProfile(user.id);

					// Admins and Directors can view anything, but Clients must match IDs
					const isRestrictedRole =
						profile.roles?.name === "client" || profile.roles?.name === "sales";
					if (isRestrictedRole && profile.client_id !== clientId) {
						throw new Error(
							"You do not have permission to view items belonging to this client.",
						);
					}
				}

				if (!targetEntity) {
					throw new Error("Unable to resolve QR destination.");
				}

				// 5. All checks passed! Redirect to the actual resource page
				if (isMounted) {
					if (targetEntity.type === "package") {
						navigate({
							to: "/portal/package/$id",
							params: { id: targetEntity.id },
						});
					} else {
						navigate({
							to: "/portal/item/$id",
							params: { id: targetEntity.id },
						});
					}
				}
			} catch (e: any) {
				if (isMounted) {
					setError(
						e.message || "An unknown error occurred resolving this QR code.",
					);
					setResolving(false);
				}
			}
		}

		resolveToken();

		return () => {
			isMounted = false;
		};
	}, [token, user, authLoading, navigate, toast]);

	if (resolving || authLoading) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
				<div className="relative">
					<div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="w-6 h-6 bg-blue-600 rounded-sm"></div>
					</div>
				</div>
				<h2 className="mt-6 text-xl font-bold text-gray-900">
					Resolving QR Code...
				</h2>
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
					onClick={() => navigate({ to: "/portal/login" })}
					className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-colors"
				>
					Return Home
				</button>
			</div>
		</div>
	);
}
