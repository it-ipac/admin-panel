import { createRouter } from "@tanstack/react-router";
import "./portal-photo-icon-strokes.css";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
	});

	return router;
};
