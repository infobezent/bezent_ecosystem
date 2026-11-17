CREATE TABLE `employee_clearance_items` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `employee_id` varchar(64) NOT NULL,
  `action_id` varchar(64) NOT NULL,
  `department` enum('it','admin','finance','hr') NOT NULL,
  `item_title` varchar(255) NOT NULL,
  `description` text,
  `is_mandatory` boolean NOT NULL DEFAULT true,
  `display_order` int NOT NULL DEFAULT 0,
  `status` enum('pending','cleared','waived') NOT NULL DEFAULT 'pending',
  `remarks` varchar(500),
  `cleared_by` varchar(64),
  `cleared_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `employee_clearance_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employee_clearance_items` ADD CONSTRAINT `employee_clearance_items_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `employee_clearance_items` ADD CONSTRAINT `employee_clearance_items_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `employee_clearance_items` ADD CONSTRAINT `employee_clearance_items_action_id_employee_actions_id_fk` FOREIGN KEY (`action_id`) REFERENCES `employee_actions`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_clearance_items_action` ON `employee_clearance_items` (`action_id`);
--> statement-breakpoint
CREATE INDEX `idx_clearance_items_employee` ON `employee_clearance_items` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_clearance_items_tenant_company` ON `employee_clearance_items` (`tenant_id`,`company_id`);
