CREATE TABLE `onboarding_checklist_templates` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` varchar(255),
	`stage_key` varchar(50) NOT NULL,
	`assignee_type` varchar(50) NOT NULL DEFAULT 'hr',
	`due_offset_days` int NOT NULL DEFAULT 0,
	`is_required` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklist_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_conversion_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`auto_convert_on_joining` boolean NOT NULL DEFAULT false,
	`require_document_verification` boolean NOT NULL DEFAULT true,
	`require_checklist_completion` boolean NOT NULL DEFAULT true,
	`employee_id_prefix` varchar(20) NOT NULL DEFAULT 'EMP-',
	`default_employment_status` varchar(50) NOT NULL DEFAULT 'probation',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_conversion_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_onboarding_conv_tenant_company` UNIQUE(`tenant_id`,`company_id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_document_requirements` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`document_type` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`is_required` boolean NOT NULL DEFAULT true,
	`verification_required` boolean NOT NULL DEFAULT true,
	`expiry_tracking` boolean NOT NULL DEFAULT false,
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_document_requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_onboarding_docs_type` UNIQUE(`tenant_id`,`company_id`,`document_type`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_field_configs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`field_key` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`is_required` boolean NOT NULL DEFAULT false,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`is_system` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_field_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_onboarding_fields_key` UNIQUE(`tenant_id`,`company_id`,`field_key`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_general_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`onboarding_enabled` boolean NOT NULL DEFAULT true,
	`default_duration_days` int NOT NULL DEFAULT 30,
	`id_prefix` varchar(20) NOT NULL DEFAULT 'NH-',
	`default_location_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_general_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_onboarding_gen_tenant_company` UNIQUE(`tenant_id`,`company_id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_stage_configs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`stage_key` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`display_order` int NOT NULL DEFAULT 0,
	`is_required` boolean NOT NULL DEFAULT true,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_system` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_stage_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_onboarding_stages_key` UNIQUE(`tenant_id`,`company_id`,`stage_key`)
);
--> statement-breakpoint
ALTER TABLE `onboarding_checklist_templates` ADD CONSTRAINT `onboarding_checklist_templates_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_conversion_settings` ADD CONSTRAINT `onboarding_conversion_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_document_requirements` ADD CONSTRAINT `onboarding_document_requirements_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_field_configs` ADD CONSTRAINT `onboarding_field_configs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_general_settings` ADD CONSTRAINT `onboarding_general_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_general_settings` ADD CONSTRAINT `onboarding_general_settings_default_location_id_locations_id_fk` FOREIGN KEY (`default_location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_stage_configs` ADD CONSTRAINT `onboarding_stage_configs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_onboarding_checklists_company` ON `onboarding_checklist_templates` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_checklists_stage` ON `onboarding_checklist_templates` (`stage_key`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_docs_company` ON `onboarding_document_requirements` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_fields_company` ON `onboarding_field_configs` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_onboarding_stages_company` ON `onboarding_stage_configs` (`tenant_id`,`company_id`);