CREATE TABLE IF NOT EXISTS `attendance_comp_off_policies` (
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
	`eligible_workday_scenarios` json,
	`minimum_qualifying_minutes` int NOT NULL DEFAULT 240,
	`half_day_threshold_minutes` int NOT NULL DEFAULT 240,
	`full_day_threshold_minutes` int NOT NULL DEFAULT 480,
	`conversion_rate` decimal(4,2) NOT NULL DEFAULT '1.00',
	`rounding_rule` enum('exact','round_down_half_day','round_nearest_half_day') NOT NULL DEFAULT 'round_down_half_day',
	`submission_deadline_days` int NOT NULL DEFAULT 14,
	`approval_hierarchy` varchar(50) NOT NULL DEFAULT 'manager_then_hr',
	`validity_days` int NOT NULL DEFAULT 60,
	`max_earning_limit_per_month_days` decimal(4,2) NOT NULL DEFAULT '2.00',
	`allow_carry_forward` boolean NOT NULL DEFAULT false,
	`allow_overtime_conversion` boolean NOT NULL DEFAULT true,
	`statutory_rules` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_comp_off_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_co_pol_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_comp_off_requests` (
	`id` varchar(64) NOT NULL,
	`request_number` varchar(32) NOT NULL DEFAULT '',
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`work_date` varchar(10) NOT NULL,
	`day_type` enum('regular','weekly_off','holiday') NOT NULL DEFAULT 'weekly_off',
	`source_record_type` varchar(50) NOT NULL DEFAULT 'daily_attendance',
	`source_record_id` varchar(64),
	`policy_id` varchar(64),
	`policy_version` int NOT NULL DEFAULT 1,
	`scheduled_minutes` int NOT NULL DEFAULT 0,
	`actual_worked_minutes` int NOT NULL DEFAULT 0,
	`qualifying_worked_minutes` int NOT NULL DEFAULT 0,
	`requested_credit_days` decimal(4,2) NOT NULL DEFAULT '1.00',
	`approved_credit_days` decimal(4,2) NOT NULL DEFAULT '0.00',
	`source_intervals` json,
	`reason` varchar(500) NOT NULL,
	`location_or_site` varchar(255),
	`task_or_project` varchar(255),
	`evidence_attachments` json,
	`status` enum('draft','submitted','pending_approval','approved','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'submitted',
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
	CONSTRAINT `attendance_comp_off_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_co_req_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_co_req_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_comp_off_entitlements` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`work_date` varchar(10) NOT NULL,
	`earned_days` decimal(4,2) NOT NULL,
	`earned_minutes` int NOT NULL,
	`valid_from` varchar(10) NOT NULL,
	`expires_at` varchar(10) NOT NULL,
	`status` enum('active','pending_handoff','credited_to_leave','partially_utilized','fully_utilized','expired','reversed') NOT NULL DEFAULT 'pending_handoff',
	`source_overtime_settlement_id` varchar(64),
	`handoff_id` varchar(64),
	`credited_leave_balance_id` varchar(64),
	`reversal_reason` varchar(500),
	`reversed_by_user_id` varchar(64),
	`reversed_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_comp_off_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_co_ent_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_co_ent_request` FOREIGN KEY (`request_id`) REFERENCES `attendance_comp_off_requests`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_att_co_ent_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_comp_off_handoffs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`entitlement_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`idempotency_key` varchar(100) NOT NULL,
	`credit_days` decimal(4,2) NOT NULL,
	`credit_minutes` int NOT NULL,
	`leave_type_code` varchar(32) NOT NULL DEFAULT 'comp_off',
	`valid_from` varchar(10) NOT NULL,
	`valid_until` varchar(10) NOT NULL,
	`status` enum('pending_handoff','acknowledged','credited','rejected','failed','reversed') NOT NULL DEFAULT 'pending_handoff',
	`payload` json NOT NULL,
	`retry_count` int NOT NULL DEFAULT 0,
	`last_attempt_at` timestamp NULL,
	`response_details` json,
	`acknowledged_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_comp_off_handoffs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_att_co_handoff_idempotency` UNIQUE (`idempotency_key`),
	CONSTRAINT `fk_att_co_han_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_co_han_entitlement` FOREIGN KEY (`entitlement_id`) REFERENCES `attendance_comp_off_entitlements`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_att_co_han_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_comp_off_audits` (
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
	CONSTRAINT `attendance_comp_off_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_co_aud_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_att_co_pol_tenant_comp` ON `attendance_comp_off_policies` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_pol_scope` ON `attendance_comp_off_policies` (`scope`, `scope_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_pol_effective` ON `attendance_comp_off_policies` (`effective_from`, `status`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_req_tenant_comp_date` ON `attendance_comp_off_requests` (`tenant_id`, `company_id`, `work_date`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_req_emp_date` ON `attendance_comp_off_requests` (`employee_id`, `work_date`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_req_status` ON `attendance_comp_off_requests` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_req_assigned` ON `attendance_comp_off_requests` (`assigned_to`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_ent_tenant_comp` ON `attendance_comp_off_entitlements` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_ent_req` ON `attendance_comp_off_entitlements` (`request_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_ent_emp` ON `attendance_comp_off_entitlements` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_ent_status` ON `attendance_comp_off_entitlements` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_han_tenant_comp` ON `attendance_comp_off_handoffs` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_han_ent` ON `attendance_comp_off_handoffs` (`entitlement_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_han_emp` ON `attendance_comp_off_handoffs` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_han_status` ON `attendance_comp_off_handoffs` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_att_co_aud_tenant_comp_req` ON `attendance_comp_off_audits` (`tenant_id`, `company_id`, `request_id`);
