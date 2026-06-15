import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/my-orders")({
	component: MyOrdersLayout,
});

function MyOrdersLayout() {
	// Renders the child route (list at index, read-only detail at $orderId).
	return <Outlet />;
}
