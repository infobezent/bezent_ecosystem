CREATE TABLE `business_units` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`description` varchar(1000),
	`head_employee_id` varchar(64),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_units_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_units_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `business_units_head_employee_id_employees_id_fk` FOREIGN KEY (`head_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_business_units_tenant_company` ON `business_units` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_business_units_company_code` ON `business_units` (`company_id`,`code`);
--> statement-breakpoint
CREATE TABLE `divisions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`business_unit_id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`description` varchar(1000),
	`head_employee_id` varchar(64),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `divisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `divisions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `divisions_business_unit_id_business_units_id_fk` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `divisions_head_employee_id_employees_id_fk` FOREIGN KEY (`head_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_divisions_tenant_company` ON `divisions` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_divisions_business_unit` ON `divisions` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX `idx_divisions_company_code` ON `divisions` (`company_id`,`code`);
