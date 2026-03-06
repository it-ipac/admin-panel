export const inventoryCommunicationsQueryKeys = {
	all: ["inventory-communications"] as const,
	history: () => [...inventoryCommunicationsQueryKeys.all, "history"] as const,
};
