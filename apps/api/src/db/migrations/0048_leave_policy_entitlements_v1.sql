CREATE TABLE IF NOT EXISTS `leave_policy_entitlements` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`policy_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`annual_quota` decimal(6,2),
	`max_per_year_override` decimal(6,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_policy_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_pol_ent_policy_type` UNIQUE(`policy_id`,`leave_type_id`),
	INDEX `idx_leave_pol_ent_tenant_comp` (`tenant_id`,`company_id`),
	INDEX `idx_leave_pol_ent_type` (`leave_type_id`),
	CONSTRAINT `leave_policy_entitlements_policy_id_leave_policies_id_fk` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `leave_policy_entitlements_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
-- Backfill one entitlement per linked leave type, using the type's max_per_year as the quota.
INSERT IGNORE INTO `leave_policy_entitlements`
	(`id`, `tenant_id`, `company_id`, `policy_id`, `leave_type_id`, `annual_quota`)
SELECT
	CONCAT('lpe_', SUBSTRING(MD5(CONCAT(p.`id`, ':', lt.`id`)), 1, 24)),
	p.`tenant_id`,
	p.`company_id`,
	p.`id`,
	lt.`id`,
	lt.`max_per_year`
FROM `leave_policies` p
JOIN JSON_TABLE(
	p.`linked_leave_type_ids`,
	'$[*]' COLUMNS (`leave_type_id` varchar(64) COLLATE utf8mb4_0900_ai_ci PATH '$')
) jt
JOIN `leave_types` lt ON lt.`id` = jt.`leave_type_id` AND lt.`company_id` = p.`company_id`;
