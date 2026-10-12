CREATE TABLE `attendance_punches` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`punch_time` timestamp NOT NULL,
	`punch_type` enum('in','out','break_in','break_out','auto') NOT NULL DEFAULT 'in',
	`source` enum('web','mobile','biometric','manual','api') NOT NULL DEFAULT 'web',
	`device_metadata` json,
	`work_location` varchar(100) NOT NULL DEFAULT 'office',
	`notes` varchar(500),
	`is_duplicate` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_punches_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_punches_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `attendance_punches_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_punches_tenant_comp` ON `attendance_punches` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_punches_employee` ON `attendance_punches` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_punches_time` ON `attendance_punches` (`punch_time`);
--> statement-breakpoint
CREATE TABLE `attendance_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`policy_name` varchar(100) NOT NULL,
	`capture_methods` json NOT NULL,
	`grace_period_minutes` int NOT NULL DEFAULT 15,
	`half_day_threshold_hours` decimal(4,2) NOT NULL DEFAULT '4.00',
	`full_day_threshold_hours` decimal(4,2) NOT NULL DEFAULT '8.00',
	`missing_punch_policy` enum('mark_absent','half_day','flag_exception','none') NOT NULL DEFAULT 'flag_exception',
	`allow_regularization` boolean NOT NULL DEFAULT true,
	`regularization_cutoff_days` int NOT NULL DEFAULT 7,
	`requires_approval` boolean NOT NULL DEFAULT true,
	`effective_from` varchar(10) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_policies_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_policy_tenant_comp` ON `attendance_policies` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_policy_active` ON `attendance_policies` (`is_active`);
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `worked_minutes` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `late_minutes` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `early_minutes` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `is_late` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `is_early_exit` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `is_missing_punch` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `is_regularized` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `shift_schedule_ref` varchar(100);
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `calculation_metadata` json;
