ALTER TABLE `onboarding_cases` MODIFY COLUMN `stage` varchar(50) NOT NULL DEFAULT 'preboarding';
--> statement-breakpoint
ALTER TABLE `onboarding_stage_configs` ADD COLUMN `is_terminal` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE `onboarding_stage_configs` SET `is_terminal` = true WHERE `stage_key` = 'completed';
