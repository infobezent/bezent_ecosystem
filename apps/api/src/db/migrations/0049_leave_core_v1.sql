-- Leave Core V1 (P2): link requests and balances to configured leave types, decimal day
-- quantities, leave-year cycles, and an append-only balance ledger. Existing rows are migrated
-- onto default leave types that preserve the previous fixed behaviour (AL 18 / CL 6 / SL 12 / LOP).

ALTER TABLE `employee_leave_requests`
	ADD COLUMN `leave_type_id` varchar(64) AFTER `employee_id`,
	ADD COLUMN `policy_id` varchar(64) AFTER `leave_type_id`,
	ADD COLUMN `settings_version_id` varchar(64) AFTER `policy_id`,
	ADD COLUMN `submitted_by_user_id` varchar(64) AFTER `settings_version_id`,
	MODIFY COLUMN `leave_type` enum('annual','sick','casual','unpaid'),
	MODIFY COLUMN `total_days` decimal(5,2) NOT NULL;
--> statement-breakpoint
ALTER TABLE `employee_leave_balances`
	ADD COLUMN `leave_type_id` varchar(64) AFTER `employee_id`,
	ADD COLUMN `cycle_start_date` varchar(10) AFTER `year`,
	ADD COLUMN `cycle_end_date` varchar(10) AFTER `cycle_start_date`,
	MODIFY COLUMN `leave_type` enum('annual','sick','casual','unpaid'),
	MODIFY COLUMN `total_days` decimal(6,2) NOT NULL DEFAULT '0.00',
	MODIFY COLUMN `used_days` decimal(6,2) NOT NULL DEFAULT '0.00',
	MODIFY COLUMN `pending_days` decimal(6,2) NOT NULL DEFAULT '0.00',
	DROP INDEX `idx_emp_leave_bal_type_year`;
--> statement-breakpoint
-- Default leave types for every company that already has leave data (kept if the code exists).
INSERT IGNORE INTO `leave_types`
	(`id`, `tenant_id`, `company_id`, `name`, `code`, `short_label`, `color_token`, `category`,
	 `payroll_impact`, `is_tracked`, `allow_half_day`, `min_per_request`, `max_per_year`,
	 `attendance_status_code`, `effective_from`)
SELECT
	CONCAT('lvt_', SUBSTRING(MD5(CONCAT(c.`company_id`, ':', d.`code`)), 1, 24)),
	c.`tenant_id`, c.`company_id`, d.`name`, d.`code`, d.`short_label`, d.`color`, d.`category`,
	d.`impact`, d.`tracked`, true, '0.50', d.`max_year`, d.`code`, '2000-01-01'
FROM (
	SELECT `tenant_id`, `company_id` FROM `employee_leave_requests`
	UNION
	SELECT `tenant_id`, `company_id` FROM `employee_leave_balances`
) c
CROSS JOIN (
	SELECT 'Annual Leave' AS `name`, 'AL' AS `code`, 'Annual' AS `short_label`, 'success' AS `color`,
		'paid' AS `category`, 'paid' AS `impact`, true AS `tracked`, 18.00 AS `max_year`
	UNION ALL SELECT 'Casual Leave', 'CL', 'Casual', 'warning', 'paid', 'paid', true, 6.00
	UNION ALL SELECT 'Sick Leave', 'SL', 'Sick', 'info', 'paid', 'paid', true, 12.00
	UNION ALL SELECT 'Loss of Pay', 'LOP', 'LOP', 'neutral', 'loss_of_pay', 'unpaid', false, NULL
) d;
--> statement-breakpoint
-- A company-wide "Standard Leave Policy" for those companies that have no policy yet.
INSERT IGNORE INTO `leave_policies`
	(`id`, `tenant_id`, `company_id`, `name`, `code`, `description`, `status`, `scope`, `scope_name`,
	 `effective_from`, `linked_leave_type_ids`, `priority`, `is_active`, `created_by_user_id`)
SELECT
	CONCAT('lvp_', SUBSTRING(MD5(CONCAT(c.`company_id`, ':STD_LEAVE')), 1, 24)),
	c.`tenant_id`, c.`company_id`, 'Standard Leave Policy', 'STD_LEAVE',
	'Default company-wide policy preserving the previous fixed leave quotas.',
	'active', 'company', 'Company-wide', '2000-01-01',
	(SELECT JSON_ARRAYAGG(lt.`id`) FROM `leave_types` lt
		WHERE lt.`company_id` = c.`company_id` AND lt.`code` IN ('AL', 'CL', 'SL', 'LOP')),
	0, true, 'system'
FROM (
	SELECT `tenant_id`, `company_id` FROM `employee_leave_requests`
	UNION
	SELECT `tenant_id`, `company_id` FROM `employee_leave_balances`
) c
WHERE NOT EXISTS (SELECT 1 FROM `leave_policies` p WHERE p.`company_id` = c.`company_id`);
--> statement-breakpoint
INSERT IGNORE INTO `leave_policy_entitlements`
	(`id`, `tenant_id`, `company_id`, `policy_id`, `leave_type_id`, `annual_quota`)
