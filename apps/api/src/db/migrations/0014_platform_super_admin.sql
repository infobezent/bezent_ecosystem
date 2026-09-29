CREATE TABLE `tenant_details` (
	`tenant_id` varchar(64) NOT NULL,
	`code` varchar(50) NOT NULL,
	`contact_email` varchar(255),
	`contact_phone` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_details_tenant_id` PRIMARY KEY(`tenant_id`),
	CONSTRAINT `idx_tenant_details_code` UNIQUE(`code`),
	CONSTRAINT `tenant_details_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `companies` ADD `legal_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD `business_email` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD `contact_phone` varchar(50);
--> statement-breakpoint
ALTER TABLE `companies` ADD `country` varchar(100);
--> statement-breakpoint
ALTER TABLE `companies` ADD `time_zone` varchar(100);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(64) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`salt` varchar(64) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`phone` varchar(50),
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`is_super_admin` boolean NOT NULL DEFAULT false,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_users_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`role` enum('company_admin','hr_manager','employee','user') NOT NULL,
	`status` enum('active','inactive','revoked') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_memberships_user_company_role` UNIQUE(`user_id`,`company_id`,`role`),
	CONSTRAINT `memberships_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `memberships_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_memberships_user` ON `memberships` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_memberships_tenant_company` ON `memberships` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`token` varchar(255) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_sessions_token` UNIQUE(`token`),
	CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expires_at` ON `sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `tenant_modules` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64),
	`module_code` enum('hrms','crm','project_management') NOT NULL,
	`status` enum('enabled','disabled') NOT NULL DEFAULT 'enabled',
	`enabled_at` timestamp NOT NULL DEFAULT (now()),
	`disabled_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_modules_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_modules_tenant_company_module` UNIQUE(`tenant_id`,`company_id`,`module_code`)
);
--> statement-breakpoint
CREATE INDEX `idx_tenant_modules_tenant` ON `tenant_modules` (`tenant_id`);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(64) NOT NULL,
	`actor_user_id` varchar(64),
	`actor_email` varchar(255),
	`action` varchar(100) NOT NULL,
	`target_type` varchar(50) NOT NULL,
	`target_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64),
	`company_id` varchar(64),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor` ON `audit_logs` (`actor_user_id`);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_target` ON `audit_logs` (`target_type`,`target_id`);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_tenant_company` ON `audit_logs` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action` ON `audit_logs` (`action`);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);
