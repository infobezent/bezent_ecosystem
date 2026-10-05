CREATE TABLE `job_levels` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`rank` int NOT NULL,
	`description` varchar(1000),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_levels_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_job_levels_tenant_company` ON `job_levels` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_levels_company_code` ON `job_levels` (`company_id`,`code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_levels_company_rank` ON `job_levels` (`company_id`,`rank`);
--> statement-breakpoint
CREATE INDEX `idx_job_levels_company_status` ON `job_levels` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`rank` int NOT NULL,
	`description` varchar(1000),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `grades_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_grades_tenant_company` ON `grades` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_grades_company_code` ON `grades` (`company_id`,`code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_grades_company_rank` ON `grades` (`company_id`,`rank`);
--> statement-breakpoint
CREATE INDEX `idx_grades_company_status` ON `grades` (`company_id`,`status`);
