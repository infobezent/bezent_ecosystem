CREATE TABLE `invitations` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`email` varchar(255) NOT NULL,
	`role` enum('company_admin','hr_manager','employee','user') NOT NULL,
	`token` varchar(255) NOT NULL,
	`invited_by_user_id` varchar(64),
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_invitations_token` UNIQUE(`token`),
	CONSTRAINT `invitations_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
	CONSTRAINT `invitations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `invitations_invited_by_user_id_users_id_fk` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `idx_invitations_tenant_company` ON `invitations` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_invitations_email` ON `invitations` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_invitations_status` ON `invitations` (`status`);
