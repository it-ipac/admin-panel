import {
	createFileRoute,
	useNavigate,
	useParams,
} from "@tanstack/react-router";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PortalBrand } from "../../../components/PortalBrand";
import { useToastContext } from "../../../components/ui/ToastProvider";
import { useAuth } from "../../../hooks/useAuth";
import { db, supabase } from "../../../lib/supabase";

export const Route = createFileRoute("/portal/scan/$token")({
	component: TokenResolver,
	head: () => ({
		meta: [{ title: "Opening Package | Client Portal" }],
	}),
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

		if (!user) {
			toast({
				title: "Authentication Required",
				description: "Please log in to view this package.",
				variant: "info",
			});
			navigate({
				to: "/portal/login",
				search: { returnUrl: `/portal/scan/${token}` },
			});
			return;
		}

		let isMounted = true;

		async function resolveToken() {
			try {
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

				let clientId = null;
				let targetPackageId: string | null = null;

				if (qrData.entity_type === "package") {
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
						targetPackageId = String(pkgInstance.id);
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
						const { data: pkg } = await supabase
							.from("order_packages")
							.select("order_id")
							.eq("id", qrData.entity_id)
							.maybeSingle();

						if (pkg?.order_id) {
							const { data: packageInstances, error: packageInstancesError } =
								await supabase
									.from("order_pkg_instance")
									.select("id")
									.eq("order_package_id", qrData.entity_id)
									.limit(2);

							if (packageInstancesError) throw packageInstancesError;
							if (packageInstances?.length !== 1) {
								throw new Error(
									"This QR code does not identify a single package.",
								);
							}
							targetPackageId = String(packageInstances[0].id);

							const { data: order } = await supabase
								.from("orders")
								.select("client_id")
								.eq("id", pkg.order_id)
								.single();
							clientId = order?.client_id;
						}
					}
				} else if (qrData.entity_type === "item") {
					const { data: mDb } = await supabase
						.from("items_db")
						.select("client_id")
						.eq("id", qrData.entity_id)
						.single();
					clientId = mDb?.client_id;

					const { data: packedItems, error: packedItemsError } = await supabase
						.from("pkd_item")
						.select("pkg_instance_id")
						.eq("maintenance_db_id", qrData.entity_id);

					if (packedItemsError) throw packedItemsError;
					const packageIds = [
						...new Set(
							(packedItems || [])
								.map((item: any) => item.pkg_instance_id)
								.filter(Boolean),
						),
					];
					if (packageIds.length !== 1) {
						throw new Error("This QR code does not identify a single package.");
					}
					targetPackageId = String(packageIds[0]);
				} else if (qrData.entity_type === "pkd_item") {
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
						targetPackageId = pkdItem.pkg_instance_id
							? String(pkdItem.pkg_instance_id)
							: null;
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
				} else {
					throw new Error("Unsupported QR entity type.");
				}

				if (!clientId || !targetPackageId) {
					throw new Error("Cannot identify the package for this QR code.");
				}

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

				if (portalSettings.requires_auth) {
					if (!user) {
						toast({
							title: "Authentication Required",
							description: "Please log in to view this package.",
							variant: "info",
						});
						navigate({
							to: "/portal/login",
							search: { returnUrl: `/portal/scan/${token}` },
						});
						return;
					}

					const { data: profile } = await db.getProfile(user.id);
					const STAFF_VIEW_ALL_ROLES = [
						"admin",
						"director",
						"executive",
						"project_lead",
						"packer",
					];
					const role = profile.roles?.name ?? null;
					const isStaff = role ? STAFF_VIEW_ALL_ROLES.includes(role) : false;
					if (!isStaff && profile.client_id !== clientId) {
						throw new Error(
							"You do not have permission to view packages belonging to this client.",
						);
					}
				}

				if (isMounted) {
					navigate({
						to: "/portal/package/$id",
						params: { id: targetPackageId },
					});
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
			<div className="portal-brand flex min-h-screen items-center justify-center bg-app-bg p-4 sm:p-6">
				<div className="w-full max-w-sm rounded-3xl border border-app-border bg-app-surface p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]">
					<PortalBrand
						variant="full"
						showTagline
						className="mx-auto justify-center"
						markClassName="h-12 w-12"
					/>
					<div className="mx-auto mt-6 flex h-10 w-10 items-center justify-center rounded-full border border-primary-100 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
						<ShieldCheck className="h-5 w-5" />
					</div>
					<h2 className="mt-4 text-lg font-semibold text-app-text-strong">
						Verifying your package
					</h2>
					<p className="mt-2 text-sm leading-6 text-app-text-muted">
						The client portal is securely opening the package record linked to
						this QR code.
					</p>
					<div className="mx-auto mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-app-surface-muted">
						<div className="h-full w-1/2 animate-pulse rounded-full bg-primary-600 dark:bg-primary-400" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="portal-brand flex min-h-screen items-center justify-center bg-app-bg p-4">
			<div className="w-full max-w-md rounded-3xl border border-app-border bg-app-surface p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.8)]">
				<PortalBrand
					variant="full"
					showTagline
					className="mx-auto mb-6 justify-center"
					markClassName="h-12 w-12"
				/>
				<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-danger-200 bg-danger-50 dark:border-danger-800/70 dark:bg-danger-950/40">
					<AlertCircle className="h-8 w-8 text-danger-600 dark:text-danger-300" />
				</div>
				<h2 className="mb-2 text-2xl font-semibold text-app-text-strong">
					Package link unavailable
				</h2>
				<p className="mb-8 text-app-text-muted">{error}</p>
				<button
					type="button"
					onClick={() => navigate({ to: "/portal/login" })}
					className="w-full rounded-xl border border-primary-500 bg-primary-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface dark:bg-primary-500 dark:hover:bg-primary-400"
				>
					<span className="text-white">Return Home</span>
				</button>
			</div>
		</div>
	);
}
