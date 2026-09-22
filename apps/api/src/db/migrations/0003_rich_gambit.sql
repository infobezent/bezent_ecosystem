ALTER TABLE `onboarding_cases` MODIFY COLUMN `department_id` varchar(64);--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `designation_id` varchar(64);--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `first_name` varchar(100);--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `joining_date` varchar(10);--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `status` enum('draft','active','withdrawn','completed') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD `draft_payload` json;--> statement-breakpoint
CREATE INDEX `idx_onboarding_status` ON `onboarding_cases` (`status`);