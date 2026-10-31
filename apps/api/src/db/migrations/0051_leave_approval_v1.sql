CREATE TABLE IF NOT EXISTS `leave_approval_workflows` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`is_default` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`levels` json NOT NULL,
	`auto_approve_up_to_days` decimal(5,2),
	`skip_if_approver_is_applicant` boolean NOT NULL DEFAULT true,
	`fallback_approver_role_id` varchar(64),
	`cancellation_requires_approval` boolean NOT NULL DEFAULT false,
	`allow_self_approval_for_hr` boolean NOT NULL DEFAULT false,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_approval_workflows_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_wf_company_name` UNIQUE(`company_id`,`name`),
	INDEX `idx_leave_wf_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `leave_approval_workflows_company_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `leave_request_approvals` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`purpose` enum('approval','cancellation') NOT NULL DEFAULT 'approval',
	`level` int NOT NULL,
	`approver_employee_id` varchar(64),
	`approver_role_id` varchar(64),
	`action` enum('pending','approved','rejected','escalated','skipped','cancelled','waiting') NOT NULL DEFAULT 'waiting',
	`acted_by_user_id` varchar(64),
	`comment` varchar(500),
	`acted_at` timestamp NULL,
	`sla_due_at` timestamp NULL,
	`sla_breached_at` timestamp NULL,
	`on_sla_breach` enum('escalate_to_next','notify_only','auto_approve') NOT NULL DEFAULT 'notify_only',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_request_approvals_id` PRIMARY KEY(`id`),
	INDEX `idx_leave_req_appr_request` (`request_id`),
	INDEX `idx_leave_req_appr_queue` (`company_id`,`action`,`approver_employee_id`),
	INDEX `idx_leave_req_appr_role` (`company_id`,`action`,`approver_role_id`),
	INDEX `idx_leave_req_appr_sla` (`action`,`sla_due_at`),
	CONSTRAINT `leave_request_approvals_request_id_fk` FOREIGN KEY (`request_id`) REFERENCES `employee_leave_requests`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE `employee_leave_requests`
	ADD COLUMN `workflow_id` varchar(64) AFTER `settings_version_id`,
	ADD COLUMN `current_level` int AFTER `workflow_id`,
	MODIFY COLUMN `status` enum('pending','approved','rejected','cancelled','cancellation_pending') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `leave_balance_transactions`
	MODIFY COLUMN `txn_type` enum('opening','accrual','usage_reserve','usage_release','usage_confirm','usage_reversal','adjustment','carry_forward_in','lapse','encashment') NOT NULL;
