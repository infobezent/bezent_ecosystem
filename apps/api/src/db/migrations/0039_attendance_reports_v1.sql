CREATE TABLE IF NOT EXISTS `attendance_saved_reports` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`owner_user_id` varchar(64) NOT NULL,
	`report_id` varchar(64) NOT NULL,
	`configuration_name` varchar(150) NOT NULL,
	`filters` json,
	`selected_columns` json,
	`sorting` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_saved_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_sr_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_att_sr_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attendance_report_generations` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`actor_user_id` varchar(64) NOT NULL,
	`report_id` varchar(64) NOT NULL,
	`filters_snapshot` json,
	`selected_columns_snapshot` json,
	`output_format` enum('csv','xlsx','pdf') NOT NULL,
	`generation_status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`reporting_cutoff` varchar(50),
	`row_count` int NOT NULL DEFAULT 0,
	`file_reference` varchar(255),
	`expiration_at` timestamp NULL,
	`error_metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_report_generations_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_att_rg_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_att_sr_tenant_comp_owner` ON `attendance_saved_reports` (`tenant_id`, `company_id`, `owner_user_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_sr_report` ON `attendance_saved_reports` (`report_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_rg_tenant_comp_actor` ON `attendance_report_generations` (`tenant_id`, `company_id`, `actor_user_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_rg_report` ON `attendance_report_generations` (`report_id`);
--> statement-breakpoint
CREATE INDEX `idx_att_rg_created` ON `attendance_report_generations` (`created_at`);
