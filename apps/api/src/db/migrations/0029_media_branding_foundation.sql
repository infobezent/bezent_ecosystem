CREATE TABLE `media_assets` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`owner_type` enum('tenant','company') NOT NULL,
	`owner_id` varchar(64) NOT NULL,
	`asset_type` enum('tenant_logo','tenant_banner','company_logo') NOT NULL,
	`storage_provider` varchar(50) NOT NULL,
	`storage_key` varchar(500) NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`width` int,
	`height` int,
	`status` enum('active','archived','deleted') NOT NULL DEFAULT 'active',
	`created_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_tenant_id` ON `media_assets` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_owner` ON `media_assets` (`owner_type`,`owner_id`);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_status` ON `media_assets` (`status`);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `logo_url` varchar(500);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `banner_url` varchar(500);
--> statement-breakpoint
ALTER TABLE `companies` ADD `branding_mode` varchar(30) DEFAULT 'initials' NOT NULL;
