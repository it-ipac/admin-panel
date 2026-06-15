import { Link } from "@tanstack/react-router";
import { ArrowLeft, XCircle } from "lucide-react";
import { Sidebar } from "../../../Sidebar";

/** Skeleton layout shown while auth/order are loading (also used as Suspense fallback content). */
export function OrderDetailSkeleton() {
	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<OrderDetailSkeletonBody />
			</main>
		</div>
	);
}

/** Inner skeleton body without the Sidebar wrapper (for Suspense fallback). */
export function OrderDetailSkeletonBody() {
	return (
		<div className="p-6">
			<div className="flex items-center gap-4 mb-6">
				<Link to="/orders" className="p-2 hover:bg-neutral-100 rounded-lg">
					<ArrowLeft className="w-4 h-4" />
				</Link>
				<div className="h-8 w-48 bg-neutral-200 animate-pulse rounded"></div>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<div className="h-48 bg-neutral-200 animate-pulse rounded-lg"></div>
					<div className="h-64 bg-neutral-200 animate-pulse rounded-lg"></div>
				</div>
				<div className="h-64 bg-neutral-200 animate-pulse rounded-lg"></div>
			</div>
		</div>
	);
}

/** Error state when the order doesn't exist or failed to load. */
export function OrderNotFound({ error }: { error: unknown }) {
	return (
		<div className="flex h-screen bg-neutral-50">
			<Sidebar />
			<main className="flex-1 overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center gap-4 mb-6">
						<Link to="/orders" className="p-2 hover:bg-neutral-100 rounded-lg">
							<ArrowLeft className="w-5 h-5" />
						</Link>
						<h1 className="text-2xl font-bold text-neutral-900">
							Order Not Found
						</h1>
					</div>
					<div className="bg-danger-50 border border-danger-200 rounded-lg p-6 text-center">
						<XCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
						<p className="text-danger-700 mb-2">
							The order you're looking for doesn't exist or has been removed.
						</p>
						<p className="text-danger-600 text-sm mb-4">
							{error instanceof Error ? error.message : "Unknown error"}
						</p>
						<Link
							to="/orders"
							className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
						>
							Back to Orders
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
