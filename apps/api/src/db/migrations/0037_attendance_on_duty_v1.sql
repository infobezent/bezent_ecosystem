ALTER TABLE `attendance_on_duty_requests`
	ADD COLUMN `request_number` varchar(32) NOT NULL DEFAULT '',
	ADD COLUMN `project_reference` varchar(100),
	ADD COLUMN `evidence_attachments` json,
	ADD COLUMN `processing_status` enum('not_applicable','pending','applied','partially_applied','processing_issues','blocked','failed') NOT NULL DEFAULT 'not_applicable',
	ADD COLUMN `assigned_to` varchar(64),
	ADD COLUMN `assigned_at` timestamp NULL,
	ADD COLUMN `assigned_role` varchar(50),
	ADD COLUMN `clarification_requested_at` timestamp NULL,
	ADD COLUMN `clarification_notes` text,
	ADD COLUMN `clarification_provided_at` timestamp NULL,
	ADD COLUMN `clarification_response` text,
	ADD COLUMN `applied_at` timestamp NULL,
	ADD COLUMN `applied_by_user_id` varchar(64),
	ADD COLUMN `processing_error` varchar(500),
	ADD COLUMN `processing_blocked_reason` varchar(500),
	ADD COLUMN `is_high_risk` boolean NOT NULL DEFAULT false,
	ADD COLUMN `risk_factors` json;
--> statement-breakpoint
ALTER TABLE `attendance_on_duty_requests`
	MODIFY COLUMN `status` enum('draft','submitted','under_review','awaiting_info','approved','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'submitted';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_on_duty_workdays` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`on_duty_request_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`workday` varchar(10) NOT NULL,
	`duration_type` enum('full_day','half_day','hourly') NOT NULL DEFAULT 'full_day',
	`duration_hours` decimal(4,2) DEFAULT '8.00',
	`half_day_session` enum('first_half','second_half'),
	`credited_status` enum('present','half_day') NOT NULL DEFAULT 'present',
	`credited_worked_minutes` int NOT NULL DEFAULT 480,
	`processing_status` enum('not_applicable','pending','applied','blocked','failed') NOT NULL DEFAULT 'pending',
	`applied_attendance_id` varchar(64),
	`error_message` varchar(500),
	`blocked_reason` varchar(500),
	`applied_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_on_duty_workdays_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_od_workdays_request` FOREIGN KEY (`on_duty_request_id`) REFERENCES `attendance_on_duty_requests`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_on_duty_audits` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`on_duty_request_id` varchar(64) NOT NULL,
	`action` enum(
		'created',
		'submitted',
		'assigned',
		'reassigned',
		'review_started',
		'info_requested',
		'info_provided',
		'approved',
		'rejected',
		'cancelled',
		'withdrawn',
		'applied',
		'apply_failed',
		'apply_blocked',
		'recalculated'
	) NOT NULL,
	`actor_user_id` varchar(64),
	`old_state` json,
	`new_state` json,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_on_duty_audits_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_od_audits_request` FOREIGN KEY (`on_duty_request_id`) REFERENCES `attendance_on_duty_requests`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_att_od_req_num` ON `attendance_on_duty_requests` (`company_id`, `request_number`);
--> statement-breakpoint
CREATE INDEX `idx_att_od_workday_lookup` ON `attendance_on_duty_workdays` (`tenant_id`, `company_id`, `workday`);
--> statement-breakpoint
CREATE INDEX `idx_att_od_workday_req` ON `attendance_on_duty_workdays` (`on_duty_request_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_od_audit_req` ON `attendance_on_duty_audits` (`on_duty_request_id`);
