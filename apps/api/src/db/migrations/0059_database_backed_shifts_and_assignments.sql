CREATE TABLE `hrms_shifts` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`start_time` varchar(5) NOT NULL,
	`end_time` varchar(5) NOT NULL,
	`working_days` json NOT NULL,
	`break_minutes` int NOT NULL DEFAULT 60,
	`lunch_minutes` int NOT NULL DEFAULT 30,
	`grace_minutes` int NOT NULL DEFAULT 15,
	`is_overnight` boolean NOT NULL DEFAULT false,
	`color` varchar(20) DEFAULT '#2563EB',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(64),
	`updated_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hrms_shifts_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_hrms_shifts_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hrms_shifts_comp_code` ON `hrms_shifts` (`company_id`,`code`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shifts_tenant_comp` ON `hrms_shifts` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shifts_comp_active` ON `hrms_shifts` (`company_id`,`is_active`);
--> statement-breakpoint
CREATE TABLE `hrms_shift_assignments` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`shift_id` varchar(64) NOT NULL,
	`assignment_scope` enum('employee','department','location') NOT NULL,
	`employee_id` varchar(64),
	`department_id` varchar(64),
	`location_id` varchar(64),
	`effective_start_date` varchar(10) NOT NULL,
	`effective_end_date` varchar(10),
	`is_active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`created_by` varchar(64),
	`updated_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hrms_shift_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_hrms_shift_asgn_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_hrms_shift_asgn_shift` FOREIGN KEY (`shift_id`) REFERENCES `hrms_shifts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_hrms_shift_asgn_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_hrms_shift_asgn_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_hrms_shift_asgn_location` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_tenant_comp` ON `hrms_shift_assignments` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_shift` ON `hrms_shift_assignments` (`shift_id`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_emp` ON `hrms_shift_assignments` (`company_id`,`assignment_scope`,`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_dept` ON `hrms_shift_assignments` (`company_id`,`assignment_scope`,`department_id`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_loc` ON `hrms_shift_assignments` (`company_id`,`assignment_scope`,`location_id`);
--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_dates` ON `hrms_shift_assignments` (`effective_start_date`,`effective_end_date`);
