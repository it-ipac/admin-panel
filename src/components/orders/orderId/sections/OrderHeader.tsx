import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { UseMutationResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Check,
	ChevronDown,
	Download,
	Edit,
	FileSpreadsheet,
	Loader2,
	Printer,
	X,
} from "lucide-react";
import type { Order } from "@/features/orders/types";
import { formatDateTime } from "../orderDetailPresentation";

interface OrderHeaderProps {
	order: Order;
	isEditingName: boolean;
	setIsEditingName: (editing: boolean) => void;
	editedName: string;
	setEditedName: (name: string) => void;
	updateOrderNameMutation: UseMutationResult<any, Error, string>;
	onExportExcel: () => void;
}

/** Page header: back link, editable order name, print/export actions. */
export function OrderHeader({
	order,
	isEditingName,
	setIsEditingName,
	editedName,
	setEditedName,
	updateOrderNameMutation,
	onExportExcel,
}: OrderHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
			<div className="flex items-center gap-4">
				<Link
					to="/orders"
					className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
				>
					<ArrowLeft className="w-5 h-5" />
				</Link>
				<div>
					{isEditingName ? (
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={editedName}
								onChange={(e) => setEditedName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										updateOrderNameMutation.mutate(editedName);
									} else if (e.key === "Escape") {
										setIsEditingName(false);
										setEditedName(order.order_name);
									}
								}}
								className="text-2xl font-bold text-neutral-900 border-b border-neutral-300 focus:outline-none focus:border-primary-500 bg-transparent px-1 py-0.5"
								// biome-ignore lint/a11y/noAutofocus: Focus input when editing name
								autoFocus
							/>
							<button
								onClick={() => updateOrderNameMutation.mutate(editedName)}
								disabled={updateOrderNameMutation.isPending}
								className="p-1.5 bg-primary-50 text-primary-600 rounded-md hover:bg-primary-100 transition-colors cursor-pointer"
								title="Save"
							>
								{updateOrderNameMutation.isPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Check className="w-4 h-4" />
								)}
							</button>
							<button
								onClick={() => {
									setIsEditingName(false);
									setEditedName(order.order_name);
								}}
								className="p-1.5 bg-neutral-50 text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
								title="Cancel"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					) : (
						<div className="flex items-center gap-2 group">
							<h1 className="text-2xl font-bold text-neutral-900">
								{order.order_name}
							</h1>
							<button
								onClick={() => setIsEditingName(true)}
								className="p-1 text-neutral-455 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
								title="Edit Name"
							>
								<Edit className="w-4 h-4" />
							</button>
						</div>
					)}
					<p className="text-neutral-500 text-sm mt-1">
						Created {formatDateTime(order.created_at)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<button className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50">
					<Printer className="w-4 h-4" />
					Print
				</button>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button className="flex items-center gap-2 px-3 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 transition-colors">
							<Download className="w-4 h-4" />
							Export
							<ChevronDown className="w-4 h-4" />
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							className="min-w-40 bg-white rounded-lg shadow-lg border p-1 z-50"
							sideOffset={5}
						>
							<DropdownMenu.Item
								onClick={onExportExcel}
								className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-success-50 hover:text-success-700 cursor-pointer outline-none"
							>
								<FileSpreadsheet className="w-4 h-4" />
								Export to Excel
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
				<button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
					<Edit className="w-4 h-4" />
					Edit Order
				</button>
			</div>
		</div>
	);
}
