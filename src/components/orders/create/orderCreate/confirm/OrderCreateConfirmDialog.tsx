import { useEffect, useState } from "react";
import { ConfirmDialogContent } from "./ConfirmDialogContent";
import { TemplateWarningDialog } from "./TemplateWarningDialog";
import type { OrderCreateConfirmDialogProps } from "./types";

export function OrderCreateConfirmDialog(props: OrderCreateConfirmDialogProps) {
	const [showDetails, setShowDetails] = useState(false);
	const [activePackage, setActivePackage] = useState(0);
	const [showTemplateWarning, setShowTemplateWarning] = useState(false);

	useEffect(() => {
		if (activePackage >= props.packagePreviews.length) {
			setActivePackage(0);
		}
	}, [activePackage, props.packagePreviews.length]);

	useEffect(() => {
		if (!props.open) return;
		const issuePackageNumbers = Object.keys(props.packageIssueMessages || {})
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value))
			.sort((a, b) => a - b);

		if (issuePackageNumbers.length === 0) return;
		const firstIssuePackage = issuePackageNumbers[0];
		const issuePackageIndex = props.packagePreviews.findIndex(
			(pkg) => pkg.packageNumber === firstIssuePackage,
		);
		if (issuePackageIndex >= 0) {
			setActivePackage(issuePackageIndex);
		}
	}, [props.open, props.packageIssueMessages, props.packagePreviews]);

	const handleConfirmClick = () => {
		if (props.templateWarningCount && props.templateWarningCount > 0) {
			setShowTemplateWarning(true);
			return;
		}
		props.onConfirm();
	};

	return (
		<>
			<ConfirmDialogContent
				{...props}
				showDetails={showDetails}
				setShowDetails={setShowDetails}
				activePackage={activePackage}
				setActivePackage={setActivePackage}
				onConfirmClick={handleConfirmClick}
			/>
			<TemplateWarningDialog
				open={showTemplateWarning}
				onOpenChange={setShowTemplateWarning}
				templateWarningCount={props.templateWarningCount}
				onConfirm={props.onConfirm}
			/>
		</>
	);
}
