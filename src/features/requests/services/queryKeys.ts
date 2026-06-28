// Centralized, typed query keys for the requests feature.

export const requestQueryKeys = {
	all: ["requests"] as const,

	materialRequests: () =>
		[...requestQueryKeys.all, "material-requests"] as const,
	variantRequests: () => [...requestQueryKeys.all, "variant-requests"] as const,
	pricingRequests: () => [...requestQueryKeys.all, "pricing-requests"] as const,
	allocationIncreaseRequests: () =>
		[...requestQueryKeys.all, "allocation-increase-requests"] as const,
	allocationIncreaseRequestsForOrder: (orderId: string) =>
		[...requestQueryKeys.all, "allocation-increase-requests", orderId] as const,
	auditLog: () => [...requestQueryKeys.all, "audit-log"] as const,

	materialRejectionImpact: (requestId: string) =>
		[...requestQueryKeys.all, "material-rejection-impact", requestId] as const,
} as const;
