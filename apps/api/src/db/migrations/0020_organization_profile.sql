ALTER TABLE `companies` ADD COLUMN `display_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `organization_type` varchar(100);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `industry` varchar(100);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `website` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `logo_url` varchar(500);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `alternate_email` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `alternate_phone` varchar(50);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `address_line_1` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `address_line_2` varchar(255);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `state` varchar(100);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `city` varchar(100);
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `postal_code` varchar(20);
