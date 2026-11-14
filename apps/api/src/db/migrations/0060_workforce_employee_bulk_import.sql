CREATE TABLE `employee_imports` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_format` enum('xlsx','csv') NOT NULL,
	`file_size` int NOT NULL,
	`total_records` int NOT NULL DEFAULT 0,
	`valid_records` int NOT NULL DEFAULT 0,
	`error_records` int NOT NULL DEFAULT 0,
	`duplicate_records` int NOT NULL DEFAULT 0,
	`imported_records` int NOT NULL DEFAULT 0,
	`status` enum('pending','validating','validated','processing','completed','completed_with_errors','failed','cancelled') NOT NULL DEFAULT 'pending',
	`options` json,
	`created_by_user_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `employee_imports_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_employee_imports_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_employee_imports_tenant_company` ON `employee_imports` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_employee_imports_status` ON `employee_imports` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_employee_imports_created_at` ON `employee_imports` (`created_at`);
--> statement-breakpoint
CREATE TABLE `employee_import_rows` (
	`id` varchar(64) NOT NULL,
	`import_id` varchar(64) NOT NULL,
	`row_number` int NOT NULL,
	`employee_name` varchar(255),
	`employee_number` varchar(100),
	`work_email` varchar(255),
	`status` enum('valid','error','duplicate','imported','skipped') NOT NULL,
	`issues` json,
	`raw_data` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `employee_import_rows_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_employee_import_rows_import` FOREIGN KEY (`import_id`) REFERENCES `employee_imports`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_import_rows_import_id` ON `employee_import_rows` (`import_id`);
--> statement-breakpoint
CREATE INDEX `idx_import_rows_status` ON `employee_import_rows` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_import_rows_row_number` ON `employee_import_rows` (`import_id`,`row_number`);
