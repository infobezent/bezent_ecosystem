CREATE TABLE `employee_action_history` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`action_id` varchar(64) NOT NULL,
	`event` enum('created','updated','applied','cancelled') NOT NULL,
	`from_status` varchar(20),
	`to_status` varchar(20) NOT NULL,
	`notes` varchar(1000),
	`actor` varchar(64),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_action_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_actions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`action_type` enum('department_change','designation_change','reporting_manager_change','employment_type_change','confirm_employee','extend_probation','location_transfer','employment_status_change','resignation','termination') NOT NULL,
	`status` enum('pending','applied','cancelled') NOT NULL DEFAULT 'pending',
	`effective_date` varchar(10) NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`change_data` json NOT NULL,
	`requested_by` varchar(64),
	`cancellation_reason` varchar(1000),
	`applied_at` timestamp,
	`cancelled_at` timestamp,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employees` MODIFY COLUMN `employment_status` enum('active','probation','notice','terminated','suspended','resigned') NOT NULL DEFAULT 'probation';--> statement-breakpoint
ALTER TABLE `employees` ADD `reporting_manager_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employees` ADD `probation_end_date` varchar(10);--> statement-breakpoint
ALTER TABLE `employees` ADD `confirmation_date` varchar(10);--> statement-breakpoint
ALTER TABLE `employees` ADD `last_working_date` varchar(10);--> statement-breakpoint
ALTER TABLE `employee_action_history` ADD CONSTRAINT `employee_action_history_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_action_history` ADD CONSTRAINT `employee_action_history_action_id_employee_actions_id_fk` FOREIGN KEY (`action_id`) REFERENCES `employee_actions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_actions` ADD CONSTRAINT `employee_actions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_actions` ADD CONSTRAINT `employee_actions_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_employee_action_history_tenant_company` ON `employee_action_history` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_action_history_action` ON `employee_action_history` (`action_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_actions_tenant_company` ON `employee_actions` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_actions_employee` ON `employee_actions` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_actions_type_status` ON `employee_actions` (`action_type`,`status`);--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_reporting_manager_id_employees_id_fk` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_employees_reporting_manager` ON `employees` (`reporting_manager_id`);