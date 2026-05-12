import { useQuery } from "@tanstack/react-query";
import {
	fetchClientDetails,
	fetchClients,
	fetchCompanyProfile,
	fetchDestinations,
	fetchOrders,
	fetchProjectTags,
	fetchReportInstances,
	fetchTemplates,
} from "../api";
import type { FilterParams } from "../types";

export const useClientsQuery = () => {
	return useQuery({
		queryKey: ["report_clients"],
		queryFn: fetchClients,
	});
};

export const useClientDetailsQuery = (clientId: string | null) => {
	return useQuery({
		queryKey: ["client_details", clientId],
		queryFn: () => fetchClientDetails(clientId!),
		enabled: !!clientId,
	});
};

export const useOrdersQuery = (clientId: string | null) => {
	return useQuery({
		queryKey: ["report_orders", clientId],
		queryFn: () => fetchOrders(clientId),
	});
};

export const useProjectTagsQuery = (clientId: string | null) => {
	return useQuery({
		queryKey: ["report_project_tags", clientId],
		queryFn: () => fetchProjectTags(clientId),
		enabled: !!clientId,
	});
};

export const useDestinationsQuery = (
	clientId: string | null,
	orderId: string | null,
) => {
	return useQuery({
		queryKey: ["report_destinations", clientId, orderId],
		queryFn: () => fetchDestinations(clientId, orderId),
		enabled: !!clientId || !!orderId,
	});
};

export const useReportInstancesQuery = (filters: FilterParams) => {
	return useQuery({
		queryKey: ["report_instances", filters],
		queryFn: () => fetchReportInstances(filters),
		enabled: !!filters.clientId || !!filters.orderId,
	});
};

export const useTemplatesQuery = () => {
	return useQuery({
		queryKey: ["report_templates"],
		queryFn: fetchTemplates,
	});
};

export const useCompanyProfileQuery = () => {
	return useQuery({
		queryKey: ["company_profile"],
		queryFn: fetchCompanyProfile,
	});
};
