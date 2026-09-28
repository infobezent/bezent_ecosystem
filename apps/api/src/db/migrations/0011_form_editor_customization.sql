CREATE TABLE `form_custom_fields` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`form_key` varchar(100) NOT NULL,
	`field_key` varchar(100) NOT NULL,
	`section_key` varchar(100) NOT NULL,
	`field_type` enum('single_line','multi_line','email','phone','number','decimal','dropdown','radio','checkbox','multi_select','date','time','datetime','file_upload') NOT NULL,
	`label` varchar(100) NOT NULL,
	`description` varchar(500),
	`is_enabled` boolean NOT NULL,
	`is_required` boolean NOT NULL,
	`width` enum('half','full') NOT NULL,
	`sort_order` int NOT NULL,
	`config` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_custom_fields_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_form_custom_fields_key` UNIQUE(`tenant_id`,`company_id`,`form_key`,`field_key`)
);
--> statement-breakpoint
CREATE TABLE `form_customizations` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`form_key` varchar(100) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `form_customizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_form_customizations_key` UNIQUE(`tenant_id`,`company_id`,`form_key`)
);
--> statement-breakpoint
ALTER TABLE `form_field_overrides` ADD `label` varchar(100);--> statement-breakpoint
ALTER TABLE `form_field_overrides` ADD `description` varchar(500);--> statement-breakpoint
ALTER TABLE `form_field_overrides` ADD `width` enum('half','full');--> statement-breakpoint
ALTER TABLE `form_field_overrides` ADD `sort_order` int;--> statement-breakpoint
ALTER TABLE `form_custom_fields` ADD CONSTRAINT `form_custom_fields_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `form_customizations` ADD CONSTRAINT `form_customizations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;