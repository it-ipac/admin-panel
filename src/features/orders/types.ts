/**
 * Shared types for the order detail feature.
 *
 * Single source of truth for the shapes returned by the order-detail
 * queries (see features/orders/api) and consumed by the tab presenters
 * under components/orders/orderId.
 */

export interface PackageInfo {
	id: string;
	internal_length: number | null;
	internal_width: number | null;
	internal_height: number | null;
	external_length: number | null;
	external_width: number | null;
	external_height: number | null;
	net_weight: number | null;
	gross_weight: number | null;
	tare: number | null;
	quantity: number | null;
	packing_type_id: string | null;
	sei_category: number | null;
	sei_protection: number | null;
	box_type_id: string | null;
	center_of_gravity: boolean | null;
}

export interface OrderPackage {
	id: string;
	package_number: number;
	description: string | null;
	status: string | null;
	comments: PackageComment[] | null;
	original_pkg_info: PackageInfo | null;
	final_pkg_info: PackageInfo | null;
}

export interface PackageInstance {
	id: string;
	order_pkg_overview_id: string | null;
	order_package_id: string;
	instance_number: number | null;
	ipac_reference: string | null;
	status: string | null;
	destination: string | null;
	tag: string | null;
	category_id: string | null;
}

export interface Client {
	id: string;
	name: string;
	contact_person: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
}

export interface AttendanceLog {
	id: string;
	log_date: string;
	shift_period: string;
	status: string;
	start_time: string | null;
	end_time: string | null;
	toolbox_briefing_completed: boolean;
	is_project_start: boolean;
	packer: { id: string; full_name: string } | null;
}

export interface TeamMember {
	id: string;
	is_team_lead: boolean;
	packer: { id: string; full_name: string } | null;
}

export interface TaskLog {
	id: string;
	start_time: string;
	end_time: string | null;
	duration_minutes: number | null;
	notes: string | null;
	task: { id: string; name: string } | null;
	task_packages: { order_package_id: string }[];
	task_assignments: { packer: { id: string; full_name: string } | null }[];
}

export interface Media {
	id: string;
	image_url: string | null;
	signed_url: string | null;
	notes: string | null;
	created_at: string;
	order_package_id: string;
	designation: string | null;
}

export interface AttendanceChange {
	id: string;
	packerName: string;
	shift: string;
	currentStart: string | null;
	currentEnd: string | null;
	currentHours: string;
	newEnd: string;
	newHours: string;
	approved: boolean;
}

export interface PackageItem {
	id: string;
	order_package_id?: string;
	quantity: number;
	designation: string;
	length: number | null;
	width: number | null;
	height: number | null;
	source?: "custom" | "inventory";
	instance_number?: number;
	warehouse_location?: string;
	item_num?: string;
	items_db_id?: string | null;
	reference?: string | null;
}

export interface PackageMaterial {
	id: string;
	order_package_id: string;
	material_variant_id: string;
	material_type: string;
	is_final: boolean;
	quantity: number;
	unit_id: string | null;
	length: number | null;
	width: number | null;
	height: number | null;
	comment: string | null;
	item_used: boolean;
	quantity_used: number | null;
	variant_name: string | null;
	material_name: string | null;
	unit_name: string | null;
	from_template?: boolean;
}

export interface PackageService {
	id: string;
	order_package_id: string;
	service_id: string;
	is_final: boolean;
	result: Record<string, any> | null;
	service_name: string | null;
}

export interface PackageComment {
	id: string;
	text: string;
	author: string;
	created_at: string;
}

export interface Order {
	id: string;
	order_name: string;
	description: string | null;
	production_status: string;
	commercial_status: string;
	created_at: string;
	updated_at: string | null;
	start_date: string | null;
	completion_date: string | null;
	clients: Client | null;
	project_lead: { full_name: string } | null;
	order_packages: OrderPackage[];
}
