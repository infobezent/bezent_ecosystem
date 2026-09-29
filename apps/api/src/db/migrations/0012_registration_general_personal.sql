ALTER TABLE `employees` MODIFY COLUMN `employment_status` enum('pending_activation','active','probation','notice','terminated','suspended','resigned') NOT NULL DEFAULT 'pending_activation';--> statement-breakpoint
ALTER TABLE `employees` ADD `referral_code` varchar(50);--> statement-breakpoint
ALTER TABLE `employees` ADD `referred_by_employee_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_referred_by_employee_id_employees_id_fk` FOREIGN KEY (`referred_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_employees_company_ref_code` ON `employees` (`tenant_id`,`company_id`,`referral_code`);--> statement-breakpoint
CREATE INDEX `idx_employees_referred_by` ON `employees` (`referred_by_employee_id`);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `address_line_2` varchar(255);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `is_permanent_same_as_current` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_street` varchar(255);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_line_2` varchar(255);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_city` varchar(100);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_district` varchar(100);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_state` varchar(100);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_postal_code` varchar(20);--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD `permanent_address_country` varchar(100);
