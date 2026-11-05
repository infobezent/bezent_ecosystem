CREATE TABLE `recruitment_stages` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`stage_order` int NOT NULL DEFAULT 0,
	`stage_type` enum('active','terminal_success','terminal_rejection','terminal_withdrawal') NOT NULL DEFAULT 'active',
	`badge_variant` varchar(30) NOT NULL DEFAULT 'neutral',
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_stages_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_recruitment_stages_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recruitment_stages_company_code` ON `recruitment_stages` (`company_id`,`code`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_stages_tenant_company` ON `recruitment_stages` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `job_requisitions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`requisition_number` varchar(50) NOT NULL,
	`job_title` varchar(255) NOT NULL,
	`department_id` varchar(64),
	`designation_id` varchar(64),
	`location_id` varchar(64),
	`location_name` varchar(255),
	`workplace_type` enum('on_site','hybrid','remote') NOT NULL DEFAULT 'on_site',
	`employment_type` enum('full_time','part_time','contract','internship') NOT NULL DEFAULT 'full_time',
	`experience_level` enum('entry','mid','senior','lead','executive') NOT NULL DEFAULT 'mid',
	`openings` int NOT NULL DEFAULT 1,
	`filled_count` int NOT NULL DEFAULT 0,
	`description` text,
	`requirements` json,
	`responsibilities` json,
	`skills` json,
	`experience_min` int,
	`experience_max` int,
	`salary_min` decimal(12,2),
	`salary_max` decimal(12,2),
	`currency` varchar(10) NOT NULL DEFAULT 'INR',
	`hiring_manager_id` varchar(64),
	`recruiter_id` varchar(64),
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('draft','pending_approval','open','on_hold','filled','closed','cancelled') NOT NULL DEFAULT 'draft',
	`target_close_date` varchar(10),
	`approved_at` timestamp NULL,
	`approved_by_user_id` varchar(64),
	`closed_at` timestamp NULL,
	`closed_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_requisitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_job_requisitions_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_job_requisitions_dept` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_job_requisitions_desig` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_job_requisitions_loc` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_job_requisitions_hm` FOREIGN KEY (`hiring_manager_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_job_requisitions_recruiter` FOREIGN KEY (`recruiter_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_requisitions_company_req_num` ON `job_requisitions` (`company_id`,`requisition_number`);
--> statement-breakpoint
CREATE INDEX `idx_job_requisitions_tenant_comp` ON `job_requisitions` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_job_requisitions_status` ON `job_requisitions` (`company_id`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_job_requisitions_department` ON `job_requisitions` (`department_id`);
--> statement-breakpoint
CREATE TABLE `job_postings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`requisition_id` varchar(64) NOT NULL,
	`posting_code` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`location` varchar(255) NOT NULL,
	`workplace_type` enum('on_site','hybrid','remote') NOT NULL DEFAULT 'on_site',
	`employment_type` enum('full_time','part_time','contract','internship') NOT NULL DEFAULT 'full_time',
	`published_at` timestamp NULL,
	`expires_at` timestamp NULL,
	`status` enum('draft','published','paused','closed') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_postings_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_job_postings_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_job_postings_requisition` FOREIGN KEY (`requisition_id`) REFERENCES `job_requisitions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_job_postings_company_code` ON `job_postings` (`company_id`,`posting_code`);
--> statement-breakpoint
CREATE INDEX `idx_job_postings_tenant_comp` ON `job_postings` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_job_postings_requisition` ON `job_postings` (`requisition_id`);
--> statement-breakpoint
CREATE INDEX `idx_job_postings_status` ON `job_postings` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`candidate_number` varchar(50) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`location` varchar(255),
	`current_company` varchar(255),
	`current_designation` varchar(255),
	`total_experience_years` decimal(4,1) DEFAULT '0.0',
	`relevant_experience_years` decimal(4,1) DEFAULT '0.0',
	`notice_period_days` int DEFAULT 0,
	`current_ctc_lpa` decimal(10,2),
	`expected_ctc_lpa` decimal(10,2),
	`skills` json,
	`tags` json,
	`source` enum('linkedin','career_page','referral','agency','naukri','campus','direct','other') NOT NULL DEFAULT 'direct',
	`referred_by` varchar(255),
	`resume_url` varchar(500),
	`resume_file_name` varchar(255),
	`summary` text,
	`status` enum('active','archived','blacklisted') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_candidates_tenant_number` ON `candidates` (`tenant_id`,`candidate_number`);
--> statement-breakpoint
CREATE INDEX `idx_candidates_tenant` ON `candidates` (`tenant_id`);
--> statement-breakpoint
CREATE INDEX `idx_candidates_tenant_email` ON `candidates` (`tenant_id`,`email`);
--> statement-breakpoint
CREATE INDEX `idx_candidates_tenant_name` ON `candidates` (`tenant_id`,`last_name`,`first_name`);
--> statement-breakpoint
CREATE TABLE `candidate_applications` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`candidate_id` varchar(64) NOT NULL,
	`requisition_id` varchar(64) NOT NULL,
	`job_posting_id` varchar(64),
	`current_stage_id` varchar(64),
	`stage` varchar(50) NOT NULL DEFAULT 'applied',
	`status` enum('active','hired','rejected','withdrawn') NOT NULL DEFAULT 'active',
	`applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`assigned_recruiter_id` varchar(64),
	`rating` int DEFAULT 0,
	`rejection_reason` varchar(500),
	`rejected_at` timestamp NULL,
	`withdrawn_at` timestamp NULL,
	`withdrawal_reason` varchar(500),
	`hired_at` timestamp NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_candidate_apps_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_candidate_apps_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_candidate_apps_requisition` FOREIGN KEY (`requisition_id`) REFERENCES `job_requisitions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_candidate_apps_posting` FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_candidate_apps_stage` FOREIGN KEY (`current_stage_id`) REFERENCES `recruitment_stages`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_candidate_apps_recruiter` FOREIGN KEY (`assigned_recruiter_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_tenant_comp` ON `candidate_applications` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_candidate` ON `candidate_applications` (`candidate_id`);
--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_requisition` ON `candidate_applications` (`requisition_id`);
--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_stage` ON `candidate_applications` (`company_id`,`stage`);
--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_status` ON `candidate_applications` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `recruitment_activities` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`application_id` varchar(64) NOT NULL,
	`candidate_id` varchar(64) NOT NULL,
	`actor_user_id` varchar(64),
	`actor_name` varchar(255),
	`type` enum('note','stage_change','status_change','recruiter_assigned','interview_scheduled','interview_rescheduled','interview_cancelled','interview_completed','rejection','withdrawal') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_activities_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_recruitment_act_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_act_app` FOREIGN KEY (`application_id`) REFERENCES `candidate_applications`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_act_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_act_app` ON `recruitment_activities` (`application_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_act_candidate` ON `recruitment_activities` (`candidate_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_act_tenant_comp` ON `recruitment_activities` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE TABLE `recruitment_interviews` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`application_id` varchar(64) NOT NULL,
	`candidate_id` varchar(64) NOT NULL,
	`round_name` varchar(100) NOT NULL,
	`interview_type` enum('screening','technical','system_design','managerial','cultural_fit','hr') NOT NULL DEFAULT 'technical',
	`scheduled_date` varchar(10) NOT NULL,
	`start_time` varchar(5) NOT NULL,
	`end_time` varchar(5) NOT NULL,
	`duration_minutes` int NOT NULL DEFAULT 60,
	`timezone` varchar(50) NOT NULL DEFAULT 'Asia/Kolkata',
	`location_or_link` varchar(500),
	`status` enum('scheduled','in_progress','completed','rescheduled','cancelled') NOT NULL DEFAULT 'scheduled',
	`reschedule_reason` varchar(500),
	`cancellation_reason` varchar(500),
	`feedback_status` enum('pending','submitted') NOT NULL DEFAULT 'pending',
	`feedback_recommendation` enum('strong_hire','hire','lean_hire','lean_no_hire','no_hire'),
	`feedback_score` int,
	`feedback_notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_interviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_recruitment_int_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_int_app` FOREIGN KEY (`application_id`) REFERENCES `candidate_applications`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_int_candidate` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_app` ON `recruitment_interviews` (`application_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_candidate` ON `recruitment_interviews` (`candidate_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_comp_date` ON `recruitment_interviews` (`company_id`,`scheduled_date`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_status` ON `recruitment_interviews` (`company_id`,`status`);
--> statement-breakpoint
CREATE TABLE `recruitment_interview_interviewers` (
	`id` varchar(64) NOT NULL,
	`interview_id` varchar(64) NOT NULL,
	`employee_id` varchar(64),
	`interviewer_name` varchar(255) NOT NULL,
	`interviewer_email` varchar(255),
	`interviewer_role` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_interview_interviewers_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_recruitment_panel_int` FOREIGN KEY (`interview_id`) REFERENCES `recruitment_interviews`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_recruitment_panel_emp` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_panel_int` ON `recruitment_interview_interviewers` (`interview_id`);
--> statement-breakpoint
CREATE INDEX `idx_recruitment_panel_emp` ON `recruitment_interview_interviewers` (`employee_id`);