SELECT
	CONCAT('lpe_', SUBSTRING(MD5(CONCAT(p.`id`, ':', lt.`id`)), 1, 24)),
	p.`tenant_id`, p.`company_id`, p.`id`, lt.`id`,
	CASE lt.`code` WHEN 'AL' THEN 18.00 WHEN 'CL' THEN 6.00 WHEN 'SL' THEN 12.00 ELSE NULL END
FROM `leave_policies` p
JOIN `leave_types` lt ON lt.`company_id` = p.`company_id` AND lt.`code` IN ('AL', 'CL', 'SL', 'LOP')
WHERE p.`id` = CONCAT('lvp_', SUBSTRING(MD5(CONCAT(p.`company_id`, ':STD_LEAVE')), 1, 24));
--> statement-breakpoint
UPDATE `employee_leave_requests` r
JOIN `leave_types` lt ON lt.`company_id` = r.`company_id` AND lt.`code` = CASE r.`leave_type`
	WHEN 'annual' THEN 'AL' WHEN 'casual' THEN 'CL' WHEN 'sick' THEN 'SL' ELSE 'LOP' END
SET r.`leave_type_id` = lt.`id`
WHERE r.`leave_type_id` IS NULL;
--> statement-breakpoint
-- Legacy balances were calendar-year based.
UPDATE `employee_leave_balances` b
JOIN `leave_types` lt ON lt.`company_id` = b.`company_id` AND lt.`code` = CASE b.`leave_type`
	WHEN 'annual' THEN 'AL' WHEN 'casual' THEN 'CL' WHEN 'sick' THEN 'SL' ELSE 'LOP' END
SET b.`leave_type_id` = lt.`id`,
	b.`cycle_start_date` = CONCAT(b.`year`, '-01-01'),
	b.`cycle_end_date` = CONCAT(b.`year`, '-12-31')
WHERE b.`leave_type_id` IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_balance_transactions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`balance_id` varchar(64) NOT NULL,
	`cycle_start_date` varchar(10) NOT NULL,
	`txn_type` enum('opening','accrual','usage_reserve','usage_release','usage_confirm','adjustment','carry_forward_in','lapse','encashment') NOT NULL,
	`days` decimal(6,2) NOT NULL,
	`reference_type` varchar(30),
	`reference_id` varchar(64),
	`reason` varchar(500),
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_balance_transactions_id` PRIMARY KEY(`id`),
	INDEX `idx_leave_bal_txn_tenant_comp` (`tenant_id`,`company_id`),
	INDEX `idx_leave_bal_txn_balance` (`balance_id`),
	INDEX `idx_leave_bal_txn_employee_type` (`employee_id`,`leave_type_id`,`cycle_start_date`),
	INDEX `idx_leave_bal_txn_reference` (`reference_type`,`reference_id`),
	CONSTRAINT `leave_balance_transactions_balance_id_fk` FOREIGN KEY (`balance_id`) REFERENCES `employee_leave_balances`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
-- One opening entry per migrated balance carries its entitlement into the ledger.
INSERT IGNORE INTO `leave_balance_transactions`
	(`id`, `tenant_id`, `company_id`, `employee_id`, `leave_type_id`, `balance_id`, `cycle_start_date`,
	 `txn_type`, `days`, `reference_type`, `reference_id`, `reason`, `created_by_user_id`)
SELECT
	CONCAT('lbt_', SUBSTRING(MD5(CONCAT(b.`id`, ':opening')), 1, 24)),
	b.`tenant_id`, b.`company_id`, b.`employee_id`, b.`leave_type_id`, b.`id`, b.`cycle_start_date`,
	'opening', b.`total_days`, 'migration', '0049_leave_core_v1',
	CONCAT('Migrated balance (used ', b.`used_days`, ', pending ', b.`pending_days`, ')'), 'system'
FROM `employee_leave_balances` b;
--> statement-breakpoint
ALTER TABLE `employee_leave_requests`
	MODIFY COLUMN `leave_type_id` varchar(64) NOT NULL,
	ADD INDEX `idx_emp_leave_req_type` (`leave_type_id`),
	ADD CONSTRAINT `employee_leave_requests_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `employee_leave_balances`
	MODIFY COLUMN `leave_type_id` varchar(64) NOT NULL,
	MODIFY COLUMN `cycle_start_date` varchar(10) NOT NULL,
	MODIFY COLUMN `cycle_end_date` varchar(10) NOT NULL,
	ADD UNIQUE INDEX `idx_emp_leave_bal_type_cycle` (`company_id`,`employee_id`,`leave_type_id`,`cycle_start_date`),
	ADD CONSTRAINT `employee_leave_balances_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action;
