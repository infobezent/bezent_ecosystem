CREATE TABLE IF NOT EXISTS `workforce_general_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`generation_mode` enum('automatic','manual') NOT NULL DEFAULT 'automatic',
	`id_prefix` varchar(32) NOT NULL DEFAULT 'EMP-',
	`id_suffix` varchar(32),
	`sequence_length` int NOT NULL DEFAULT 4,
	`starting_number` int NOT NULL DEFAULT 1001,
	`current_counter` int NOT NULL DEFAULT 1000,
	`reset_frequency` enum('never','calendar_year','financial_year') NOT NULL DEFAULT 'never',
	`allow_manual_override` boolean NOT NULL DEFAULT true,
	`prevent_id_reuse` boolean NOT NULL DEFAULT true,
	`auto_provision_user` boolean NOT NULL DEFAULT true,
	`activation_timing` enum('instant','joining_date','manual') NOT NULL DEFAULT 'instant',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_general_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_general_company` UNIQUE(`company_id`),
	INDEX `idx_workforce_general_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `workforce_general_settings_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workforce_employment_types` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`work_hours_per_week` decimal(4,1) NOT NULL DEFAULT '40.0',
	`is_benefits_eligible` boolean NOT NULL DEFAULT true,
	`default_notice_days` int NOT NULL DEFAULT 60,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_employment_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_emp_type_comp_code` UNIQUE(`company_id`,`code`),
	INDEX `idx_workforce_emp_type_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `workforce_employment_types_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workforce_probation_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`default_probation_days` int NOT NULL DEFAULT 90,
	`confirmation_mode` enum('manager_review','auto_confirm') NOT NULL DEFAULT 'manager_review',
	`reminder_lead_days` int NOT NULL DEFAULT 14,
	`max_extension_days` int NOT NULL DEFAULT 90,
	`max_extensions_allowed` int NOT NULL DEFAULT 1,
	`auto_generate_letter` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_probation_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_probation_company` UNIQUE(`company_id`),
	INDEX `idx_workforce_probation_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `workforce_probation_policies_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workforce_lifecycle_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`require_releasing_manager_approval` boolean NOT NULL DEFAULT true,
	`effective_date_alignment` enum('immediate','next_payroll_month','custom') NOT NULL DEFAULT 'next_payroll_month',
	`auto_reassign_shifts` boolean NOT NULL DEFAULT true,
	`auto_reassign_leave_approver` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_lifecycle_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_lifecycle_company` UNIQUE(`company_id`),
	INDEX `idx_workforce_lifecycle_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `workforce_lifecycle_policies_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workforce_offboarding_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`probation_notice_days` int NOT NULL DEFAULT 15,
	`confirmed_notice_days` int NOT NULL DEFAULT 60,
	`leadership_notice_days` int NOT NULL DEFAULT 90,
	`allow_notice_buyout` boolean NOT NULL DEFAULT true,
	`allow_leave_offset` boolean NOT NULL DEFAULT true,
	`resignation_withdrawal_window_days` int NOT NULL DEFAULT 7,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_offboarding_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_offboarding_company` UNIQUE(`company_id`),
	INDEX `idx_workforce_offboarding_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `workforce_offboarding_policies_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workforce_clearance_checklist_templates` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`department` enum('it','admin','finance','hr') NOT NULL,
	`item_title` varchar(255) NOT NULL,
	`description` text,
	`is_mandatory` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workforce_clearance_checklist_templates_id` PRIMARY KEY(`id`),
	INDEX `idx_workforce_clearance_comp_dept` (`company_id`,`department`),
	CONSTRAINT `workforce_clearance_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action
);
