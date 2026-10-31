CREATE TABLE IF NOT EXISTS `leave_accrual_rules` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`effective_from` varchar(10) NOT NULL,
	`grant_method` enum('upfront_annual','monthly','quarterly','half_yearly','manual_only') NOT NULL DEFAULT 'upfront_annual',
	`accrual_timing` enum('cycle_start','period_start','period_end') NOT NULL DEFAULT 'period_start',
	`pro_rata_on_joining` boolean NOT NULL DEFAULT true,
	`joining_cutoff_day` int NOT NULL DEFAULT 15,
	`pro_rata_on_exit` boolean NOT NULL DEFAULT true,
	`accrue_during_probation` boolean NOT NULL DEFAULT true,
	`backcredit_after_probation` boolean NOT NULL DEFAULT false,
	`accrue_during_lop` boolean NOT NULL DEFAULT true,
	`carry_forward_enabled` boolean NOT NULL DEFAULT false,
	`max_carry_forward_days` decimal(6,2),
	`max_accumulation_days` decimal(6,2),
	`carry_forward_expiry_months` int,
	`lapse_remaining` boolean NOT NULL DEFAULT true,
	`encashment_enabled` boolean NOT NULL DEFAULT false,
	`encashment_trigger` enum('cycle_end','exit','both') NOT NULL DEFAULT 'cycle_end',
	`min_balance_to_retain` decimal(6,2) NOT NULL DEFAULT '0.00',
	`max_encashable_days` decimal(6,2),
	`encashment_basis` enum('basic','gross') NOT NULL DEFAULT 'basic',
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_accrual_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_accrual_type_effective` UNIQUE(`leave_type_id`,`effective_from`),
	INDEX `idx_leave_accrual_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `leave_accrual_rules_leave_type_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE `employee_leave_balances`
	ADD COLUMN `carried_forward_days` decimal(6,2) NOT NULL DEFAULT '0.00' AFTER `pending_days`,
	ADD COLUMN `carry_forward_expires_on` varchar(10) AFTER `carried_forward_days`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_cycle_close_runs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`cycle_start_date` varchar(10) NOT NULL,
	`cycle_end_date` varchar(10) NOT NULL,
	`summary` json NOT NULL,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_cycle_close_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_cycle_close_company_cycle` UNIQUE(`company_id`,`cycle_start_date`),
	CONSTRAINT `leave_cycle_close_runs_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_encashment_handovers` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`cycle_start_date` varchar(10) NOT NULL,
	`days` decimal(6,2) NOT NULL,
	`basis` enum('basic','gross') NOT NULL,
	`trigger` enum('cycle_end','exit') NOT NULL,
	`status` enum('pending_payroll','processed') NOT NULL DEFAULT 'pending_payroll',
	`run_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_encashment_handovers_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_encash_unique` UNIQUE(`employee_id`,`leave_type_id`,`cycle_start_date`,`trigger`),
	INDEX `idx_leave_encash_company_status` (`company_id`,`status`)
);
