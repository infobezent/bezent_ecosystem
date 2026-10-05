ALTER TABLE `departments` MODIFY COLUMN `code` varchar(50);
--> statement-breakpoint
ALTER TABLE `departments` ADD COLUMN `description` varchar(1000);
--> statement-breakpoint
ALTER TABLE `departments` ADD COLUMN `business_unit_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `departments` ADD COLUMN `division_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `departments` ADD COLUMN `parent_department_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `departments` ADD COLUMN `head_employee_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_business_unit_id_business_units_id_fk` FOREIGN KEY (`business_unit_id`) REFERENCES `business_units`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_division_id_divisions_id_fk` FOREIGN KEY (`division_id`) REFERENCES `divisions`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_parent_department_id_departments_id_fk` FOREIGN KEY (`parent_department_id`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `departments` ADD CONSTRAINT `departments_head_employee_id_employees_id_fk` FOREIGN KEY (`head_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_departments_business_unit` ON `departments` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX `idx_departments_division` ON `departments` (`division_id`);
--> statement-breakpoint
CREATE INDEX `idx_departments_parent` ON `departments` (`parent_department_id`);
--> statement-breakpoint
CREATE INDEX `idx_departments_company_code` ON `departments` (`company_id`,`code`);
