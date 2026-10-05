ALTER TABLE `locations` MODIFY COLUMN `code` varchar(50) NULL;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `type` enum('office','branch','plant_factory','client_site','remote','other') NOT NULL DEFAULT 'office';
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `address_line_1` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `address_line_2` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `state` varchar(100) NULL;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `postal_code` varchar(20) NULL;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `timezone` varchar(100) NULL;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `description` varchar(1000) NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_locations_company_code` ON `locations` (`company_id`, `code`);
--> statement-breakpoint
UPDATE `locations` SET `type` = 'remote' WHERE `id` = 'loc_rem_01';
