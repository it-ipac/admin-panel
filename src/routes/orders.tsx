import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/orders')({
  component: OrdersLayout,
})

function OrdersLayout() {
  // This layout just renders the child route (either the index or $orderId)
  return <Outlet />
}
