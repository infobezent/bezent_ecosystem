CREATE TABLE `employee_documents` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`category` enum('personal_identity','address_proof','education','previous_employment','bank_payroll','tax_other') NOT NULL,
	`document_name` varchar(150) NOT NULL,
	`document_number` varchar(100),
	`status` enum('pending','under_review','verified','rejected','resubmission_required','expired') NOT NULL DEFAULT 'pending',
	`expiry_date` varchar(10),
	`verification_remarks` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_documents` ADD CONSTRAINT `employee_documents_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_employee_documents_tenant_company` ON `employee_documents` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_documents_employee` ON `employee_documents` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_documents_status` ON `employee_documents` (`status`);--> statement-breakpoint
CREATE INDEX `idx_employee_documents_expiry` ON `employee_documents` (`expiry_date`);