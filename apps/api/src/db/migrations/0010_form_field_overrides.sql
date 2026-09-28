CREATE TABLE `form_field_overrides` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`form_key` varchar(100) NOT NULL,
	`field_key` varchar(100) NOT NULL,
	`is_enabled` boolean,
	`is_required` boolean,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_field_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_form_field_overrides_key` UNIQUE(`tenant_id`,`company_id`,`form_key`,`field_key`)
);
--> statement-breakpoint
ALTER TABLE `form_field_overrides` ADD CONSTRAINT `form_field_overrides_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;