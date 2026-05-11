export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "12.2.12 (cd3cf9e)";
	};
	public: {
		Tables: {
			app_settings: {
				Row: {
					category: string | null;
					created_at: string | null;
					description: string | null;
					id: string;
					key: string;
					updated_at: string | null;
					value: Json;
				};
				Insert: {
					category?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					key: string;
					updated_at?: string | null;
					value: Json;
				};
				Update: {
					category?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					key?: string;
					updated_at?: string | null;
					value?: Json;
				};
				Relationships: [];
			};
			attendance_logs: {
				Row: {
					created_at: string | null;
					end_time: string | null;
					id: string;
					is_project_start: boolean | null;
					log_date: string;
					order_id: string;
					packer_id: string;
					shift_period: string;
					start_time: string | null;
					status: string;
					toolbox_briefing_completed: boolean | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					end_time?: string | null;
					id?: string;
					is_project_start?: boolean | null;
					log_date?: string;
					order_id: string;
					packer_id: string;
					shift_period: string;
					start_time?: string | null;
					status?: string;
					toolbox_briefing_completed?: boolean | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					end_time?: string | null;
					id?: string;
					is_project_start?: boolean | null;
					log_date?: string;
					order_id?: string;
					packer_id?: string;
					shift_period?: string;
					start_time?: string | null;
					status?: string;
					toolbox_briefing_completed?: boolean | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "attendance_logs_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "attendance_logs_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "attendance_logs_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "attendance_logs_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			audit_log: {
				Row: {
					action_type: string;
					change_time: string | null;
					changed_by: string | null;
					column_name: string | null;
					entity_id: string;
					entity_type: string;
					id: string;
					is_critical_alert: boolean | null;
					new_value: Json | null;
					notes: string | null;
					old_value: Json | null;
					order_id: string | null;
					order_package_id: string | null;
				};
				Insert: {
					action_type: string;
					change_time?: string | null;
					changed_by?: string | null;
					column_name?: string | null;
					entity_id: string;
					entity_type: string;
					id?: string;
					is_critical_alert?: boolean | null;
					new_value?: Json | null;
					notes?: string | null;
					old_value?: Json | null;
					order_id?: string | null;
					order_package_id?: string | null;
				};
				Update: {
					action_type?: string;
					change_time?: string | null;
					changed_by?: string | null;
					column_name?: string | null;
					entity_id?: string;
					entity_type?: string;
					id?: string;
					is_critical_alert?: boolean | null;
					new_value?: Json | null;
					notes?: string | null;
					old_value?: Json | null;
					order_id?: string | null;
					order_package_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "audit_log_changed_by_fkey";
						columns: ["changed_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "audit_log_changed_by_fkey";
						columns: ["changed_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "audit_log_changed_by_fkey";
						columns: ["changed_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "audit_log_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "audit_log_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
				];
			};
			beam: {
				Row: {
					id: string;
					quantity: number | null;
					space: number | null;
					thickness: number | null;
					type: string | null;
					width: number | null;
				};
				Insert: {
					id?: string;
					quantity?: number | null;
					space?: number | null;
					thickness?: number | null;
					type?: string | null;
					width?: number | null;
				};
				Update: {
					id?: string;
					quantity?: number | null;
					space?: number | null;
					thickness?: number | null;
					type?: string | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "beam_type_fkey";
						columns: ["type"];
						isOneToOne: false;
						referencedRelation: "material_variants";
						referencedColumns: ["id"];
					},
				];
			};
			box_type: {
				Row: {
					code: string | null;
					created_at: string;
					id: string;
					name: string;
				};
				Insert: {
					code?: string | null;
					created_at?: string;
					id?: string;
					name: string;
				};
				Update: {
					code?: string | null;
					created_at?: string;
					id?: string;
					name?: string;
				};
				Relationships: [];
			};
			category_order_map: {
				Row: {
					category_id: string | null;
					order_id: string | null;
				};
				Insert: {
					category_id?: string | null;
					order_id?: string | null;
				};
				Update: {
					category_id?: string | null;
					order_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "category_order_map_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "pkg_category";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "category_order_map_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
				];
			};
			category_tag_map: {
				Row: {
					category_id: string;
					tag_id: string;
				};
				Insert: {
					category_id: string;
					tag_id: string;
				};
				Update: {
					category_id?: string;
					tag_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "category_tag_map_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "pkg_category";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "category_tag_map_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "project_tags";
						referencedColumns: ["id"];
					},
				];
			};
			client_order: {
				Row: {
					client_report_id: string;
					customer_order_ref: string | null;
					customer_trn: string | null;
					delivery_date: string | null;
					delivery_note_ref: string | null;
					id: string;
					ipac_valsem_trn: string | null;
					order_id: string | null;
					quotation_ref: string | null;
					sequence_order: number | null;
				};
				Insert: {
					client_report_id: string;
					customer_order_ref?: string | null;
					customer_trn?: string | null;
					delivery_date?: string | null;
					delivery_note_ref?: string | null;
					id?: string;
					ipac_valsem_trn?: string | null;
					order_id?: string | null;
					quotation_ref?: string | null;
					sequence_order?: number | null;
				};
				Update: {
					client_report_id?: string;
					customer_order_ref?: string | null;
					customer_trn?: string | null;
					delivery_date?: string | null;
					delivery_note_ref?: string | null;
					id?: string;
					ipac_valsem_trn?: string | null;
					order_id?: string | null;
					quotation_ref?: string | null;
					sequence_order?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "client_order_client_report_id_fkey";
						columns: ["client_report_id"];
						isOneToOne: false;
						referencedRelation: "client_report";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_order_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
				];
			};
			client_portal_settings: {
				Row: {
					created_at: string | null;
					id: string;
					is_active: boolean;
					portal_slug: string;
					qr_logo_url: string | null;
					requires_auth: boolean;
					show_qr_logo: boolean;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					is_active?: boolean;
					portal_slug: string;
					qr_logo_url?: string | null;
					requires_auth?: boolean;
					show_qr_logo?: boolean;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					is_active?: boolean;
					portal_slug?: string;
					qr_logo_url?: string | null;
					requires_auth?: boolean;
					show_qr_logo?: boolean;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			client_quality_control: {
				Row: {
					checked_by: string | null;
					checked_date: string | null;
					client_report_id: string;
					display_name: string | null;
					entity_type: string;
					id: string;
					sequence_order: number | null;
					signature_url: string | null;
					title: string | null;
				};
				Insert: {
					checked_by?: string | null;
					checked_date?: string | null;
					client_report_id: string;
					display_name?: string | null;
					entity_type: string;
					id?: string;
					sequence_order?: number | null;
					signature_url?: string | null;
					title?: string | null;
				};
				Update: {
					checked_by?: string | null;
					checked_date?: string | null;
					client_report_id?: string;
					display_name?: string | null;
					entity_type?: string;
					id?: string;
					sequence_order?: number | null;
					signature_url?: string | null;
					title?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "client_quality_control_client_report_id_fkey";
						columns: ["client_report_id"];
						isOneToOne: false;
						referencedRelation: "client_report";
						referencedColumns: ["id"];
					},
				];
			};
			client_report: {
				Row: {
					base_pkg_details_settings: Json;
					batch_id: string | null;
					client_id: string | null;
					company_snapshot: Json;
					created_at: string | null;
					created_by: string;
					date_filter_mode: string;
					date_from: string | null;
					date_to: string | null;
					detail_level: string;
					display_settings: Json;
					filter_criteria: Json;
					final_destination_country: string | null;
					id: string;
					included_statuses: string[];
					orientation: string | null;
					period_type: string;
					project_reference: string | null;
					report_date: string;
					report_name: string;
					report_number: string | null;
					report_types: string[];
					status: string;
					template_id: string | null;
					transport_modes: string[] | null;
					updated_at: string | null;
				};
				Insert: {
					base_pkg_details_settings?: Json;
					batch_id?: string | null;
					client_id?: string | null;
					company_snapshot?: Json;
					created_at?: string | null;
					created_by: string;
					date_filter_mode?: string;
					date_from?: string | null;
					date_to?: string | null;
					detail_level?: string;
					display_settings?: Json;
					filter_criteria?: Json;
					final_destination_country?: string | null;
					id?: string;
					included_statuses?: string[];
					orientation?: string | null;
					period_type?: string;
					project_reference?: string | null;
					report_date?: string;
					report_name: string;
					report_number?: string | null;
					report_types?: string[];
					status?: string;
					template_id?: string | null;
					transport_modes?: string[] | null;
					updated_at?: string | null;
				};
				Update: {
					base_pkg_details_settings?: Json;
					batch_id?: string | null;
					client_id?: string | null;
					company_snapshot?: Json;
					created_at?: string | null;
					created_by?: string;
					date_filter_mode?: string;
					date_from?: string | null;
					date_to?: string | null;
					detail_level?: string;
					display_settings?: Json;
					filter_criteria?: Json;
					final_destination_country?: string | null;
					id?: string;
					included_statuses?: string[];
					orientation?: string | null;
					period_type?: string;
					project_reference?: string | null;
					report_date?: string;
					report_name?: string;
					report_number?: string | null;
					report_types?: string[];
					status?: string;
					template_id?: string | null;
					transport_modes?: string[] | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "client_report_batch_id_fkey";
						columns: ["batch_id"];
						isOneToOne: false;
						referencedRelation: "report_batch";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_template_id_fkey";
						columns: ["template_id"];
						isOneToOne: false;
						referencedRelation: "report_template_settings";
						referencedColumns: ["id"];
					},
				];
			};
			client_report_collaborators: {
				Row: {
					added_at: string | null;
					added_by: string | null;
					can_edit: boolean;
					client_report_id: string;
					id: string;
					profile_id: string;
				};
				Insert: {
					added_at?: string | null;
					added_by?: string | null;
					can_edit?: boolean;
					client_report_id: string;
					id?: string;
					profile_id: string;
				};
				Update: {
					added_at?: string | null;
					added_by?: string | null;
					can_edit?: boolean;
					client_report_id?: string;
					id?: string;
					profile_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "client_report_collaborators_added_by_fkey";
						columns: ["added_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_collaborators_added_by_fkey";
						columns: ["added_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_collaborators_added_by_fkey";
						columns: ["added_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_collaborators_client_report_id_fkey";
						columns: ["client_report_id"];
						isOneToOne: false;
						referencedRelation: "client_report";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_collaborators_profile_id_fkey";
						columns: ["profile_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_collaborators_profile_id_fkey";
						columns: ["profile_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_collaborators_profile_id_fkey";
						columns: ["profile_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			client_report_orders: {
				Row: {
					client_report_id: string;
					id: string;
					order_id: string;
				};
				Insert: {
					client_report_id: string;
					id?: string;
					order_id: string;
				};
				Update: {
					client_report_id?: string;
					id?: string;
					order_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "client_report_orders_client_report_id_fkey";
						columns: ["client_report_id"];
						isOneToOne: false;
						referencedRelation: "client_report";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "client_report_orders_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
				];
			};
			client_shipment: {
				Row: {
					address_1: string | null;
					address_2: string | null;
					address_3: string | null;
					city: string | null;
					client_report_id: string;
					consignee: string | null;
					contact: string | null;
					country: string | null;
					email: string | null;
					id: string;
					phone: string | null;
					post_code: string | null;
					shipping_date: string | null;
				};
				Insert: {
					address_1?: string | null;
					address_2?: string | null;
					address_3?: string | null;
					city?: string | null;
					client_report_id: string;
					consignee?: string | null;
					contact?: string | null;
					country?: string | null;
					email?: string | null;
					id?: string;
					phone?: string | null;
					post_code?: string | null;
					shipping_date?: string | null;
				};
				Update: {
					address_1?: string | null;
					address_2?: string | null;
					address_3?: string | null;
					city?: string | null;
					client_report_id?: string;
					consignee?: string | null;
					contact?: string | null;
					country?: string | null;
					email?: string | null;
					id?: string;
					phone?: string | null;
					post_code?: string | null;
					shipping_date?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "client_shipment_client_report_id_fkey";
						columns: ["client_report_id"];
						isOneToOne: false;
						referencedRelation: "client_report";
						referencedColumns: ["id"];
					},
				];
			};
			clients: {
				Row: {
					address: string | null;
					address_line_1: string | null;
					address_line_2: string | null;
					city: string | null;
					contact_person: string | null;
					country: string | null;
					created_at: string | null;
					email: string | null;
					id: string;
					name: string;
					phone: string | null;
					portal_settings_id: string | null;
					post_code: string | null;
					trn: string | null;
					updated_at: string | null;
				};
				Insert: {
					address?: string | null;
					address_line_1?: string | null;
					address_line_2?: string | null;
					city?: string | null;
					contact_person?: string | null;
					country?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: string;
					name: string;
					phone?: string | null;
					portal_settings_id?: string | null;
					post_code?: string | null;
					trn?: string | null;
					updated_at?: string | null;
				};
				Update: {
					address?: string | null;
					address_line_1?: string | null;
					address_line_2?: string | null;
					city?: string | null;
					contact_person?: string | null;
					country?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: string;
					name?: string;
					phone?: string | null;
					portal_settings_id?: string | null;
					post_code?: string | null;
					trn?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "clients_portal_settings_id_fkey";
						columns: ["portal_settings_id"];
						isOneToOne: false;
						referencedRelation: "client_portal_settings";
						referencedColumns: ["id"];
					},
				];
			};
			instance_c_report_map: {
				Row: {
					client_report_id: string;
					group_label: string | null;
					group_order: number | null;
					id: string;
					package_instance_id: string;
					pkg_details_settings: Json | null;
					sequence_order: number | null;
				};
				Insert: {
					client_report_id: string;
					group_label?: string | null;
					group_order?: number | null;
					id?: string;
					package_instance_id: string;
					pkg_details_settings?: Json | null;
					sequence_order?: number | null;
				};
				Update: {
					client_report_id?: string;
					group_label?: string | null;
					group_order?: number | null;
					id?: string;
					package_instance_id?: string;
					pkg_details_settings?: Json | null;
					sequence_order?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "instance_c_report_map_client_report_id_fkey";
						columns: ["client_report_id"];
						isOneToOne: false;
						referencedRelation: "client_report";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "instance_c_report_map_package_instance_id_fkey";
						columns: ["package_instance_id"];
						isOneToOne: false;
						referencedRelation: "order_pkg_instance";
						referencedColumns: ["id"];
					},
				];
			};
			items_db: {
				Row: {
					category_id: string | null;
					client_id: string;
					created_at: string | null;
					description: string | null;
					expected_qty: number;
					height: number | null;
					id: string;
					ipac_comments: string | null;
					item_num: string | null;
					length: number | null;
					net_weight: number | null;
					packed_qty: number | null;
					reference: string | null;
					updated_at: string | null;
					warehouse_location: string | null;
					width: number | null;
				};
				Insert: {
					category_id?: string | null;
					client_id: string;
					created_at?: string | null;
					description?: string | null;
					expected_qty?: number;
					height?: number | null;
					id?: string;
					ipac_comments?: string | null;
					item_num?: string | null;
					length?: number | null;
					net_weight?: number | null;
					packed_qty?: number | null;
					reference?: string | null;
					updated_at?: string | null;
					warehouse_location?: string | null;
					width?: number | null;
				};
				Update: {
					category_id?: string | null;
					client_id?: string;
					created_at?: string | null;
					description?: string | null;
					expected_qty?: number;
					height?: number | null;
					id?: string;
					ipac_comments?: string | null;
					item_num?: string | null;
					length?: number | null;
					net_weight?: number | null;
					packed_qty?: number | null;
					reference?: string | null;
					updated_at?: string | null;
					warehouse_location?: string | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "items_db_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "pkg_category";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "maintenance_db_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
				];
			};
			maintenance_task_assignments: {
				Row: {
					created_at: string;
					id: string;
					maintenance_task_log_id: string;
					packer_id: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					maintenance_task_log_id: string;
					packer_id: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					maintenance_task_log_id?: string;
					packer_id?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "maintenance_task_assignments_maintenance_task_log_id_fkey";
						columns: ["maintenance_task_log_id"];
						isOneToOne: false;
						referencedRelation: "maintenance_task_log";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "maintenance_task_assignments_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "maintenance_task_assignments_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "maintenance_task_assignments_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			maintenance_task_log: {
				Row: {
					category: Database["public"]["Enums"]["maintenance_task_category"];
					created_at: string;
					duration_minutes: number | null;
					end_time: string | null;
					id: string;
					order_package_id: string;
					sequence_order: number;
					start_time: string | null;
					task_id: string;
					task_status: Database["public"]["Enums"]["maintenance_task_status"];
					updated_at: string;
				};
				Insert: {
					category: Database["public"]["Enums"]["maintenance_task_category"];
					created_at?: string;
					duration_minutes?: number | null;
					end_time?: string | null;
					id?: string;
					order_package_id: string;
					sequence_order: number;
					start_time?: string | null;
					task_id: string;
					task_status?: Database["public"]["Enums"]["maintenance_task_status"];
					updated_at?: string;
				};
				Update: {
					category?: Database["public"]["Enums"]["maintenance_task_category"];
					created_at?: string;
					duration_minutes?: number | null;
					end_time?: string | null;
					id?: string;
					order_package_id?: string;
					sequence_order?: number;
					start_time?: string | null;
					task_id?: string;
					task_status?: Database["public"]["Enums"]["maintenance_task_status"];
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "maintenance_task_log_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "maintenance_task_log_task_id_fkey";
						columns: ["task_id"];
						isOneToOne: false;
						referencedRelation: "tasks";
						referencedColumns: ["id"];
					},
				];
			};
			material_requests: {
				Row: {
					admin_notes: string | null;
					description: string | null;
					id: string;
					name: string;
					order_package_context: string | null;
					requested_at: string | null;
					requested_by: string;
					unit_id: string | null;
				};
				Insert: {
					admin_notes?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					order_package_context?: string | null;
					requested_at?: string | null;
					requested_by: string;
					unit_id?: string | null;
				};
				Update: {
					admin_notes?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					order_package_context?: string | null;
					requested_at?: string | null;
					requested_by?: string;
					unit_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "material_requests_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_requests_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units_of_measure";
						referencedColumns: ["id"];
					},
				];
			};
			material_tags: {
				Row: {
					material_id: string;
					tag_id: string;
				};
				Insert: {
					material_id: string;
					tag_id: string;
				};
				Update: {
					material_id?: string;
					tag_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "material_tags_material_id_fkey";
						columns: ["material_id"];
						isOneToOne: false;
						referencedRelation: "materials";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_tags_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "tags";
						referencedColumns: ["id"];
					},
				];
			};
			material_variant_requests: {
				Row: {
					admin_notes: string | null;
					attributes: Json | null;
					description: string | null;
					id: string;
					length: number | null;
					material_id: string | null;
					material_request_id: string | null;
					order_package_context: string | null;
					requested_at: string | null;
					requested_by: string;
					thickness: number | null;
					unit_id: string | null;
					variant_name: string;
					weight_per_unit: number | null;
					width: number | null;
				};
				Insert: {
					admin_notes?: string | null;
					attributes?: Json | null;
					description?: string | null;
					id?: string;
					length?: number | null;
					material_id?: string | null;
					material_request_id?: string | null;
					order_package_context?: string | null;
					requested_at?: string | null;
					requested_by: string;
					thickness?: number | null;
					unit_id?: string | null;
					variant_name: string;
					weight_per_unit?: number | null;
					width?: number | null;
				};
				Update: {
					admin_notes?: string | null;
					attributes?: Json | null;
					description?: string | null;
					id?: string;
					length?: number | null;
					material_id?: string | null;
					material_request_id?: string | null;
					order_package_context?: string | null;
					requested_at?: string | null;
					requested_by?: string;
					thickness?: number | null;
					unit_id?: string | null;
					variant_name?: string;
					weight_per_unit?: number | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "material_variant_requests_material_id_fkey";
						columns: ["material_id"];
						isOneToOne: false;
						referencedRelation: "materials";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_requests_material_request_id_fkey";
						columns: ["material_request_id"];
						isOneToOne: false;
						referencedRelation: "material_requests";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_requests_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_requests_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units_of_measure";
						referencedColumns: ["id"];
					},
				];
			};
			material_variant_tags: {
				Row: {
					material_variant_id: string;
					tag_id: string;
				};
				Insert: {
					material_variant_id: string;
					tag_id: string;
				};
				Update: {
					material_variant_id?: string;
					tag_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "material_variant_tags_material_variant_id_fkey";
						columns: ["material_variant_id"];
						isOneToOne: false;
						referencedRelation: "material_variants";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variant_tags_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "tags";
						referencedColumns: ["id"];
					},
				];
			};
			material_variants: {
				Row: {
					admin_notes: string | null;
					approval_status: string | null;
					attributes: Json | null;
					created_at: string | null;
					description: string | null;
					id: string;
					length: number | null;
					material_id: string;
					order_package_context: string | null;
					pending_approval: boolean | null;
					requested_at: string | null;
					requested_by: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					thickness: number | null;
					unit_id: string | null;
					variant_name: string;
					weight_per_unit: number | null;
					width: number | null;
				};
				Insert: {
					admin_notes?: string | null;
					approval_status?: string | null;
					attributes?: Json | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					length?: number | null;
					material_id: string;
					order_package_context?: string | null;
					pending_approval?: boolean | null;
					requested_at?: string | null;
					requested_by?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					thickness?: number | null;
					unit_id?: string | null;
					variant_name: string;
					weight_per_unit?: number | null;
					width?: number | null;
				};
				Update: {
					admin_notes?: string | null;
					approval_status?: string | null;
					attributes?: Json | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					length?: number | null;
					material_id?: string;
					order_package_context?: string | null;
					pending_approval?: boolean | null;
					requested_at?: string | null;
					requested_by?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					thickness?: number | null;
					unit_id?: string | null;
					variant_name?: string;
					weight_per_unit?: number | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "material_variants_material_id_fkey";
						columns: ["material_id"];
						isOneToOne: false;
						referencedRelation: "materials";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "material_variants_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units_of_measure";
						referencedColumns: ["id"];
					},
				];
			};
			materials: {
				Row: {
					admin_notes: string | null;
					approval_status: string | null;
					created_at: string | null;
					description: string | null;
					id: string;
					name: string;
					order_package_context: string | null;
					pending_approval: boolean | null;
					requested_at: string | null;
					requested_by: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					unit_id: string | null;
				};
				Insert: {
					admin_notes?: string | null;
					approval_status?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					order_package_context?: string | null;
					pending_approval?: boolean | null;
					requested_at?: string | null;
					requested_by?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					unit_id?: string | null;
				};
				Update: {
					admin_notes?: string | null;
					approval_status?: string | null;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					order_package_context?: string | null;
					pending_approval?: boolean | null;
					requested_at?: string | null;
					requested_by?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					unit_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "materials_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "materials_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units_of_measure";
						referencedColumns: ["id"];
					},
				];
			};
			media: {
				Row: {
					created_at: string | null;
					designation: Database["public"]["Enums"]["MediaCategory"] | null;
					id: string;
					image_url: string | null;
					maintenance_task_log_id: string | null;
					notes: string | null;
					order_package_id: string;
					order_pkg_instance_id: string | null;
					package_item_id: string | null;
					pkd_item_id: string | null;
					task_log_id: string | null;
				};
				Insert: {
					created_at?: string | null;
					designation?: Database["public"]["Enums"]["MediaCategory"] | null;
					id?: string;
					image_url?: string | null;
					maintenance_task_log_id?: string | null;
					notes?: string | null;
					order_package_id: string;
					order_pkg_instance_id?: string | null;
					package_item_id?: string | null;
					pkd_item_id?: string | null;
					task_log_id?: string | null;
				};
				Update: {
					created_at?: string | null;
					designation?: Database["public"]["Enums"]["MediaCategory"] | null;
					id?: string;
					image_url?: string | null;
					maintenance_task_log_id?: string | null;
					notes?: string | null;
					order_package_id?: string;
					order_pkg_instance_id?: string | null;
					package_item_id?: string | null;
					pkd_item_id?: string | null;
					task_log_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "media_maintenance_task_log_id_fkey";
						columns: ["maintenance_task_log_id"];
						isOneToOne: false;
						referencedRelation: "maintenance_task_log";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "media_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "media_order_pkg_instance_id_fkey";
						columns: ["order_pkg_instance_id"];
						isOneToOne: false;
						referencedRelation: "order_pkg_instance";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "media_package_item_id_fkey";
						columns: ["package_item_id"];
						isOneToOne: false;
						referencedRelation: "package_items";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "media_pkd_item_id_fkey";
						columns: ["pkd_item_id"];
						isOneToOne: false;
						referencedRelation: "pkd_item";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "media_task_log_id_fkey";
						columns: ["task_log_id"];
						isOneToOne: false;
						referencedRelation: "task_logs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "media_task_log_id_fkey";
						columns: ["task_log_id"];
						isOneToOne: false;
						referencedRelation: "task_status_view";
						referencedColumns: ["task_log_id"];
					},
				];
			};
			order_package_materials: {
				Row: {
					comment: string | null;
					created_at: string | null;
					height: number | null;
					id: string;
					is_final: boolean;
					item_used: boolean;
					length: number | null;
					material_type: Database["public"]["Enums"]["material_type"];
					material_variant_id: string | null;
					order_package_id: string;
					original: string | null;
					quantity: number;
					quantity_used: number | null;
					thickness: number | null;
					unit_id: string;
					updated_at: string | null;
					variant_request_id: string | null;
					width: number | null;
				};
				Insert: {
					comment?: string | null;
					created_at?: string | null;
					height?: number | null;
					id?: string;
					is_final?: boolean;
					item_used?: boolean;
					length?: number | null;
					material_type: Database["public"]["Enums"]["material_type"];
					material_variant_id?: string | null;
					order_package_id: string;
					original?: string | null;
					quantity: number;
					quantity_used?: number | null;
					thickness?: number | null;
					unit_id: string;
					updated_at?: string | null;
					variant_request_id?: string | null;
					width?: number | null;
				};
				Update: {
					comment?: string | null;
					created_at?: string | null;
					height?: number | null;
					id?: string;
					is_final?: boolean;
					item_used?: boolean;
					length?: number | null;
					material_type?: Database["public"]["Enums"]["material_type"];
					material_variant_id?: string | null;
					order_package_id?: string;
					original?: string | null;
					quantity?: number;
					quantity_used?: number | null;
					thickness?: number | null;
					unit_id?: string;
					updated_at?: string | null;
					variant_request_id?: string | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "order_package_materials_material_variant_id_fkey";
						columns: ["material_variant_id"];
						isOneToOne: false;
						referencedRelation: "material_variants";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_package_materials_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_package_materials_original_fkey";
						columns: ["original"];
						isOneToOne: false;
						referencedRelation: "order_package_materials";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_package_materials_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units_of_measure";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_package_materials_variant_request_id_fkey";
						columns: ["variant_request_id"];
						isOneToOne: false;
						referencedRelation: "material_variant_requests";
						referencedColumns: ["id"];
					},
				];
			};
			order_package_securing: {
				Row: {
					created_at: string | null;
					id: string;
					is_final: boolean;
					order_package_id: string;
					securing_side: Database["public"]["Enums"]["securing_side"];
					securing_template_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					is_final: boolean;
					order_package_id: string;
					securing_side: Database["public"]["Enums"]["securing_side"];
					securing_template_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					is_final?: boolean;
					order_package_id?: string;
					securing_side?: Database["public"]["Enums"]["securing_side"];
					securing_template_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_package_securing_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_package_securing_securing_template_id_fkey";
						columns: ["securing_template_id"];
						isOneToOne: false;
						referencedRelation: "securing_template";
						referencedColumns: ["id"];
					},
				];
			};
			order_package_services: {
				Row: {
					created_at: string | null;
					id: string;
					is_final: boolean;
					order_package_id: string;
					result: Json | null;
					service_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					is_final?: boolean;
					order_package_id: string;
					result?: Json | null;
					service_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					is_final?: boolean;
					order_package_id?: string;
					result?: Json | null;
					service_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_package_services_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_package_services_service_id_fkey";
						columns: ["service_id"];
						isOneToOne: false;
						referencedRelation: "services";
						referencedColumns: ["id"];
					},
				];
			};
			order_packages: {
				Row: {
					comments: Json | null;
					created_at: string | null;
					description: string | null;
					final_pkg_info: string | null;
					id: string;
					maintenance_package_type:
						| Database["public"]["Enums"]["maintenance_package_type"]
						| null;
					order_id: string;
					original_pkg_info: string | null;
					package_number: number;
					reference: string | null;
					status: string;
					updated_at: string | null;
				};
				Insert: {
					comments?: Json | null;
					created_at?: string | null;
					description?: string | null;
					final_pkg_info?: string | null;
					id?: string;
					maintenance_package_type?:
						| Database["public"]["Enums"]["maintenance_package_type"]
						| null;
					order_id: string;
					original_pkg_info?: string | null;
					package_number: number;
					reference?: string | null;
					status?: string;
					updated_at?: string | null;
				};
				Update: {
					comments?: Json | null;
					created_at?: string | null;
					description?: string | null;
					final_pkg_info?: string | null;
					id?: string;
					maintenance_package_type?:
						| Database["public"]["Enums"]["maintenance_package_type"]
						| null;
					order_id?: string;
					original_pkg_info?: string | null;
					package_number?: number;
					reference?: string | null;
					status?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "order_packages_final_pkg_info_fkey";
						columns: ["final_pkg_info"];
						isOneToOne: false;
						referencedRelation: "package_info";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_packages_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_packages_original_pkg_info_fkey";
						columns: ["original_pkg_info"];
						isOneToOne: false;
						referencedRelation: "package_info";
						referencedColumns: ["id"];
					},
				];
			};
			order_pkg_instance: {
				Row: {
					client_reference: string | null;
					created_at: string;
					destination: string | null;
					id: string;
					instance_number: number;
					ipac_reference: string | null;
					order_package_id: string;
					order_pkg_overview_id: string;
					packed_at: string | null;
					status: string;
					updated_at: string;
				};
				Insert: {
					client_reference?: string | null;
					created_at?: string;
					destination?: string | null;
					id?: string;
					instance_number: number;
					ipac_reference?: string | null;
					order_package_id: string;
					order_pkg_overview_id: string;
					packed_at?: string | null;
					status?: string;
					updated_at?: string;
				};
				Update: {
					client_reference?: string | null;
					created_at?: string;
					destination?: string | null;
					id?: string;
					instance_number?: number;
					ipac_reference?: string | null;
					order_package_id?: string;
					order_pkg_overview_id?: string;
					packed_at?: string | null;
					status?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_pkg_instance_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_pkg_instance_order_pkg_overview_id_fkey";
						columns: ["order_pkg_overview_id"];
						isOneToOne: false;
						referencedRelation: "order_pkg_overview";
						referencedColumns: ["id"];
					},
				];
			};
			order_pkg_overview: {
				Row: {
					created_at: string;
					description: string | null;
					id: string;
					order_id: string;
					pkg_number: number;
					quantity: number;
					quantity_packed: number;
					status: string;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					description?: string | null;
					id?: string;
					order_id: string;
					pkg_number: number;
					quantity?: number;
					quantity_packed?: number;
					status?: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					description?: string | null;
					id?: string;
					order_id?: string;
					pkg_number?: number;
					quantity?: number;
					quantity_packed?: number;
					status?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_pkg_overview_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
				];
			};
			order_team_members: {
				Row: {
					created_at: string | null;
					id: string;
					is_team_lead: boolean | null;
					order_id: string;
					packer_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					is_team_lead?: boolean | null;
					order_id: string;
					packer_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					is_team_lead?: boolean | null;
					order_id?: string;
					packer_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "order_team_members_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_team_members_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_team_members_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "order_team_members_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			orders: {
				Row: {
					client_id: string;
					commercial_status: string;
					completion_date: string | null;
					created_at: string | null;
					created_by: string | null;
					description: string | null;
					id: string;
					order_name: string;
					production_status: string;
					project_lead_id: string | null;
					project_type: Database["public"]["Enums"]["project_type"];
					reference: string | null;
					start_date: string | null;
					total_actual_cost: number | null;
					total_estimated_cost: number | null;
					total_transportation_cost: number | null;
					updated_at: string | null;
				};
				Insert: {
					client_id: string;
					commercial_status?: string;
					completion_date?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					order_name: string;
					production_status?: string;
					project_lead_id?: string | null;
					project_type?: Database["public"]["Enums"]["project_type"];
					reference?: string | null;
					start_date?: string | null;
					total_actual_cost?: number | null;
					total_estimated_cost?: number | null;
					total_transportation_cost?: number | null;
					updated_at?: string | null;
				};
				Update: {
					client_id?: string;
					commercial_status?: string;
					completion_date?: string | null;
					created_at?: string | null;
					created_by?: string | null;
					description?: string | null;
					id?: string;
					order_name?: string;
					production_status?: string;
					project_lead_id?: string | null;
					project_type?: Database["public"]["Enums"]["project_type"];
					reference?: string | null;
					start_date?: string | null;
					total_actual_cost?: number | null;
					total_estimated_cost?: number | null;
					total_transportation_cost?: number | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "orders_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "orders_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "orders_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "orders_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "orders_project_lead_id_fkey";
						columns: ["project_lead_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "orders_project_lead_id_fkey";
						columns: ["project_lead_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "orders_project_lead_id_fkey";
						columns: ["project_lead_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			package_info: {
				Row: {
					box_type_id: string | null;
					boxes_completed: number;
					center_of_gravity: boolean | null;
					external_height: number | null;
					external_length: number | null;
					external_width: number | null;
					gross_weight: number | null;
					id: string;
					internal_height: number | null;
					internal_length: number | null;
					internal_width: number | null;
					net_weight: number | null;
					packing_type_id: string | null;
					quantity: number | null;
					sei_category: number | null;
					sei_protection: number | null;
					tare: number | null;
				};
				Insert: {
					box_type_id?: string | null;
					boxes_completed?: number;
					center_of_gravity?: boolean | null;
					external_height?: number | null;
					external_length?: number | null;
					external_width?: number | null;
					gross_weight?: number | null;
					id?: string;
					internal_height?: number | null;
					internal_length?: number | null;
					internal_width?: number | null;
					net_weight?: number | null;
					packing_type_id?: string | null;
					quantity?: number | null;
					sei_category?: number | null;
					sei_protection?: number | null;
					tare?: number | null;
				};
				Update: {
					box_type_id?: string | null;
					boxes_completed?: number;
					center_of_gravity?: boolean | null;
					external_height?: number | null;
					external_length?: number | null;
					external_width?: number | null;
					gross_weight?: number | null;
					id?: string;
					internal_height?: number | null;
					internal_length?: number | null;
					internal_width?: number | null;
					net_weight?: number | null;
					packing_type_id?: string | null;
					quantity?: number | null;
					sei_category?: number | null;
					sei_protection?: number | null;
					tare?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "package_info_box_type_id_fkey";
						columns: ["box_type_id"];
						isOneToOne: false;
						referencedRelation: "box_type";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "package_info_packing_type_id_fkey";
						columns: ["packing_type_id"];
						isOneToOne: false;
						referencedRelation: "packing_types";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "package_info_sei_category_fkey";
						columns: ["sei_category"];
						isOneToOne: false;
						referencedRelation: "sei_categories";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "package_info_sei_protection_fkey";
						columns: ["sei_protection"];
						isOneToOne: false;
						referencedRelation: "sei_protection";
						referencedColumns: ["id"];
					},
				];
			};
			package_items: {
				Row: {
					designation: string | null;
					height: number | null;
					id: string;
					items_db_id: string | null;
					length: number | null;
					net_weight: number | null;
					order_package_id: string;
					quantity: number | null;
					reference: string | null;
					width: number | null;
				};
				Insert: {
					designation?: string | null;
					height?: number | null;
					id?: string;
					items_db_id?: string | null;
					length?: number | null;
					net_weight?: number | null;
					order_package_id: string;
					quantity?: number | null;
					reference?: string | null;
					width?: number | null;
				};
				Update: {
					designation?: string | null;
					height?: number | null;
					id?: string;
					items_db_id?: string | null;
					length?: number | null;
					net_weight?: number | null;
					order_package_id?: string;
					quantity?: number | null;
					reference?: string | null;
					width?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "package_items_items_db_id_fkey";
						columns: ["items_db_id"];
						isOneToOne: false;
						referencedRelation: "items_db";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "package_items_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
				];
			};
			packer_sessions: {
				Row: {
					attendance_completed: boolean | null;
					client_name: string | null;
					created_at: string | null;
					id: string;
					order_id: string | null;
					order_name: string | null;
					packaging_started: boolean | null;
					packer_id: string | null;
					project_lead_name: string | null;
					session_active: boolean | null;
					team_selected: boolean | null;
					updated_at: string | null;
				};
				Insert: {
					attendance_completed?: boolean | null;
					client_name?: string | null;
					created_at?: string | null;
					id?: string;
					order_id?: string | null;
					order_name?: string | null;
					packaging_started?: boolean | null;
					packer_id?: string | null;
					project_lead_name?: string | null;
					session_active?: boolean | null;
					team_selected?: boolean | null;
					updated_at?: string | null;
				};
				Update: {
					attendance_completed?: boolean | null;
					client_name?: string | null;
					created_at?: string | null;
					id?: string;
					order_id?: string | null;
					order_name?: string | null;
					packaging_started?: boolean | null;
					packer_id?: string | null;
					project_lead_name?: string | null;
					session_active?: boolean | null;
					team_selected?: boolean | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "packer_sessions_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "packer_sessions_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "packer_sessions_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "packer_sessions_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			packing_types: {
				Row: {
					base_material_type: string | null;
					code: string;
					created_at: string | null;
					description: string | null;
					id: string;
					includes_contact: boolean | null;
					includes_gas_protection: boolean | null;
					includes_vacuum_protection: boolean | null;
					includes_vibration_protection: boolean | null;
					includes_waterproofing: boolean | null;
					name: string;
					updated_at: string | null;
				};
				Insert: {
					base_material_type?: string | null;
					code: string;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					includes_contact?: boolean | null;
					includes_gas_protection?: boolean | null;
					includes_vacuum_protection?: boolean | null;
					includes_vibration_protection?: boolean | null;
					includes_waterproofing?: boolean | null;
					name: string;
					updated_at?: string | null;
				};
				Update: {
					base_material_type?: string | null;
					code?: string;
					created_at?: string | null;
					description?: string | null;
					id?: string;
					includes_contact?: boolean | null;
					includes_gas_protection?: boolean | null;
					includes_vacuum_protection?: boolean | null;
					includes_vibration_protection?: boolean | null;
					includes_waterproofing?: boolean | null;
					name?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			pkd_item: {
				Row: {
					created_at: string | null;
					id: string;
					maintenance_db_id: string | null;
					pkg_instance_id: string;
					quantity: number | null;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					maintenance_db_id?: string | null;
					pkg_instance_id: string;
					quantity?: number | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					maintenance_db_id?: string | null;
					pkg_instance_id?: string;
					quantity?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "maintenance_package_items_maintenance_db_id_fkey";
						columns: ["maintenance_db_id"];
						isOneToOne: false;
						referencedRelation: "items_db";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "pkd_item_pkg_instance_id_fkey";
						columns: ["pkg_instance_id"];
						isOneToOne: false;
						referencedRelation: "order_pkg_instance";
						referencedColumns: ["id"];
					},
				];
			};
			pkg_category: {
				Row: {
					client_id: string;
					created_at: string | null;
					id: string;
					label: string;
				};
				Insert: {
					client_id: string;
					created_at?: string | null;
					id?: string;
					label: string;
				};
				Update: {
					client_id?: string;
					created_at?: string | null;
					id?: string;
					label?: string;
				};
				Relationships: [
					{
						foreignKeyName: "pkg_category_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					client_id: string | null;
					created_at: string | null;
					current_order_id: string | null;
					full_name: string;
					id: string;
					packer_status: string | null;
					phone_number: string | null;
					role_id: string;
					status: string;
					updated_at: string | null;
					username: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					client_id?: string | null;
					created_at?: string | null;
					current_order_id?: string | null;
					full_name: string;
					id: string;
					packer_status?: string | null;
					phone_number?: string | null;
					role_id: string;
					status?: string;
					updated_at?: string | null;
					username?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					client_id?: string | null;
					created_at?: string | null;
					current_order_id?: string | null;
					full_name?: string;
					id?: string;
					packer_status?: string | null;
					phone_number?: string | null;
					role_id?: string;
					status?: string;
					updated_at?: string | null;
					username?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "profiles_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "profiles_current_order_id_fkey";
						columns: ["current_order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "profiles_role_id_fkey";
						columns: ["role_id"];
						isOneToOne: false;
						referencedRelation: "roles";
						referencedColumns: ["id"];
					},
				];
			};
			project_tags: {
				Row: {
					client_id: string | null;
					created_at: string | null;
					id: string;
					name: string;
				};
				Insert: {
					client_id?: string | null;
					created_at?: string | null;
					id?: string;
					name: string;
				};
				Update: {
					client_id?: string | null;
					created_at?: string | null;
					id?: string;
					name?: string;
				};
				Relationships: [
					{
						foreignKeyName: "project_tags_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
				];
			};
			qr_codes: {
				Row: {
					created_at: string | null;
					entity_id: string;
					entity_type: string;
					id: string;
					is_active: boolean;
					token: string;
				};
				Insert: {
					created_at?: string | null;
					entity_id: string;
					entity_type: string;
					id?: string;
					is_active?: boolean;
					token?: string;
				};
				Update: {
					created_at?: string | null;
					entity_id?: string;
					entity_type?: string;
					id?: string;
					is_active?: boolean;
					token?: string;
				};
				Relationships: [];
			};
			report_batch: {
				Row: {
					batch_name: string;
					created_at: string | null;
					created_by: string;
					id: string;
					split_by: string | null;
					total_reports: number | null;
				};
				Insert: {
					batch_name: string;
					created_at?: string | null;
					created_by: string;
					id?: string;
					split_by?: string | null;
					total_reports?: number | null;
				};
				Update: {
					batch_name?: string;
					created_at?: string | null;
					created_by?: string;
					id?: string;
					split_by?: string | null;
					total_reports?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "report_batch_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "report_batch_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "report_batch_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			report_template_settings: {
				Row: {
					client_id: string | null;
					created_at: string | null;
					created_by: string;
					description: string | null;
					display_settings: Json;
					id: string;
					is_public: boolean;
					orientation: string | null;
					pkg_details_settings: Json;
					template_name: string;
					updated_at: string | null;
				};
				Insert: {
					client_id?: string | null;
					created_at?: string | null;
					created_by: string;
					description?: string | null;
					display_settings?: Json;
					id?: string;
					is_public?: boolean;
					orientation?: string | null;
					pkg_details_settings?: Json;
					template_name: string;
					updated_at?: string | null;
				};
				Update: {
					client_id?: string | null;
					created_at?: string | null;
					created_by?: string;
					description?: string | null;
					display_settings?: Json;
					id?: string;
					is_public?: boolean;
					orientation?: string | null;
					pkg_details_settings?: Json;
					template_name?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "report_template_settings_client_id_fkey";
						columns: ["client_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "report_template_settings_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "report_template_settings_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "report_template_settings_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			request_audit_log: {
				Row: {
					action: Database["public"]["Enums"]["request_action"];
					admin_notes: string | null;
					created_at: string;
					id: string;
					order_package_context: string | null;
					request_snapshot: Json;
					request_type: Database["public"]["Enums"]["request_type"];
					requested_at: string | null;
					requested_by: string | null;
					resulting_id: string | null;
					reviewed_at: string;
					reviewed_by: string | null;
				};
				Insert: {
					action: Database["public"]["Enums"]["request_action"];
					admin_notes?: string | null;
					created_at?: string;
					id?: string;
					order_package_context?: string | null;
					request_snapshot: Json;
					request_type: Database["public"]["Enums"]["request_type"];
					requested_at?: string | null;
					requested_by?: string | null;
					resulting_id?: string | null;
					reviewed_at?: string;
					reviewed_by?: string | null;
				};
				Update: {
					action?: Database["public"]["Enums"]["request_action"];
					admin_notes?: string | null;
					created_at?: string;
					id?: string;
					order_package_context?: string | null;
					request_snapshot?: Json;
					request_type?: Database["public"]["Enums"]["request_type"];
					requested_at?: string | null;
					requested_by?: string | null;
					resulting_id?: string | null;
					reviewed_at?: string;
					reviewed_by?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "request_audit_log_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "request_audit_log_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "request_audit_log_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "request_audit_log_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "request_audit_log_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "request_audit_log_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "request_audit_log_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			roles: {
				Row: {
					can_ban_users: boolean | null;
					can_block_users: boolean | null;
					can_delete_profiles: boolean | null;
					can_manage_roles: boolean | null;
					can_reset_passwords: boolean | null;
					can_unblock_users: boolean | null;
					created_at: string | null;
					id: string;
					name: string;
					updated_at: string | null;
				};
				Insert: {
					can_ban_users?: boolean | null;
					can_block_users?: boolean | null;
					can_delete_profiles?: boolean | null;
					can_manage_roles?: boolean | null;
					can_reset_passwords?: boolean | null;
					can_unblock_users?: boolean | null;
					created_at?: string | null;
					id?: string;
					name: string;
					updated_at?: string | null;
				};
				Update: {
					can_ban_users?: boolean | null;
					can_block_users?: boolean | null;
					can_delete_profiles?: boolean | null;
					can_manage_roles?: boolean | null;
					can_reset_passwords?: boolean | null;
					can_unblock_users?: boolean | null;
					created_at?: string | null;
					id?: string;
					name?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			securing_template: {
				Row: {
					horizontal_bar: string | null;
					id: string;
					quantity: number | null;
					skids: string | null;
					thickness: number | null;
					type_id: string | null;
					vertical_bar: string | null;
				};
				Insert: {
					horizontal_bar?: string | null;
					id?: string;
					quantity?: number | null;
					skids?: string | null;
					thickness?: number | null;
					type_id?: string | null;
					vertical_bar?: string | null;
				};
				Update: {
					horizontal_bar?: string | null;
					id?: string;
					quantity?: number | null;
					skids?: string | null;
					thickness?: number | null;
					type_id?: string | null;
					vertical_bar?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "securing_template_horizontal_bar_fkey";
						columns: ["horizontal_bar"];
						isOneToOne: false;
						referencedRelation: "beam";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "securing_template_skids_fkey";
						columns: ["skids"];
						isOneToOne: false;
						referencedRelation: "beam";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "securing_template_type_id_fkey";
						columns: ["type_id"];
						isOneToOne: false;
						referencedRelation: "material_variants";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "securing_template_vertical_bar_fkey";
						columns: ["vertical_bar"];
						isOneToOne: false;
						referencedRelation: "beam";
						referencedColumns: ["id"];
					},
				];
			};
			sei_categories: {
				Row: {
					code: number | null;
					created_at: string;
					description: string | null;
					id: number;
					name: string | null;
				};
				Insert: {
					code?: number | null;
					created_at?: string;
					description?: string | null;
					id?: number;
					name?: string | null;
				};
				Update: {
					code?: number | null;
					created_at?: string;
					description?: string | null;
					id?: number;
					name?: string | null;
				};
				Relationships: [];
			};
			sei_protection: {
				Row: {
					code: string | null;
					created_at: string;
					description: string | null;
					id: number;
					name: string | null;
				};
				Insert: {
					code?: string | null;
					created_at?: string;
					description?: string | null;
					id?: number;
					name?: string | null;
				};
				Update: {
					code?: string | null;
					created_at?: string;
					description?: string | null;
					id?: number;
					name?: string | null;
				};
				Relationships: [];
			};
			services: {
				Row: {
					id: string;
					service: string;
					tag_id: string;
					ui_code: string | null;
				};
				Insert: {
					id?: string;
					service: string;
					tag_id: string;
					ui_code?: string | null;
				};
				Update: {
					id?: string;
					service?: string;
					tag_id?: string;
					ui_code?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "services_tag_id_fkey";
						columns: ["tag_id"];
						isOneToOne: false;
						referencedRelation: "tags";
						referencedColumns: ["id"];
					},
				];
			};
			supplier_email_messages: {
				Row: {
					body_text: string;
					created_at: string;
					created_by: string | null;
					direction: string;
					id: string;
					in_reply_to_resend_email_id: string | null;
					reason: string | null;
					related_variant_ids: Json;
					resend_email_id: string | null;
					status: string | null;
					subject: string;
					supplier_email: string;
					supplier_id: string | null;
					supplier_name: string | null;
				};
				Insert: {
					body_text: string;
					created_at?: string;
					created_by?: string | null;
					direction: string;
					id?: string;
					in_reply_to_resend_email_id?: string | null;
					reason?: string | null;
					related_variant_ids?: Json;
					resend_email_id?: string | null;
					status?: string | null;
					subject: string;
					supplier_email: string;
					supplier_id?: string | null;
					supplier_name?: string | null;
				};
				Update: {
					body_text?: string;
					created_at?: string;
					created_by?: string | null;
					direction?: string;
					id?: string;
					in_reply_to_resend_email_id?: string | null;
					reason?: string | null;
					related_variant_ids?: Json;
					resend_email_id?: string | null;
					status?: string | null;
					subject?: string;
					supplier_email?: string;
					supplier_id?: string | null;
					supplier_name?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "supplier_email_messages_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_email_messages_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_email_messages_created_by_fkey";
						columns: ["created_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_email_messages_supplier_id_fkey";
						columns: ["supplier_id"];
						isOneToOne: false;
						referencedRelation: "suppliers";
						referencedColumns: ["id"];
					},
				];
			};
			supplier_pricing: {
				Row: {
					admin_notes: string | null;
					approval_status: string | null;
					id: string;
					material_variant_id: string;
					order_package_context: string | null;
					pending_approval: boolean | null;
					price: number;
					price_per_unit: number;
					requested_at: string | null;
					requested_by: string | null;
					reviewed_at: string | null;
					reviewed_by: string | null;
					supplier_id: string;
					supplier_quantity: number;
					suppliers_reference: string | null;
					updated_at: string | null;
				};
				Insert: {
					admin_notes?: string | null;
					approval_status?: string | null;
					id?: string;
					material_variant_id: string;
					order_package_context?: string | null;
					pending_approval?: boolean | null;
					price?: number;
					price_per_unit?: number;
					requested_at?: string | null;
					requested_by?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					supplier_id: string;
					supplier_quantity?: number;
					suppliers_reference?: string | null;
					updated_at?: string | null;
				};
				Update: {
					admin_notes?: string | null;
					approval_status?: string | null;
					id?: string;
					material_variant_id?: string;
					order_package_context?: string | null;
					pending_approval?: boolean | null;
					price?: number;
					price_per_unit?: number;
					requested_at?: string | null;
					requested_by?: string | null;
					reviewed_at?: string | null;
					reviewed_by?: string | null;
					supplier_id?: string;
					supplier_quantity?: number;
					suppliers_reference?: string | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "supplier_pricing_material_variant_id_fkey";
						columns: ["material_variant_id"];
						isOneToOne: false;
						referencedRelation: "material_variants";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_reviewed_by_fkey";
						columns: ["reviewed_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_supplier_id_fkey";
						columns: ["supplier_id"];
						isOneToOne: false;
						referencedRelation: "suppliers";
						referencedColumns: ["id"];
					},
				];
			};
			supplier_pricing_requests: {
				Row: {
					admin_notes: string | null;
					id: string;
					material_variant_id: string | null;
					order_package_context: string | null;
					price: number;
					price_per_unit: number;
					requested_at: string | null;
					requested_by: string;
					supplier_id: string;
					supplier_quantity: number;
					suppliers_reference: string | null;
					variant_request_id: string | null;
				};
				Insert: {
					admin_notes?: string | null;
					id?: string;
					material_variant_id?: string | null;
					order_package_context?: string | null;
					price?: number;
					price_per_unit?: number;
					requested_at?: string | null;
					requested_by: string;
					supplier_id: string;
					supplier_quantity?: number;
					suppliers_reference?: string | null;
					variant_request_id?: string | null;
				};
				Update: {
					admin_notes?: string | null;
					id?: string;
					material_variant_id?: string | null;
					order_package_context?: string | null;
					price?: number;
					price_per_unit?: number;
					requested_at?: string | null;
					requested_by?: string;
					supplier_id?: string;
					supplier_quantity?: number;
					suppliers_reference?: string | null;
					variant_request_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "supplier_pricing_requests_order_package_context_fkey";
						columns: ["order_package_context"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requests_requested_by_fkey";
						columns: ["requested_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requests_supplier_fkey";
						columns: ["supplier_id"];
						isOneToOne: false;
						referencedRelation: "suppliers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requests_variant_fkey";
						columns: ["material_variant_id"];
						isOneToOne: false;
						referencedRelation: "material_variants";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "supplier_pricing_requests_variant_request_id_fkey";
						columns: ["variant_request_id"];
						isOneToOne: false;
						referencedRelation: "material_variant_requests";
						referencedColumns: ["id"];
					},
				];
			};
			suppliers: {
				Row: {
					address: string | null;
					contact_person: string | null;
					created_at: string | null;
					email: string | null;
					id: string;
					name: string;
					other_info: string | null;
					phone: string | null;
					updated_at: string | null;
				};
				Insert: {
					address?: string | null;
					contact_person?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: string;
					name: string;
					other_info?: string | null;
					phone?: string | null;
					updated_at?: string | null;
				};
				Update: {
					address?: string | null;
					contact_person?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: string;
					name?: string;
					other_info?: string | null;
					phone?: string | null;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			tags: {
				Row: {
					created_at: string | null;
					id: string;
					name: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					name: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					name?: string;
				};
				Relationships: [];
			};
			task_assignments: {
				Row: {
					created_at: string | null;
					id: string;
					packer_id: string;
					task_id: string;
					task_status: Database["public"]["Enums"]["task_status"] | null;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					packer_id: string;
					task_id: string;
					task_status?: Database["public"]["Enums"]["task_status"] | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					packer_id?: string;
					task_id?: string;
					task_status?: Database["public"]["Enums"]["task_status"] | null;
				};
				Relationships: [
					{
						foreignKeyName: "task_assignments_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "task_assignments_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "task_assignments_packer_id_fkey";
						columns: ["packer_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "task_assignments_task_id_fkey";
						columns: ["task_id"];
						isOneToOne: false;
						referencedRelation: "task_logs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "task_assignments_task_id_fkey";
						columns: ["task_id"];
						isOneToOne: false;
						referencedRelation: "task_status_view";
						referencedColumns: ["task_log_id"];
					},
				];
			};
			task_logs: {
				Row: {
					created_at: string | null;
					duration_minutes: number | null;
					end_time: string | null;
					id: string;
					notes: string | null;
					pause_duration: number | null;
					restart_time: string | null;
					start_time: string;
					task_id: string | null;
					update_counter: number | null;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					duration_minutes?: number | null;
					end_time?: string | null;
					id?: string;
					notes?: string | null;
					pause_duration?: number | null;
					restart_time?: string | null;
					start_time: string;
					task_id?: string | null;
					update_counter?: number | null;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					duration_minutes?: number | null;
					end_time?: string | null;
					id?: string;
					notes?: string | null;
					pause_duration?: number | null;
					restart_time?: string | null;
					start_time?: string;
					task_id?: string | null;
					update_counter?: number | null;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "task_logs_task_id_fkey";
						columns: ["task_id"];
						isOneToOne: false;
						referencedRelation: "tasks";
						referencedColumns: ["id"];
					},
				];
			};
			task_packages: {
				Row: {
					created_at: string | null;
					id: string;
					order_package_id: string;
					task_log_id: string | null;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					order_package_id: string;
					task_log_id?: string | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					order_package_id?: string;
					task_log_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "task_packages_order_package_id_fkey";
						columns: ["order_package_id"];
						isOneToOne: false;
						referencedRelation: "order_packages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "task_packages_task_log_id_fkey";
						columns: ["task_log_id"];
						isOneToOne: false;
						referencedRelation: "task_logs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "task_packages_task_log_id_fkey";
						columns: ["task_log_id"];
						isOneToOne: false;
						referencedRelation: "task_status_view";
						referencedColumns: ["task_log_id"];
					},
				];
			};
			tasks: {
				Row: {
					created_at: string | null;
					description: string | null;
					id: string;
					name: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			temporary_privileges: {
				Row: {
					created_at: string | null;
					expires_at: string;
					granted_at: string | null;
					granted_by: string;
					granted_role_id: string;
					id: string;
					is_active: boolean | null;
					reason: string | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					expires_at: string;
					granted_at?: string | null;
					granted_by: string;
					granted_role_id: string;
					id?: string;
					is_active?: boolean | null;
					reason?: string | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					expires_at?: string;
					granted_at?: string | null;
					granted_by?: string;
					granted_role_id?: string;
					id?: string;
					is_active?: boolean | null;
					reason?: string | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "temporary_privileges_granted_by_fkey";
						columns: ["granted_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "temporary_privileges_granted_by_fkey";
						columns: ["granted_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "temporary_privileges_granted_by_fkey";
						columns: ["granted_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "temporary_privileges_granted_role_id_fkey";
						columns: ["granted_role_id"];
						isOneToOne: false;
						referencedRelation: "roles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "temporary_privileges_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "temporary_privileges_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "temporary_privileges_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
				];
			};
			transportation: {
				Row: {
					cost_per_unit: number | null;
					created_at: string | null;
					distance_km: number | null;
					id: string;
					notes: string | null;
					order_id: string;
					recorded_by: string | null;
					total_cost: number;
					transport_date: string;
					unit_id: string | null;
					updated_at: string | null;
					vehicle_type: string | null;
				};
				Insert: {
					cost_per_unit?: number | null;
					created_at?: string | null;
					distance_km?: number | null;
					id?: string;
					notes?: string | null;
					order_id: string;
					recorded_by?: string | null;
					total_cost: number;
					transport_date: string;
					unit_id?: string | null;
					updated_at?: string | null;
					vehicle_type?: string | null;
				};
				Update: {
					cost_per_unit?: number | null;
					created_at?: string | null;
					distance_km?: number | null;
					id?: string;
					notes?: string | null;
					order_id?: string;
					recorded_by?: string | null;
					total_cost?: number;
					transport_date?: string;
					unit_id?: string | null;
					updated_at?: string | null;
					vehicle_type?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "transportation_order_id_fkey";
						columns: ["order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "transportation_recorded_by_fkey";
						columns: ["recorded_by"];
						isOneToOne: false;
						referencedRelation: "packer_availability_status";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "transportation_recorded_by_fkey";
						columns: ["recorded_by"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "transportation_recorded_by_fkey";
						columns: ["recorded_by"];
						isOneToOne: false;
						referencedRelation: "user_effective_permissions";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "transportation_unit_id_fkey";
						columns: ["unit_id"];
						isOneToOne: false;
						referencedRelation: "units_of_measure";
						referencedColumns: ["id"];
					},
				];
			};
			units_of_measure: {
				Row: {
					created_at: string | null;
					description: string | null;
					id: string;
					name: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					name?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			packer_availability_status: {
				Row: {
					current_order_id: string | null;
					current_order_name: string | null;
					full_name: string | null;
					id: string | null;
					packer_status: string | null;
					status_description: string | null;
					username: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "profiles_current_order_id_fkey";
						columns: ["current_order_id"];
						isOneToOne: false;
						referencedRelation: "orders";
						referencedColumns: ["id"];
					},
				];
			};
			task_status_view: {
				Row: {
					assigned_packers: Json | null;
					duration_minutes: number | null;
					end_time: string | null;
					linked_packages: Json | null;
					notes: string | null;
					overall_status: string | null;
					pause_duration: number | null;
					restart_time: string | null;
					start_time: string | null;
					task_description: string | null;
					task_log_id: string | null;
					task_name: string | null;
					update_counter: number | null;
				};
				Relationships: [];
			};
			user_effective_permissions: {
				Row: {
					active_temp_privileges: Json[] | null;
					base_can_ban_users: boolean | null;
					base_can_block_users: boolean | null;
					base_can_delete_profiles: boolean | null;
					base_can_manage_roles: boolean | null;
					base_can_reset_passwords: boolean | null;
					base_can_unblock_users: boolean | null;
					base_role: string | null;
					effective_can_ban_users: boolean | null;
					effective_can_block_users: boolean | null;
					effective_can_delete_profiles: boolean | null;
					effective_can_manage_roles: boolean | null;
					effective_can_reset_passwords: boolean | null;
					effective_can_unblock_users: boolean | null;
					full_name: string | null;
					id: string | null;
					packer_status: string | null;
					status: string | null;
					username: string | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			add_team_lead: {
				Args: { order_uuid: string; packer_uuid: string };
				Returns: undefined;
			};
			admin_force_release_packer: {
				Args: { packer_uuid: string };
				Returns: Json;
			};
			approve_material_request: {
				Args: {
					p_admin_notes?: string;
					p_request_id: string;
					p_reviewed_by: string;
				};
				Returns: string;
			};
			approve_material_variant_request: {
				Args: {
					p_admin_notes?: string;
					p_request_id: string;
					p_reviewed_by: string;
				};
				Returns: string;
			};
			approve_supplier_pricing_request: {
				Args: {
					p_admin_notes?: string;
					p_request_id: string;
					p_reviewed_by: string;
				};
				Returns: string;
			};
			assign_packers_to_order: {
				Args: { order_uuid: string; packer_ids: string[] };
				Returns: boolean;
			};
			assign_team_lead: {
				Args: { order_uuid: string; packer_uuid: string };
				Returns: undefined;
			};
			can_be_project_lead: { Args: { user_uuid: string }; Returns: boolean };
			can_record_attendance: {
				Args: {
					order_uuid: string;
					packer_uuid: string;
					shift_period_param: string;
				};
				Returns: boolean;
			};
			can_resume_task: { Args: { task_log_id: string }; Returns: Json };
			can_user_mark_attendance: {
				Args: { order_uuid: string };
				Returns: boolean;
			};
			complete_assignments_for_packers: {
				Args: { order_uuid: string; packer_ids: string[] };
				Returns: Json;
			};
			complete_task: { Args: { task_log_id: string }; Returns: Json };
			count_order_team_leads: { Args: { order_uuid: string }; Returns: number };
			deactivate_expired_privileges: { Args: never; Returns: undefined };
			debug_user_info: {
				Args: never;
				Returns: {
					has_access: boolean;
					user_id: string;
					user_role: string;
				}[];
			};
			decrement_item_packed_qty: {
				Args: { amount: number; item_id: string };
				Returns: undefined;
			};
			delete_order_cascade: {
				Args: { order_uuid: string };
				Returns: undefined;
			};
			delete_tasks_for_order_packages: {
				Args: { package_ids: string[] };
				Returns: undefined;
			};
			get_active_tasks_for_packers: {
				Args: { order_uuid: string; packer_ids: string[] };
				Returns: {
					package_numbers: string[];
					packer_id: string;
					task_log_id: string;
					task_name: string;
					task_status: string;
				}[];
			};
			get_all_packers_with_status: {
				Args: never;
				Returns: {
					current_order_id: string;
					current_order_name: string;
					full_name: string;
					id: string;
					packer_status: string;
					username: string;
				}[];
			};
			get_available_packers: {
				Args: never;
				Returns: {
					full_name: string;
					id: string;
					packer_status: string;
					username: string;
				}[];
			};
			get_busy_packers: {
				Args: never;
				Returns: {
					current_order_id: string;
					current_order_name: string;
					full_name: string;
					id: string;
					username: string;
				}[];
			};
			get_order_packers: {
				Args: { order_uuid: string };
				Returns: {
					assigned_at: string;
					full_name: string;
					packer_id: string;
					packer_status: string;
					username: string;
				}[];
			};
			get_order_progress: {
				Args: { order_uuid: string };
				Returns: {
					completed_boxes: number;
					completion_percentage: number;
					total_boxes: number;
					total_packages: number;
				}[];
			};
			get_order_team_leads: {
				Args: { order_uuid: string };
				Returns: {
					full_name: string;
					packer_id: string;
					username: string;
				}[];
			};
			get_packer_assignment_status: {
				Args: never;
				Returns: {
					active_orders: number;
					active_sessions: number;
					active_tasks: number;
					current_order_id: string;
					current_order_name: string;
					full_name: string;
					open_attendance: number;
					packer_id: string;
					packer_status: string;
					username: string;
				}[];
			};
			get_user_email_by_username: {
				Args: { lookup_username: string };
				Returns: string;
			};
			get_user_role: { Args: never; Returns: string };
			increment_item_packed_qty: {
				Args: { amount: number; item_id: string };
				Returns: undefined;
			};
			is_team_lead_for_order: {
				Args: { order_uuid: string; user_id: string };
				Returns: boolean;
			};
			mark_order_package_packed: {
				Args: { op_id: string };
				Returns: undefined;
			};
			order_has_team_lead: { Args: { order_uuid: string }; Returns: boolean };
			packer_logged_attendance_today: {
				Args: { order_uuid: string };
				Returns: boolean;
			};
			packer_needs_daily_attendance: {
				Args: { check_date?: string; order_uuid: string; packer_uuid: string };
				Returns: boolean;
			};
			pause_task: { Args: { task_log_id: string }; Returns: Json };
			refresh_order_pkg_overview_rollup: {
				Args: { p_overview_id: string };
				Returns: undefined;
			};
			reject_material_request: {
				Args: {
					p_admin_notes?: string;
					p_request_id: string;
					p_reviewed_by: string;
				};
				Returns: undefined;
			};
			reject_material_variant_request: {
				Args: {
					p_admin_notes?: string;
					p_request_id: string;
					p_reviewed_by: string;
				};
				Returns: undefined;
			};
			reject_supplier_pricing_request: {
				Args: {
					p_admin_notes?: string;
					p_request_id: string;
					p_reviewed_by: string;
				};
				Returns: undefined;
			};
			remove_self_from_order: {
				Args: { order_uuid: string; packer_uuid: string };
				Returns: Json;
			};
			remove_team_lead: {
				Args: { order_uuid: string; packer_uuid: string };
				Returns: undefined;
			};
			resume_task: { Args: { task_log_id: string }; Returns: Json };
			unpack_order_package: { Args: { op_id: string }; Returns: undefined };
			unpause_task: {
				Args: { pause_duration_seconds?: number; task_log_id: string };
				Returns: Json;
			};
			update_project_lead_with_status: {
				Args: { lead_id: string; order_uuid: string };
				Returns: undefined;
			};
			user_assigned_to_order: {
				Args: { order_uuid: string };
				Returns: boolean;
			};
			user_has_permission: {
				Args: { permission_name: string };
				Returns: boolean;
			};
			validate_box_completion: { Args: { op_id: string }; Returns: Json };
		};
		Enums: {
			maintenance_package_type: "defensor" | "standard_box";
			maintenance_task_category: "survey" | "unpack" | "repack";
			maintenance_task_status:
				| "pending"
				| "in_progress"
				| "completed"
				| "skipped";
			material_type:
				| "Accessories"
				| "Securing"
				| "Gas Packing"
				| "Vacuum Packing"
				| "Body"
				| "Big Sides"
				| "Small Sides"
				| "Lid"
				| "Base"
				| "Additional Wood"
				| "Defensor"
				| "Heatshrink";
			MediaCategory:
				| "package"
				| "task"
				| "accessory"
				| "service"
				| "big_side"
				| "small_side"
				| "lid"
				| "base"
				| "item"
				| "vacuum_packing"
				| "gas_packing"
				| "maint_survey"
				| "maint_repack"
				| "maint_unpack"
				| "maint-temp-1"
				| "maint-temp";
			packer_status: "available" | "busy" | "break";
			project_type: "standard" | "maintenance" | "survey";
			request_action: "approved" | "rejected";
			request_type: "material" | "material_variant" | "supplier_pricing";
			securing_side: "big_sides" | "small_sides" | "lid" | "base";
			task_status: "in_progress" | "paused" | "completed";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			maintenance_package_type: ["defensor", "standard_box"],
			maintenance_task_category: ["survey", "unpack", "repack"],
			maintenance_task_status: [
				"pending",
				"in_progress",
				"completed",
				"skipped",
			],
			material_type: [
				"Accessories",
				"Securing",
				"Gas Packing",
				"Vacuum Packing",
				"Body",
				"Big Sides",
				"Small Sides",
				"Lid",
				"Base",
				"Additional Wood",
				"Defensor",
				"Heatshrink",
			],
			MediaCategory: [
				"package",
				"task",
				"accessory",
				"service",
				"big_side",
				"small_side",
				"lid",
				"base",
				"item",
				"vacuum_packing",
				"gas_packing",
				"maint_survey",
				"maint_repack",
				"maint_unpack",
				"maint-temp-1",
				"maint-temp",
			],
			packer_status: ["available", "busy", "break"],
			project_type: ["standard", "maintenance", "survey"],
			request_action: ["approved", "rejected"],
			request_type: ["material", "material_variant", "supplier_pricing"],
			securing_side: ["big_sides", "small_sides", "lid", "base"],
			task_status: ["in_progress", "paused", "completed"],
		},
	},
} as const;
