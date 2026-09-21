SET FOREIGN_KEY_CHECKS = 0;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` MODIFY COLUMN `tenant_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `departments` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `departments` MODIFY COLUMN `tenant_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `departments` MODIFY COLUMN `company_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `designations` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `designations` MODIFY COLUMN `tenant_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `designations` MODIFY COLUMN `company_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `tenant_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `company_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `tenant_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `company_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `department_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `designation_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `onboarding_cases` MODIFY COLUMN `location_id` varchar(64);--> statement-breakpoint
SET FOREIGN_KEY_CHECKS = 1;