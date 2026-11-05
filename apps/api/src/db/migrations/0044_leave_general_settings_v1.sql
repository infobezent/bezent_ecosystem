CREATE TABLE IF NOT EXISTS `leave_general_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`leave_year_cycle` enum('calendar_year','financial_year','custom') NOT NULL DEFAULT 'calendar_year',
	`custom_year_start_date` varchar(5),
	`go_live_date` varchar(10) NOT NULL,
	`day_counting_method` enum('working_days','calendar_days') NOT NULL DEFAULT 'working_days',
	`balance_precision` enum('whole_numbers','half','two_decimals') NOT NULL DEFAULT 'two_decimals',
	`balance_rounding_rule` enum('nearest','round_up','round_down') NOT NULL DEFAULT 'nearest',
	`max_backdated_days` int NOT NULL DEFAULT 7,
	`max_advance_booking_days` int NOT NULL DEFAULT 180,
	`current_version_number` int NOT NULL DEFAULT 1,
	`status` enum('pre_activation','activated') NOT NULL DEFAULT 'pre_activation',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_general_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_gen_settings_company` UNIQUE(`company_id`),
	INDEX `idx_leave_gen_settings_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `leave_general_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_general_settings_versions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`version_number` int NOT NULL,
	`effective_from` timestamp NOT NULL,
	`change_reason` varchar(500) NOT NULL,
	`settings_payload` json NOT NULL,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_general_settings_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_gen_versions_comp_ver` UNIQUE(`company_id`,`version_number`),
	INDEX `idx_leave_gen_versions_tenant_comp` (`tenant_id`,`company_id`),
	INDEX `idx_leave_gen_versions_effective` (`company_id`,`effective_from`),
	CONSTRAINT `leave_general_settings_versions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE `employee_leave_requests`
	ADD COLUMN `session` enum('first_half','second_half') AFTER `total_days`,
	ADD COLUMN `calculation_snapshot` json AFTER `session`;
