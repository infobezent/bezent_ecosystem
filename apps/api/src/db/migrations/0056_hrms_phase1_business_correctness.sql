ALTER TABLE `employee_attendance` MODIFY COLUMN `status` enum('present','absent','half_day','on_leave','holiday','incomplete','weekly_off') NOT NULL DEFAULT 'present';
--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD COLUMN `status` enum('pending','reviewed','committed') NOT NULL DEFAULT 'committed';
--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD COLUMN `committed_by_user_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD COLUMN `committed_at` timestamp;
--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD COLUMN `reviewed_by_user_id` varchar(64);
--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD COLUMN `reviewed_at` timestamp;
--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD COLUMN `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
