ALTER TABLE `companies` ADD COLUMN `registration_number` varchar(100);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `currency` varchar(10);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `locale` varchar(20);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `date_format` varchar(30);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `week_starts_on` varchar(20);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `financial_year_start` varchar(20);
