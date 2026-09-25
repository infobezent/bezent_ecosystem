CREATE TABLE `employee_bank_accounts` (
	`employee_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`account_holder_name` varchar(200) NOT NULL,
	`account_number` varchar(34) NOT NULL,
	`ifsc_code` varchar(11) NOT NULL,
	`bank_name` varchar(200) NOT NULL,
	`branch_name` varchar(200),
	`bank_location` varchar(200),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_bank_accounts_employee_id` PRIMARY KEY(`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `employee_emergency_contacts` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`priority` enum('primary','secondary') NOT NULL,
	`name` varchar(200) NOT NULL,
	`relationship` varchar(50) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`email` varchar(255),
	`address` varchar(500),
	`is_private` boolean NOT NULL DEFAULT false,
	CONSTRAINT `employee_emergency_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_emp_emergency_employee_priority` UNIQUE(`employee_id`,`priority`)
);
--> statement-breakpoint
CREATE TABLE `employee_family_members` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`relationship` varchar(50) NOT NULL,
	`date_of_birth` varchar(10),
	`phone` varchar(50),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `employee_family_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_nominees` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`name` varchar(200) NOT NULL,
	`relationship` varchar(50) NOT NULL,
	`share_percentage` int NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `employee_nominees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_personal_details` (
	`employee_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`middle_name` varchar(100),
	`preferred_name` varchar(100),
	`gender` varchar(50),
	`date_of_birth` varchar(10),
	`marital_status` varchar(50),
	`blood_group` varchar(10),
	`nationality` varchar(100),
	`native_language` varchar(100),
	`father_name` varchar(200),
	`guardian_name` varchar(200),
	`personal_email` varchar(255),
	`home_phone` varchar(50),
	`business_phone` varchar(50),
	`work_phone` varchar(50),
	`address_street` varchar(255),
	`address_city` varchar(100),
	`address_district` varchar(100),
	`address_state` varchar(100),
	`address_postal_code` varchar(20),
	`address_country` varchar(100),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_personal_details_employee_id` PRIMARY KEY(`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `employee_skills` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`skill_name` varchar(200) NOT NULL,
	`skill_type` varchar(50) NOT NULL,
	`proficiency` enum('Beginner','Intermediate','Advanced','Expert') NOT NULL,
	`level` varchar(50),
	`assessed_on` varchar(10),
	`years_of_experience` int,
	`examiner_employee_id` varchar(64),
	`verified_by_employee_id` varchar(64),
	`mentor_employee_id` varchar(64),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `employee_skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_work_schedules` (
	`employee_id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`working_calendar` varchar(100),
	`work_schedule` varchar(100),
	`working_days` json NOT NULL,
	`start_time` varchar(5) NOT NULL,
	`end_time` varchar(5) NOT NULL,
	`break_minutes` int NOT NULL DEFAULT 0,
	`lunch_minutes` int NOT NULL DEFAULT 0,
	`time_zone` varchar(64),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_work_schedules_employee_id` PRIMARY KEY(`employee_id`)
);
--> statement-breakpoint
ALTER TABLE `employees` ADD `source_of_hire` enum('direct_applicant','referral','agency','campus','linkedin','other');--> statement-breakpoint
ALTER TABLE `employees` ADD `notice_period_days` int;--> statement-breakpoint
ALTER TABLE `employees` ADD `contract_end_date` varchar(10);--> statement-breakpoint
ALTER TABLE `employee_bank_accounts` ADD CONSTRAINT `employee_bank_accounts_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_bank_accounts` ADD CONSTRAINT `employee_bank_accounts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_emergency_contacts` ADD CONSTRAINT `employee_emergency_contacts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_emergency_contacts` ADD CONSTRAINT `employee_emergency_contacts_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_family_members` ADD CONSTRAINT `employee_family_members_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_family_members` ADD CONSTRAINT `employee_family_members_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_nominees` ADD CONSTRAINT `employee_nominees_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_nominees` ADD CONSTRAINT `employee_nominees_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD CONSTRAINT `employee_personal_details_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_personal_details` ADD CONSTRAINT `employee_personal_details_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_skills` ADD CONSTRAINT `employee_skills_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_skills` ADD CONSTRAINT `employee_skills_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_skills` ADD CONSTRAINT `employee_skills_examiner_employee_id_employees_id_fk` FOREIGN KEY (`examiner_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_skills` ADD CONSTRAINT `employee_skills_verified_by_employee_id_employees_id_fk` FOREIGN KEY (`verified_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_skills` ADD CONSTRAINT `employee_skills_mentor_employee_id_employees_id_fk` FOREIGN KEY (`mentor_employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_work_schedules` ADD CONSTRAINT `employee_work_schedules_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_work_schedules` ADD CONSTRAINT `employee_work_schedules_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_emp_bank_tenant_company` ON `employee_bank_accounts` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_emergency_tenant_company` ON `employee_emergency_contacts` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_family_tenant_company` ON `employee_family_members` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_family_employee` ON `employee_family_members` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_nominee_tenant_company` ON `employee_nominees` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_nominee_employee` ON `employee_nominees` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_personal_tenant_company` ON `employee_personal_details` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_skill_tenant_company` ON `employee_skills` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_skill_employee` ON `employee_skills` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_emp_work_tenant_company` ON `employee_work_schedules` (`tenant_id`,`company_id`);