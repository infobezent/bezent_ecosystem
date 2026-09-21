CREATE TABLE `companies` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`company_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `designations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`company_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `designations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`company_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`city` varchar(100),
	`country` varchar(100),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_cases` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL,
	`company_id` varchar(36) NOT NULL,
	`department_id` varchar(36) NOT NULL,
	`designation_id` varchar(36) NOT NULL,
	`location_id` varchar(36),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100),
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`joining_date` varchar(10) NOT NULL,
	`employment_type` enum('full_time','part_time','contract','intern') NOT NULL DEFAULT 'full_time',
	`stage` enum('preboarding','documents','induction','completed') NOT NULL DEFAULT 'preboarding',
	`status` enum('active','withdrawn','completed') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `designations` ADD CONSTRAINT `designations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `locations` ADD CONSTRAINT `locations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_designation_id_designations_id_fk` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD CONSTRAINT `onboarding_cases_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_companies_tenant_id` ON `companies` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_companies_code` ON `companies` (`code`);--> statement-breakpoint
CREATE INDEX `idx_departments_tenant_company` ON `departments` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_designations_tenant_company` ON `designations` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_tenant_company` ON `locations` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_tenant_company` ON `onboarding_cases` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_email` ON `onboarding_cases` (`email`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_stage` ON `onboarding_cases` (`stage`);