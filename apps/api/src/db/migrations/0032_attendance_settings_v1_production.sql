ALTER TABLE `attendance_policies` ADD `version` int NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `status` enum('draft','published','archived') NOT NULL DEFAULT 'published';
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `description` varchar(500);
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `scope` enum('company','department','employee') NOT NULL DEFAULT 'company';
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `scope_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `overrides_priority` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `break_deduction_method` enum('scheduled','actual','none') NOT NULL DEFAULT 'scheduled';
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `enable_late_tracking` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `enable_early_exit_tracking` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `penalty_rules` json;
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `od_rules` json;
--> statement-breakpoint
ALTER TABLE `attendance_policies` ADD `classification_rules` json;
--> statement-breakpoint
CREATE INDEX `idx_att_policy_scope` ON `attendance_policies` (`scope`,`scope_id`);
--> statement-breakpoint
CREATE TABLE `attendance_general_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`timezone` varchar(100) NOT NULL DEFAULT 'UTC',
	`day_boundary_time` varchar(8) NOT NULL DEFAULT '00:00:00',
	`tracking_start_date` varchar(10) NOT NULL DEFAULT '2026-01-01',
	`processing_mode` enum('realtime','daily_batch','manual') NOT NULL DEFAULT 'realtime',
	`manual_entry_allowed` boolean NOT NULL DEFAULT true,
	`employee_visibility` enum('self_only','department','company') NOT NULL DEFAULT 'self_only',
	`default_history_view_days` int NOT NULL DEFAULT 30,
	`alert_preferences` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_general_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_general_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_gen_settings_company` ON `attendance_general_settings` (`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_gen_settings_tenant_comp` ON `attendance_general_settings` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_regularization_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`allowed_correction_types` json,
	`submission_window_days` int NOT NULL DEFAULT 7,
	`max_requests_per_month` int NOT NULL DEFAULT 3,
	`require_reason` boolean NOT NULL DEFAULT true,
	`require_evidence` boolean NOT NULL DEFAULT false,
	`approval_hierarchy` enum('manager_only','hr_only','manager_then_hr','auto_approve') NOT NULL DEFAULT 'manager_then_hr',
	`auto_approve_grace_minutes` int NOT NULL DEFAULT 0,
	`block_on_payroll_lock` boolean NOT NULL DEFAULT true,
	`allow_withdrawal` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_regularization_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_regularization_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_reg_settings_company` ON `attendance_regularization_settings` (`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_reg_settings_tenant_comp` ON `attendance_regularization_settings` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_devices` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`location_id` varchar(64),
	`device_name` varchar(100) NOT NULL,
	`device_code` varchar(50) NOT NULL,
	`device_type` enum('biometric_fingerprint','biometric_facial','rfid_card','mobile_kiosk','web_terminal') NOT NULL DEFAULT 'biometric_fingerprint',
	`serial_number` varchar(100),
	`ip_address` varchar(45),
	`port` int,
	`status` enum('online','offline','disabled','testing') NOT NULL DEFAULT 'offline',
	`last_heartbeat_at` timestamp,
	`firmware_version` varchar(50),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_devices_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `attendance_devices_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_devices_company_code` ON `attendance_devices` (`company_id`,`device_code`);
--> statement-breakpoint
CREATE INDEX `idx_att_devices_tenant_comp` ON `attendance_devices` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_import_batches` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`batch_type` enum('raw_punches','historical_summary') NOT NULL DEFAULT 'raw_punches',
	`file_name` varchar(255) NOT NULL,
	`total_rows` int NOT NULL DEFAULT 0,
	`success_rows` int NOT NULL DEFAULT 0,
	`failed_rows` int NOT NULL DEFAULT 0,
	`duplicate_rows` int NOT NULL DEFAULT 0,
	`status` enum('pending','processing','completed','reversed','failed') NOT NULL DEFAULT 'completed',
	`imported_by_user_id` varchar(64),
	`column_mapping` json,
	`error_log` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_import_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_import_batches_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_import_tenant_comp` ON `attendance_import_batches` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_security_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`enable_gps` boolean NOT NULL DEFAULT true,
	`geofence_configs` json,
	`ip_allowlist` json,
	`enforce_ip_restriction` boolean NOT NULL DEFAULT false,
	`max_devices_per_employee` int NOT NULL DEFAULT 2,
	`allow_shared_kiosk` boolean NOT NULL DEFAULT true,
	`detect_mock_location` boolean NOT NULL DEFAULT true,
	`detect_impossible_travel` boolean NOT NULL DEFAULT true,
	`rapid_punch_throttling_seconds` int NOT NULL DEFAULT 60,
	`flag_vpn_proxy` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_security_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_security_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_sec_settings_company` ON `attendance_security_settings` (`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_sec_settings_tenant_comp` ON `attendance_security_settings` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_payroll_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`cycle_type` enum('calendar_month','custom_cutoff') NOT NULL DEFAULT 'calendar_month',
	`cutoff_day` int NOT NULL DEFAULT 30,
	`require_approval_before_lock` boolean NOT NULL DEFAULT true,
	`auto_lock_on_cutoff` boolean NOT NULL DEFAULT false,
	`blocking_severity` enum('hard_block','warning_only') NOT NULL DEFAULT 'warning_only',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_payroll_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_payroll_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_pay_settings_company` ON `attendance_payroll_settings` (`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_pay_settings_tenant_comp` ON `attendance_payroll_settings` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_periods` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`period_code` varchar(20) NOT NULL,
	`start_date` varchar(10) NOT NULL,
	`end_date` varchar(10) NOT NULL,
	`status` enum('open','locked','finalized') NOT NULL DEFAULT 'open',
	`locked_at` timestamp,
	`locked_by_user_id` varchar(64),
	`finalized_at` timestamp,
	`finalized_by_user_id` varchar(64),
	`unlocked_at` timestamp,
	`unlocked_by_user_id` varchar(64),
	`unlock_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_periods_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_periods_comp_code` ON `attendance_periods` (`company_id`,`period_code`);
--> statement-breakpoint
CREATE INDEX `idx_att_periods_tenant_comp` ON `attendance_periods` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_payroll_handover_batches` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`period_id` varchar(64) NOT NULL,
	`batch_number` varchar(50) NOT NULL,
	`total_employees` int NOT NULL DEFAULT 0,
	`total_payable_days` decimal(8,2) NOT NULL DEFAULT '0.00',
	`total_deduction_units` decimal(8,2) NOT NULL DEFAULT '0.00',
	`exported_format` enum('csv','json','api_push') NOT NULL DEFAULT 'csv',
	`status` enum('generated','transferred','reconciled') NOT NULL DEFAULT 'generated',
	`generated_by_user_id` varchar(64),
	`summary_snapshot` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_payroll_handover_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_payroll_handover_batches_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `attendance_payroll_handover_batches_period_id_fk` FOREIGN KEY (`period_id`) REFERENCES `attendance_periods`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_handover_tenant_comp` ON `attendance_payroll_handover_batches` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `attendance_settings_audit_logs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`category` enum('general','policy','regularization','capture_device','location_security','payroll_locking') NOT NULL,
	`action` varchar(50) NOT NULL,
	`entity_id` varchar(64),
	`entity_type` varchar(50),
	`previous_values` json,
	`new_values` json,
	`changed_by_user_id` varchar(64),
	`client_ip` varchar(45),
	`user_agent` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_settings_audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_settings_audit_logs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_audit_tenant_comp` ON `attendance_settings_audit_logs` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_audit_cat` ON `attendance_settings_audit_logs` (`category`);
--> statement-breakpoint
CREATE INDEX `idx_att_audit_created` ON `attendance_settings_audit_logs` (`created_at`);
