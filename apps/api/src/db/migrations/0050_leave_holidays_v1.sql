CREATE TABLE IF NOT EXISTS `holiday_calendars` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`year` int NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`is_default` boolean NOT NULL DEFAULT false,
	`optional_holiday_quota` int NOT NULL DEFAULT 0,
	`revision` int NOT NULL DEFAULT 0,
	`published_at` timestamp NULL,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `holiday_calendars_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_holiday_cal_company_name_year` UNIQUE(`company_id`,`name`,`year`),
	INDEX `idx_holiday_cal_tenant_comp` (`tenant_id`,`company_id`),
	INDEX `idx_holiday_cal_year_status` (`company_id`,`year`,`status`),
	CONSTRAINT `holiday_calendars_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `holiday_calendar_locations` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`calendar_id` varchar(64) NOT NULL,
	`location_id` varchar(64) NOT NULL,
	CONSTRAINT `holiday_calendar_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_holiday_cal_loc_unique` UNIQUE(`calendar_id`,`location_id`),
	INDEX `idx_holiday_cal_loc_location` (`company_id`,`location_id`),
	CONSTRAINT `holiday_calendar_locations_calendar_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars`(`id`) ON DELETE cascade ON UPDATE no action,
	CONSTRAINT `holiday_calendar_locations_location_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `holidays` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`calendar_id` varchar(64) NOT NULL,
	`date` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('mandatory','optional') NOT NULL DEFAULT 'mandatory',
	`description` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `holidays_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_holidays_calendar_date` UNIQUE(`calendar_id`,`date`),
	INDEX `idx_holidays_tenant_comp` (`tenant_id`,`company_id`),
	CONSTRAINT `holidays_calendar_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars`(`id`) ON DELETE cascade ON UPDATE no action
);
