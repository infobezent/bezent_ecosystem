CREATE TABLE IF NOT EXISTS `attendance_monthly_summaries` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`month` varchar(7) NOT NULL,
	`timezone` varchar(50) NOT NULL DEFAULT 'UTC',
	`scheduled_days` int NOT NULL DEFAULT 0,
	`scheduled_minutes` int NOT NULL DEFAULT 0,
	`present_days` decimal(4,2) NOT NULL DEFAULT '0.00',
	`absent_days` decimal(4,2) NOT NULL DEFAULT '0.00',
	`leave_days` decimal(4,2) NOT NULL DEFAULT '0.00',
	`on_duty_days` decimal(4,2) NOT NULL DEFAULT '0.00',
	`weekly_off_days` int NOT NULL DEFAULT 0,
	`holiday_days` int NOT NULL DEFAULT 0,
	`actual_worked_minutes` int NOT NULL DEFAULT 0,
	`policy_credited_minutes` int NOT NULL DEFAULT 0,
	`late_occurrences` int NOT NULL DEFAULT 0,
	`late_minutes` int NOT NULL DEFAULT 0,
	`early_exit_occurrences` int NOT NULL DEFAULT 0,
	`early_exit_minutes` int NOT NULL DEFAULT 0,
	`unresolved_exceptions` int NOT NULL DEFAULT 0,
	`pending_corrections` int NOT NULL DEFAULT 0,
	`processing_issues` int NOT NULL DEFAULT 0,
	`calculation_state` enum('pending','calculated','stale','error') NOT NULL DEFAULT 'calculated',
	`review_state` enum('not_reviewed','in_review','needs_correction','reviewed','reopened') NOT NULL DEFAULT 'not_reviewed',
	`payroll_readiness` enum('calculating','ready','needs_review','blocked') NOT NULL DEFAULT 'needs_review',
	`is_locked` boolean NOT NULL DEFAULT false,
	`period_lock_id` varchar(64),
	`version` int NOT NULL DEFAULT 1,
	`source_fingerprint` varchar(64) NOT NULL DEFAULT '',
	`assigned_reviewer_id` varchar(64),
	`assigned_at` timestamp NULL,
	`reviewed_by_user_id` varchar(64),
	`reviewed_at` timestamp NULL,
	`reviewed_version` int,
	`review_notes` text,
	`correction_request_notes` text,
	`reopen_reason` text,
	`last_calculated_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_monthly_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_ms_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_ms_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`),
	UNIQUE KEY `idx_att_ms_unique` (`company_id`, `employee_id`, `month`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_monthly_reviews` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`monthly_summary_id` varchar(64) NOT NULL,
	`reviewer_user_id` varchar(64) NOT NULL,
	`review_status` enum('in_review','needs_correction','reviewed','reopened') NOT NULL,
	`reviewed_summary_version` int NOT NULL,
	`review_notes` text,
	`reopen_reason` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_monthly_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_mr_summary` FOREIGN KEY (`monthly_summary_id`) REFERENCES `attendance_monthly_summaries`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_monthly_readiness_evaluations` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`monthly_summary_id` varchar(64) NOT NULL,
	`evaluation_version` int NOT NULL,
	`readiness_status` enum('calculating','ready','needs_review','blocked') NOT NULL,
	`passed_checks` json,
	`warning_checks` json,
	`blocking_checks` json,
	`evaluated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_monthly_readiness_evaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_mre_summary` FOREIGN KEY (`monthly_summary_id`) REFERENCES `attendance_monthly_summaries`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_monthly_audits` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`monthly_summary_id` varchar(64) NOT NULL,
	`action` enum(
		'created',
		'recalculated',
		'assigned',
		'review_started',
		'correction_requested',
		'reviewed',
		'reopened',
		'locked',
		'unlocked'
	) NOT NULL,
	`actor_user_id` varchar(64),
	`old_state` json,
	`new_state` json,
	`notes` text,
	`summary_version` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_monthly_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_ma_summary` FOREIGN KEY (`monthly_summary_id`) REFERENCES `attendance_monthly_summaries`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_att_ms_tenant_comp_month` ON `attendance_monthly_summaries` (`tenant_id`, `company_id`, `month`);
--> statement-breakpoint
CREATE INDEX `idx_att_ms_emp_month` ON `attendance_monthly_summaries` (`employee_id`, `month`);
--> statement-breakpoint
CREATE INDEX `idx_att_ms_readiness` ON `attendance_monthly_summaries` (`tenant_id`, `company_id`, `month`, `payroll_readiness`);
--> statement-breakpoint
CREATE INDEX `idx_att_ms_review` ON `attendance_monthly_summaries` (`tenant_id`, `company_id`, `month`, `review_state`);
--> statement-breakpoint
CREATE INDEX `idx_att_mr_summary` ON `attendance_monthly_reviews` (`monthly_summary_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_mr_tenant_comp` ON `attendance_monthly_reviews` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_mre_summary` ON `attendance_monthly_readiness_evaluations` (`monthly_summary_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_mre_tenant_comp` ON `attendance_monthly_readiness_evaluations` (`tenant_id`, `company_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ma_summary` ON `attendance_monthly_audits` (`monthly_summary_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_ma_tenant_comp` ON `attendance_monthly_audits` (`tenant_id`, `company_id`);
