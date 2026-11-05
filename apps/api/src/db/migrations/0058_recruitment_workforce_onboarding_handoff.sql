CREATE TABLE `recruitment_onboardings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`candidate_id` varchar(64) NOT NULL,
	`application_id` varchar(64) NOT NULL,
	`created_employee_id` varchar(64),
	`status` enum('pending_review','ready_for_confirmation','completed','cancelled') NOT NULL DEFAULT 'pending_review',
	`target_joining_date` varchar(10),
	`department_id` varchar(64),
	`designation_id` varchar(64),
	`location_id` varchar(64),
	`reporting_manager_id` varchar(64),
	`employment_type` enum('full_time','part_time','contract','intern') NOT NULL DEFAULT 'full_time',
	`workflow_template` varchar(150),
	`assigned_partner` varchar(255),
	`notes` text,
	`reviewed_by_user_id` varchar(64),
	`reviewed_at` timestamp,
	`confirmed_by_user_id` varchar(64),
	`confirmed_at` timestamp,
	`cancelled_by_user_id` varchar(64),
	`cancelled_at` timestamp,
	`cancellation_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_onboardings_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_recruitment_onb_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_onb_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_onb_application` FOREIGN KEY (`application_id`) REFERENCES `candidate_applications`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_onb_employee` FOREIGN KEY (`created_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_recruitment_onb_department` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_recruitment_onb_designation` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_recruitment_onb_location` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_recruitment_onb_manager` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recruitment_onb_comp_app` ON `recruitment_onboardings` (`company_id`,`application_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recruitment_onb_comp_emp` ON `recruitment_onboardings` (`company_id`,`created_employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_onb_tenant_comp` ON `recruitment_onboardings` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_onb_candidate` ON `recruitment_onboardings` (`candidate_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_onb_status` ON `recruitment_onboardings` (`company_id`,`status`);
