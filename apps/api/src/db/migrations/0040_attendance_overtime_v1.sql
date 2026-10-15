CREATE TABLE IF NOT EXISTS `attendance_overtime_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`policy_name` varchar(100) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`description` varchar(500),
	`scope` enum('company','department','employee') NOT NULL DEFAULT 'company',
	`scope_id` varchar(64),
	`overrides_priority` int NOT NULL DEFAULT 0,
	`effective_from` varchar(10) NOT NULL,
	`effective_to` varchar(10),
	`is_enabled` boolean NOT NULL DEFAULT true,
	`eligible_employment_types` json,
	`eligible_departments` json,
	`workday_eligibility` json,
	`minimum_qualifying_minutes` int NOT NULL DEFAULT 30,
	`daily_cap_minutes` int NOT NULL DEFAULT 240,
	`weekly_cap_minutes` int NOT NULL DEFAULT 720,
	`monthly_cap_minutes` int NOT NULL DEFAULT 2400,
	`rounding_rule` enum('exact','round_down_15','round_nearest_15','round_down_30','round_nearest_30') NOT NULL DEFAULT 'round_down_15',
	`requires_pre_approval` boolean NOT NULL DEFAULT false,
	`submission_window_days` int NOT NULL DEFAULT 14,
	`allow_payable` boolean NOT NULL DEFAULT true,
	`allow_comp_off` boolean NOT NULL DEFAULT true,
	`default_settlement_preference` enum('payable','comp_off') NOT NULL DEFAULT 'payable',
	`approval_hierarchy` varchar(50) NOT NULL DEFAULT 'manager_then_hr',
	`statutory_rules` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_overtime_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_ot_pol_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_overtime_requests` (
	`id` varchar(64) NOT NULL,
	`request_number` varchar(32) NOT NULL DEFAULT '',
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`work_date` varchar(10) NOT NULL,
	`day_type` enum('regular','weekly_off','holiday') NOT NULL DEFAULT 'regular',
	`source_record_type` varchar(50) NOT NULL DEFAULT 'daily_attendance',
	`source_record_id` varchar(64),
	`policy_id` varchar(64),
	`policy_version` int NOT NULL DEFAULT 1,
	`scheduled_minutes` int NOT NULL DEFAULT 480,
	`actual_worked_minutes` int NOT NULL DEFAULT 0,
	`extra_worked_minutes` int NOT NULL DEFAULT 0,
	`eligible_ot_minutes` int NOT NULL DEFAULT 0,
	`requested_ot_minutes` int NOT NULL DEFAULT 0,
	`approved_ot_minutes` int NOT NULL DEFAULT 0,
	`allocated_payable_minutes` int NOT NULL DEFAULT 0,
	`allocated_comp_off_minutes` int NOT NULL DEFAULT 0,
	`unallocated_minutes` int NOT NULL DEFAULT 0,
	`source_intervals` json,
	`reason` varchar(500) NOT NULL,
	`location_or_site` varchar(255),
	`task_or_project` varchar(255),
	`evidence_attachments` json,
	`status` enum('draft','submitted','pending_approval','approved','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'submitted',
	`settlement_status` enum('unallocated','partially_allocated','fully_allocated','pending_handoff','settled','reversal_pending','reversed') NOT NULL DEFAULT 'unallocated',
	`current_stage` varchar(50) NOT NULL DEFAULT 'pending_manager',
	`assigned_to` varchar(64),
	`assigned_at` timestamp NULL,
	`assigned_role` varchar(50),
	`submitted_at` timestamp NULL,
	`submitted_by_user_id` varchar(64),
	`reviewed_by_user_id` varchar(64),
	`reviewed_at` timestamp NULL,
	`review_decision` enum('approved','rejected'),
	`review_notes` varchar(500),
	`cancellation_reason` varchar(500),
	`withdrawal_reason` varchar(500),
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_overtime_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_ot_req_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_ot_req_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_overtime_settlements` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`allocation_type` enum('payable','comp_off') NOT NULL,
	`allocated_minutes` int NOT NULL,
	`status` enum('pending_handoff','exported_to_payroll','credited_to_comp_off','reversed','rejected') NOT NULL DEFAULT 'pending_handoff',
	`batch_reference` varchar(100),
	`allocated_by_user_id` varchar(64),
	`allocated_at` timestamp NOT NULL DEFAULT (now()),
	`notes` varchar(500),
	`reversal_reason` varchar(500),
	`reversed_by_user_id` varchar(64),
	`reversed_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_overtime_settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_ot_set_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_ot_set_request` FOREIGN KEY (`request_id`) REFERENCES `attendance_overtime_requests`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_att_ot_set_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_overtime_audits` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`action` varchar(50) NOT NULL,
	`from_status` varchar(50),
	`to_status` varchar(50),
	`performed_by_user_id` varchar(64) NOT NULL,
	`performed_by_role` varchar(50),
	`details` json,
	`client_ip` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_overtime_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_ot_aud_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_pol_tenant_comp` ON `attendance_overtime_policies` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_pol_scope` ON `attendance_overtime_policies` (`scope`, `scope_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_pol_effective` ON `attendance_overtime_policies` (`effective_from`, `status`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_req_tenant_comp_date` ON `attendance_overtime_requests` (`tenant_id`, `company_id`, `work_date`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_req_emp_date` ON `attendance_overtime_requests` (`employee_id`, `work_date`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_req_status` ON `attendance_overtime_requests` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_req_assigned` ON `attendance_overtime_requests` (`assigned_to`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_req_settlement` ON `attendance_overtime_requests` (`settlement_status`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_set_tenant_comp` ON `attendance_overtime_settlements` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_set_req` ON `attendance_overtime_settlements` (`request_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_set_emp` ON `attendance_overtime_settlements` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_set_status` ON `attendance_overtime_settlements` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_aud_tenant_comp_req` ON `attendance_overtime_audits` (`tenant_id`, `company_id`, `request_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ot_aud_created` ON `attendance_overtime_audits` (`created_at`);
