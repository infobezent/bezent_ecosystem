CREATE TABLE IF NOT EXISTS `leave_restriction_rules` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`rule_key` varchar(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`rule_type` enum('clubbing','blackout','min_notice','min_gap','frequency_cap','team_concurrency') NOT NULL,
	`name` varchar(100) NOT NULL,
	`config` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`superseded_at` timestamp NULL,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_restriction_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_restr_key_version` UNIQUE(`rule_key`,`version`),
	INDEX `idx_leave_restr_tenant_comp` (`tenant_id`,`company_id`),
	INDEX `idx_leave_restr_current` (`company_id`,`rule_type`,`superseded_at`),
	CONSTRAINT `leave_restriction_rules_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
