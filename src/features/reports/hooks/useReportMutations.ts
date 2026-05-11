import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveReport, saveTemplate } from "../api";

export const useSaveTemplateMutation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: saveTemplate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["report_templates"] });
		},
	});
};

export const useSaveReportMutation = () => {
	return useMutation({
		mutationFn: async ({
			reportData,
			instanceIds,
			orderIds,
		}: {
			reportData: any;
			instanceIds: string[];
			orderIds: string[];
		}) => {
			return saveReport(reportData, instanceIds, orderIds);
		},
	});
};
