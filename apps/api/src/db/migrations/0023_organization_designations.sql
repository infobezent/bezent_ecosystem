ALTER TABLE `designations` MODIFY COLUMN `code` varchar(50) NULL;
--> statement-breakpoint
ALTER TABLE `designations` ADD COLUMN `description` varchar(1000) NULL;
--> statement-breakpoint
ALTER TABLE `designations` ADD COLUMN `department_id` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `designations` ADD CONSTRAINT `designations_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_designations_company_code` ON `designations` (`company_id`, `code`);
--> statement-breakpoint
CREATE INDEX `idx_designations_department` ON `designations` (`department_id`);
