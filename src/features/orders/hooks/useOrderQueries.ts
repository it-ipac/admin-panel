import { useQuery } from "@tanstack/react-query";
import {
	fetchAttendanceLogs,
	fetchOrderMedia,
	fetchTaskLogs,
	fetchTeamMembers,
} from "../api/activityApi";
import {
	fetchClientCategories,
	fetchClientInventory,
	fetchClientTagTaxonomy,
	fetchOrderCategories,
	fetchPackageInstances,
	fetchPackageItems,
	fetchPkdItems,
} from "../api/itemsApi";
import { fetchPackageManufacturing } from "../api/manufacturingApi";
import {
	fetchAvailableMaterials,
	fetchAvailableUnits,
	fetchPackageMaterials,
	fetchPackageServices,
} from "../api/materialsApi";
import { fetchOrder } from "../api/orderApi";

/**
 * All read queries for the order detail container.
 *
 * Owns the main ["order", orderId] query plus every dependent dataset;
 * dependent queries are only enabled once the order has loaded (and, for
 * client-scoped data, once the client id is known) — matching the
 * original inline behaviour of the route container.
 */
export function useOrderQueries(orderId: string, isAuthenticated: boolean) {
	const {
		data: order,
		isLoading: orderLoading,
		error: orderError,
	} = useQuery({
		queryKey: ["order", orderId],
		queryFn: () => fetchOrder(orderId),
		enabled: isAuthenticated,
		staleTime: 30_000,
	});

	const hasOrder = isAuthenticated && !!order;
	const clientId = order?.clients?.id;

	const { data: attendanceLogs } = useQuery({
		queryKey: ["attendance", orderId],
		queryFn: () => fetchAttendanceLogs(orderId),
		enabled: isAuthenticated,
	});

	const { data: teamMembers } = useQuery({
		queryKey: ["teamMembers", orderId],
		queryFn: () => fetchTeamMembers(orderId),
		enabled: isAuthenticated,
	});

	const { data: taskLogs } = useQuery({
		queryKey: ["taskLogs", orderId],
		queryFn: () => fetchTaskLogs(orderId),
		enabled: hasOrder,
	});

	const { data: mediaItems } = useQuery({
		queryKey: ["media", orderId],
		queryFn: () => fetchOrderMedia(orderId),
		enabled: hasOrder,
	});

	const { data: packageItems } = useQuery({
		queryKey: ["packageItems", orderId],
		queryFn: () => fetchPackageItems(orderId),
		enabled: hasOrder,
		staleTime: 30_000,
	});

	const { data: clientInventory } = useQuery({
		queryKey: ["clientInventory", clientId],
		queryFn: () => fetchClientInventory(clientId),
		enabled: isAuthenticated && !!clientId,
	});

	const { data: clientCategories } = useQuery({
		queryKey: ["clientCategories", clientId],
		queryFn: () => fetchClientCategories(clientId),
		enabled: isAuthenticated && !!clientId,
	});

	const { data: orderCategories } = useQuery({
		queryKey: ["orderCategories", orderId],
		queryFn: () => fetchOrderCategories(orderId),
		enabled: hasOrder,
	});

	const { data: tagTaxonomy } = useQuery({
		queryKey: ["tagTaxonomy", clientId],
		queryFn: () => fetchClientTagTaxonomy(clientId),
		enabled: isAuthenticated && !!clientId,
		staleTime: 5 * 60_000,
	});

	const { data: pkdItems } = useQuery({
		queryKey: ["pkdItems", orderId],
		queryFn: () => fetchPkdItems(orderId),
		enabled: hasOrder,
		staleTime: 30_000,
	});

	const { data: packageMaterials } = useQuery({
		queryKey: ["packageMaterials", orderId],
		queryFn: () => fetchPackageMaterials(orderId),
		enabled: hasOrder,
	});

	const { data: packageManufacturing } = useQuery({
		queryKey: ["packageManufacturing", orderId],
		queryFn: () => fetchPackageManufacturing(orderId),
		enabled: hasOrder,
	});

	const { data: packageServices } = useQuery({
		queryKey: ["packageServices", orderId],
		queryFn: () => fetchPackageServices(orderId),
		enabled: hasOrder,
	});

	const { data: packageInstances } = useQuery({
		queryKey: ["packageInstances", orderId],
		queryFn: () => fetchPackageInstances(orderId),
		enabled: hasOrder,
		staleTime: 30_000,
	});

	const { data: availableMaterials } = useQuery({
		queryKey: ["materials"],
		queryFn: fetchAvailableMaterials,
		enabled: isAuthenticated,
	});

	const { data: availableUnits } = useQuery({
		queryKey: ["units"],
		queryFn: fetchAvailableUnits,
		enabled: isAuthenticated,
	});

	return {
		order,
		orderLoading,
		orderError,
		attendanceLogs,
		teamMembers,
		taskLogs,
		mediaItems,
		packageItems,
		clientInventory,
		clientCategories,
		orderCategories,
		tagTaxonomy,
		pkdItems,
		packageMaterials,
		packageManufacturing,
		packageServices,
		packageInstances,
		availableMaterials,
		availableUnits,
	};
}
