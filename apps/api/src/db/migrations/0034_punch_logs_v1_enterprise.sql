ALTER TABLE `attendance_punches` MODIFY COLUMN `employee_id` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `attendance_punches` MODIFY COLUMN `punch_type` enum('in','out','break_in','break_out','auto','unknown') NOT NULL DEFAULT 'in';
--> statement-breakpoint
ALTER TABLE `attendance_punches` MODIFY COLUMN `source` enum('web','mobile','biometric','manual','api','kiosk','import') NOT NULL DEFAULT 'web';
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `raw_identifier` varchar(100);
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `workday` varchar(10);
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `validation_status` enum('pending','valid','duplicate','invalid','needs_review','unmatched') NOT NULL DEFAULT 'valid';
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `validation_reason` varchar(255);
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `processing_state` enum('received','processing','processed','failed','retry_pending') NOT NULL DEFAULT 'processed';
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `processing_error` varchar(500);
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `retry_count` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `investigation_status` enum('none','open','assigned','in_review','resolved','closed') NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `assigned_to` varchar(64);
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `investigation_notes` varchar(1000);
--> statement-breakpoint
ALTER TABLE `attendance_punches` ADD `resolved_at` timestamp;
--> statement-breakpoint
CREATE INDEX `idx_att_punches_workday` ON `attendance_punches` (`workday`);
--> statement-breakpoint
CREATE INDEX `idx_att_punches_validation` ON `attendance_punches` (`validation_status`);
--> statement-breakpoint
CREATE INDEX `idx_att_punches_processing` ON `attendance_punches` (`processing_state`);
--> statement-breakpoint
CREATE TABLE `attendance_punch_audits` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`punch_id` varchar(64) NOT NULL,
	`action` enum('ingested','validated','processed','retry_attempted','investigation_opened','investigation_assigned','investigation_resolved','identity_mapped') NOT NULL,
	`actor_user_id` varchar(64),
	`details` json,
	`notes` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_punch_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_att_punch_audits_tenant_punch` ON `attendance_punch_audits` (`tenant_id`,`punch_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_punch_audits_created` ON `attendance_punch_audits` (`created_at`);
