CREATE TABLE `tenant_admins` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`status` enum('active','inactive','revoked') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenant_admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_tenant_admins_tenant_user` UNIQUE(`tenant_id`,`user_id`),
	CONSTRAINT `tenant_admins_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade,
	CONSTRAINT `tenant_admins_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tenant_admins_tenant` ON `tenant_admins` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_tenant_admins_user` ON `tenant_admins` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_tenant_admins_status` ON `tenant_admins` (`status`);
