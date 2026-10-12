ALTER TABLE `employee_attendance` MODIFY COLUMN `status` enum('present','absent','half_day','on_leave','holiday','incomplete') NOT NULL DEFAULT 'present';
--> statement-breakpoint
ALTER TABLE `employee_attendance` ADD `processing_state` enum('incomplete','pending_review','provisional','finalized','locked') NOT NULL DEFAULT 'finalized';
--> statement-breakpoint
CREATE TABLE `attendance_on_duty_requests` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`od_type_id` varchar(64) NOT NULL,
	`od_type_name` varchar(100) NOT NULL,
	`start_date` varchar(10) NOT NULL,
	`end_date` varchar(10) NOT NULL,
	`start_time` varchar(8),
	`end_time` varchar(8),
	`duration_type` enum('full_day','half_day','hourly','multi_day') NOT NULL DEFAULT 'full_day',
	`half_day_session` enum('first_half','second_half'),
	`duration_hours` decimal(4,2) DEFAULT '8.00',
	`reason` varchar(500) NOT NULL,
	`location_or_site` varchar(255),
	`attachment_url` varchar(500),
	`status` enum('draft','submitted','approved','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'submitted',
	`current_stage` varchar(50) NOT NULL DEFAULT 'pending_manager',
	`submitted_at` timestamp,
	`submitted_by_user_id` varchar(64),
	`reviewed_by_user_id` varchar(64),
	`reviewed_at` timestamp,
	`decision_reason` varchar(500),
	`withdrawn_at` timestamp,
	`withdrawn_reason` varchar(500),
	`cancelled_at` timestamp,
	`cancelled_reason` varchar(500),
	`effective_policy_version` int NOT NULL DEFAULT 1,
	`audit_metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_on_duty_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_on_duty_requests_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `attendance_on_duty_requests_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_att_od_tenant_company` ON `attendance_on_duty_requests` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_od_employee` ON `attendance_on_duty_requests` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_od_dates` ON `attendance_on_duty_requests` (`start_date`,`end_date`);
--> statement-breakpoint
CREATE INDEX `idx_att_od_status` ON `attendance_on_duty_requests` (`status`);
