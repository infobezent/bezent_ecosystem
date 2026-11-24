CREATE TABLE IF NOT EXISTS `custom_forms` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`form_key` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_custom_forms_key` UNIQUE(`tenant_id`,`company_id`,`form_key`),
	INDEX `idx_custom_forms_company` (`tenant_id`,`company_id`,`status`),
	CONSTRAINT `custom_forms_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
