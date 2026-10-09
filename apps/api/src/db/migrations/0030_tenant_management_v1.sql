CREATE TABLE `plans` (
	`id` varchar(64) NOT NULL,
	`application_code` enum('hrms','crm','project_management') NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`tier` varchar(50) NOT NULL,
	`status` enum('active','deprecated','draft') NOT NULL DEFAULT 'active',
	`version` int NOT NULL DEFAULT 1,
	`default_seats` int NOT NULL DEFAULT 10,
	`min_seats` int NOT NULL DEFAULT 1,
	`max_seats` int,
	`trial_eligible` boolean NOT NULL DEFAULT true,
	`trial_duration_days` int NOT NULL DEFAULT 14,
	`is_custom` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_plans_app_code` UNIQUE(`application_code`,`code`)
);
--> statement-breakpoint
CREATE INDEX `idx_plans_app_status` ON `plans` (`application_code`,`status`);
--> statement-breakpoint
CREATE TABLE `plan_prices` (
	`id` varchar(64) NOT NULL,
	`plan_id` varchar(64) NOT NULL,
	`currency` varchar(10) NOT NULL,
	`billing_interval` enum('monthly','annual','quarterly','custom') NOT NULL DEFAULT 'monthly',
	`amount_minor_units` int NOT NULL,
	`effective_from` timestamp NOT NULL DEFAULT (now()),
	`effective_to` timestamp,
	`status` enum('active','deprecated') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_prices_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_plan_prices_plan_curr_interval` ON `plan_prices` (`plan_id`,`currency`,`billing_interval`,`status`);
--> statement-breakpoint
CREATE TABLE `plan_entitlements` (
	`id` varchar(64) NOT NULL,
	`plan_id` varchar(64) NOT NULL,
	`application_code` enum('hrms','crm','project_management') NOT NULL,
	`module_code` varchar(100) NOT NULL,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`limits` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_plan_entitlements_plan_mod` UNIQUE(`plan_id`,`module_code`),
	CONSTRAINT `plan_entitlements_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_plan_entitlements_app` ON `plan_entitlements` (`application_code`);
--> statement-breakpoint
CREATE TABLE `tenant_subscriptions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64),
	`application_code` enum('hrms','crm','project_management') NOT NULL,
	`plan_id` varchar(64) NOT NULL,
	`status` enum('pending_activation','active','trial','past_due','suspended','cancelled','expired') NOT NULL DEFAULT 'active',
	`access_mode` enum('trial','paid') NOT NULL DEFAULT 'paid',
	`billing_cycle` enum('monthly','annual','quarterly','custom') NOT NULL DEFAULT 'monthly',
	`licensed_seats` int NOT NULL DEFAULT 10,
	`scheduled_activation_at` timestamp,
	`activated_at` timestamp,
	`trial_starts_at` timestamp,
	`trial_ends_at` timestamp,
	`current_period_starts_at` timestamp,
	`current_period_ends_at` timestamp,
	`cancelled_at` timestamp,
	`cancellation_reason` varchar(500),
	`renews_at` timestamp,
	`auto_renew` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`active_subscription_scope` varchar(128) GENERATED ALWAYS AS ((CASE WHEN `status` IN ('active', 'trial') THEN CONCAT(`tenant_id`, ':', `application_code`) ELSE NULL END)) STORED,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_subscriptions_active_scope` UNIQUE(`active_subscription_scope`),
	CONSTRAINT `tenant_subscriptions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `tenant_subscriptions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `tenant_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tenant_subscriptions_tenant_app` ON `tenant_subscriptions` (`tenant_id`,`application_code`);
--> statement-breakpoint
CREATE INDEX `idx_tenant_subscriptions_plan` ON `tenant_subscriptions` (`plan_id`);
--> statement-breakpoint
CREATE INDEX `idx_tenant_subscriptions_status` ON `tenant_subscriptions` (`status`);
--> statement-breakpoint
CREATE TABLE `tenant_entitlement_overrides` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64),
	`application_code` enum('hrms','crm','project_management') NOT NULL,
	`module_code` varchar(100) NOT NULL,
	`override_type` enum('enable','disable','limit') NOT NULL DEFAULT 'enable',
	`override_value` json,
	`reason` varchar(500) NOT NULL,
	`authorized_by_user_id` varchar(64) NOT NULL,
	`valid_from` timestamp NOT NULL DEFAULT (now()),
	`valid_until` timestamp,
	`revoked_at` timestamp,
	`revoked_by_user_id` varchar(64),
	`revocation_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_entitlement_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_entitlement_overrides_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `tenant_entitlement_overrides_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `tenant_entitlement_overrides_authorized_by_user_id_users_id_fk` FOREIGN KEY (`authorized_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `tenant_entitlement_overrides_revoked_by_user_id_users_id_fk` FOREIGN KEY (`revoked_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entitlement_overrides_tenant_mod` ON `tenant_entitlement_overrides` (`tenant_id`,`application_code`,`module_code`);
--> statement-breakpoint
CREATE INDEX `idx_entitlement_overrides_valid` ON `tenant_entitlement_overrides` (`tenant_id`,`valid_until`);
--> statement-breakpoint
CREATE TABLE `tenant_lifecycle_events` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`event_type` enum('created','activated','suspended','reactivated','terminated','status_changed') NOT NULL,
	`previous_status` varchar(50),
	`new_status` varchar(50) NOT NULL,
	`reason` varchar(1000),
	`actor_user_id` varchar(64),
	`actor_email` varchar(255),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_lifecycle_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_lifecycle_events_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `tenant_lifecycle_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_lifecycle_tenant_created` ON `tenant_lifecycle_events` (`tenant_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_lifecycle_event_type` ON `tenant_lifecycle_events` (`event_type`);
--> statement-breakpoint
CREATE TABLE `provisioning_jobs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64),
	`job_type` enum('tenant_creation','subscription_activation','module_provisioning','admin_handoff') NOT NULL DEFAULT 'tenant_creation',
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`idempotency_key` varchar(128),
	`attempt_count` int NOT NULL DEFAULT 1,
	`max_attempts` int NOT NULL DEFAULT 3,
	`retry_eligible` boolean NOT NULL DEFAULT true,
	`next_attempt_at` timestamp,
	`step_state` json NOT NULL,
	`error_code` varchar(100),
	`last_error` varchar(2000),
	`worker_id` varchar(100),
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provisioning_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_prov_jobs_idempotency` UNIQUE(`idempotency_key`),
	CONSTRAINT `provisioning_jobs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action,
	CONSTRAINT `provisioning_jobs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `idx_prov_jobs_tenant` ON `provisioning_jobs` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_prov_jobs_status` ON `provisioning_jobs` (`status`);
--> statement-breakpoint
CREATE TABLE `transactional_outbox` (
	`id` varchar(64) NOT NULL,
	`aggregate_type` varchar(50) NOT NULL,
	`aggregate_id` varchar(64) NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`payload` json NOT NULL,
	`idempotency_key` varchar(128),
	`status` enum('pending','published','failed','dead_letter') NOT NULL DEFAULT 'pending',
	`attempt_count` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 5,
	`next_attempt_at` timestamp,
	`last_error` varchar(2000),
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactional_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_outbox_idempotency` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_status_next` ON `transactional_outbox` (`status`,`next_attempt_at`);
--> statement-breakpoint
CREATE INDEX `idx_outbox_aggregate` ON `transactional_outbox` (`aggregate_type`,`aggregate_id`);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `suspended_reason` varchar(1000);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `suspended_at` timestamp;
--> statement-breakpoint
ALTER TABLE `tenants` ADD `reactivated_at` timestamp;
--> statement-breakpoint
ALTER TABLE `tenant_admins` ADD `is_primary` boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `tenant_admins` ADD `job_title` varchar(100);
--> statement-breakpoint
ALTER TABLE `tenant_admins` ADD `primary_tenant_scope` varchar(64) GENERATED ALWAYS AS ((CASE WHEN `is_primary` = 1 AND `status` = 'active' THEN `tenant_id` ELSE NULL END)) VIRTUAL;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tenant_admins_single_primary` ON `tenant_admins` (`primary_tenant_scope`);
--> statement-breakpoint
ALTER TABLE `invitations` ADD `authority_type` enum('tenant_admin','company_role') DEFAULT 'company_role' NOT NULL;
--> statement-breakpoint
ALTER TABLE `invitations` ADD `is_primary_admin` boolean DEFAULT false NOT NULL;
