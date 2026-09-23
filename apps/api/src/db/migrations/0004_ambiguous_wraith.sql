CREATE TABLE `onboarding_case_stage_history` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`case_id` varchar(64) NOT NULL,
	`from_stage` varchar(50),
	`to_stage` varchar(50) NOT NULL,
	`action` enum('transition','revert','withdraw','complete') NOT NULL,
	`notes` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `onboarding_case_stage_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD `withdrawal_reason` varchar(500);--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD `withdrawn_at` timestamp;--> statement-breakpoint
ALTER TABLE `onboarding_cases` ADD `completed_at` timestamp;--> statement-breakpoint
ALTER TABLE `onboarding_case_stage_history` ADD CONSTRAINT `onboarding_case_stage_history_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_case_stage_history` ADD CONSTRAINT `onboarding_case_stage_history_case_id_onboarding_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `onboarding_cases`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_case_history_tenant_company` ON `onboarding_case_stage_history` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_case_history_case_id` ON `onboarding_case_stage_history` (`case_id`);--> statement-breakpoint
CREATE INDEX `idx_case_history_created_at` ON `onboarding_case_stage_history` (`created_at`);