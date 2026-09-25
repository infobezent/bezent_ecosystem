CREATE TABLE `employees` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_number` varchar(50) NOT NULL,
	`user_id` varchar(64),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100),
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`department_id` varchar(64),
	`designation_id` varchar(64),
	`location_id` varchar(64),
	`joining_date` varchar(10) NOT NULL,
	`confirmed_joining_date` varchar(10),
	`employment_type` enum('full_time','part_time','contract','intern') NOT NULL DEFAULT 'full_time',
	`employment_status` enum('active','probation','notice','terminated','suspended') NOT NULL DEFAULT 'probation',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_employees_company_emp_no` UNIQUE(`tenant_id`,`company_id`,`employee_number`)
);
--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_designation_id_designations_id_fk` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_employees_tenant_company` ON `employees` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_email` ON `employees` (`tenant_id`,`company_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_employees_department` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_designation` ON `employees` (`designation_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_location` ON `employees` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_employees_user_id` ON `employees` (`user_id`);