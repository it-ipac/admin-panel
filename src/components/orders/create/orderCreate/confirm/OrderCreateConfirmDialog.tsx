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
