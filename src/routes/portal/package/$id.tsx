import { createFileRoute } from "@tanstack/react-router";
import { PackageDetailsView } from "../../../components/portal/PackageDetailsView";
import "../../../components/portal-header-layout.css";

export const Route = createFileRoute("/portal/package/$id")({
	component: PackageView,
	head: () => ({
		meta: [{ title: "Package Details | Client Portal" }],
	}),
});

function PackageView() {
	const { id } = Route.useParams();
	return <PackageDetailsView id={id} />;
}
