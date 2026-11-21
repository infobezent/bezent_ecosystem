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
	`applied_at` timestamp NOT NULL DEFAULT (now()),
	`assigned_recruiter_id` varchar(64),
	`rating` int DEFAULT 0,
	`rejection_reason` varchar(500),
	`rejected_at` timestamp,
	`withdrawn_at` timestamp,
	`withdrawal_reason` varchar(500),
	`hired_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_applications_id` PRIMARY KEY(`id`)
);
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_candidates_tenant_number` UNIQUE(`tenant_id`,`candidate_number`)
);
--> statement-breakpoint
CREATE TABLE `custom_forms` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`form_key` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_custom_forms_key` UNIQUE(`tenant_id`,`company_id`,`form_key`)
);
--> statement-breakpoint
CREATE TABLE `employee_clearance_items` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`action_id` varchar(64) NOT NULL,
	`department` enum('it','admin','finance','hr') NOT NULL,
	`item_title` varchar(255) NOT NULL,
	`description` text,
	`is_mandatory` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`status` enum('pending','cleared','waived') NOT NULL DEFAULT 'pending',
	`remarks` varchar(500),
	`cleared_by` varchar(64),
	`cleared_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_clearance_items_id` PRIMARY KEY(`id`)
);
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_import_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `employee_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holiday_calendar_locations` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`calendar_id` varchar(64) NOT NULL,
	`location_id` varchar(64) NOT NULL,
	CONSTRAINT `holiday_calendar_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_holiday_cal_loc_unique` UNIQUE(`calendar_id`,`location_id`)
);
--> statement-breakpoint
CREATE TABLE `holiday_calendars` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`year` int NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`is_default` boolean NOT NULL DEFAULT false,
	`optional_holiday_quota` int NOT NULL DEFAULT 0,
	`revision` int NOT NULL DEFAULT 0,
	`published_at` timestamp,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `holiday_calendars_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_holiday_cal_company_name_year` UNIQUE(`company_id`,`name`,`year`)
);
--> statement-breakpoint
CREATE TABLE `holidays` (
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
	CONSTRAINT `idx_holidays_calendar_date` UNIQUE(`calendar_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `hrms_shift_assignments` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`shift_id` varchar(64) NOT NULL,
	`assignment_scope` enum('employee','department','location') NOT NULL,
	`employee_id` varchar(64),
	`department_id` varchar(64),
	`location_id` varchar(64),
	`effective_start_date` varchar(10) NOT NULL,
	`effective_end_date` varchar(10),
	`is_active` boolean NOT NULL DEFAULT true,
	`notes` text,
	`created_by` varchar(64),
	`updated_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hrms_shift_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hrms_shifts` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`start_time` varchar(5) NOT NULL,
	`end_time` varchar(5) NOT NULL,
	`working_days` json NOT NULL,
	`break_minutes` int NOT NULL DEFAULT 60,
	`lunch_minutes` int NOT NULL DEFAULT 30,
	`grace_minutes` int NOT NULL DEFAULT 15,
	`is_overnight` boolean NOT NULL DEFAULT false,
	`color` varchar(20) DEFAULT '#2563EB',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(64),
	`updated_by` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hrms_shifts_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_hrms_shifts_comp_code` UNIQUE(`company_id`,`code`)
);
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
	`published_at` timestamp,
	`expires_at` timestamp,
	`status` enum('draft','published','paused','closed') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_postings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_job_postings_company_code` UNIQUE(`company_id`,`posting_code`)
);
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
	`approved_at` timestamp,
	`approved_by_user_id` varchar(64),
	`closed_at` timestamp,
	`closed_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_requisitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_job_requisitions_company_req_num` UNIQUE(`company_id`,`requisition_number`)
);
--> statement-breakpoint
CREATE TABLE `leave_accrual_rules` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`effective_from` varchar(10) NOT NULL,
	`grant_method` enum('upfront_annual','monthly','quarterly','half_yearly','manual_only') NOT NULL DEFAULT 'upfront_annual',
	`accrual_timing` enum('cycle_start','period_start','period_end') NOT NULL DEFAULT 'period_start',
	`pro_rata_on_joining` boolean NOT NULL DEFAULT true,
	`joining_cutoff_day` int NOT NULL DEFAULT 15,
	`pro_rata_on_exit` boolean NOT NULL DEFAULT true,
	`accrue_during_probation` boolean NOT NULL DEFAULT true,
	`backcredit_after_probation` boolean NOT NULL DEFAULT false,
	`accrue_during_lop` boolean NOT NULL DEFAULT true,
	`carry_forward_enabled` boolean NOT NULL DEFAULT false,
	`max_carry_forward_days` decimal(6,2),
	`max_accumulation_days` decimal(6,2),
	`carry_forward_expiry_months` int,
	`lapse_remaining` boolean NOT NULL DEFAULT true,
	`encashment_enabled` boolean NOT NULL DEFAULT false,
	`encashment_trigger` enum('cycle_end','exit','both') NOT NULL DEFAULT 'cycle_end',
	`min_balance_to_retain` decimal(6,2) NOT NULL DEFAULT '0.00',
	`max_encashable_days` decimal(6,2),
	`encashment_basis` enum('basic','gross') NOT NULL DEFAULT 'basic',
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_accrual_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_accrual_type_effective` UNIQUE(`leave_type_id`,`effective_from`)
);
--> statement-breakpoint
CREATE TABLE `leave_approval_workflows` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(500),
	`is_default` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`levels` json NOT NULL,
	`auto_approve_up_to_days` decimal(5,2),
	`skip_if_approver_is_applicant` boolean NOT NULL DEFAULT true,
	`fallback_approver_role_id` varchar(64),
	`cancellation_requires_approval` boolean NOT NULL DEFAULT false,
	`allow_self_approval_for_hr` boolean NOT NULL DEFAULT false,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_approval_workflows_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_wf_company_name` UNIQUE(`company_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `leave_balance_transactions` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`balance_id` varchar(64) NOT NULL,
	`cycle_start_date` varchar(10) NOT NULL,
	`txn_type` enum('opening','accrual','usage_reserve','usage_release','usage_confirm','usage_reversal','adjustment','carry_forward_in','lapse','encashment') NOT NULL,
	`days` decimal(6,2) NOT NULL,
	`reference_type` varchar(30),
	`reference_id` varchar(64),
	`reason` varchar(500),
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_balance_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_cycle_close_runs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`cycle_start_date` varchar(10) NOT NULL,
	`cycle_end_date` varchar(10) NOT NULL,
	`status` enum('pending','reviewed','committed') NOT NULL DEFAULT 'committed',
	`summary` json NOT NULL,
	`created_by_user_id` varchar(64) NOT NULL,
	`committed_by_user_id` varchar(64),
	`committed_at` timestamp,
	`reviewed_by_user_id` varchar(64),
	`reviewed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_cycle_close_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_cycle_close_company_cycle` UNIQUE(`company_id`,`cycle_start_date`)
);
--> statement-breakpoint
CREATE TABLE `leave_encashment_handovers` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`cycle_start_date` varchar(10) NOT NULL,
	`days` decimal(6,2) NOT NULL,
	`basis` enum('basic','gross') NOT NULL,
	`trigger` enum('cycle_end','exit') NOT NULL,
	`status` enum('pending_payroll','processed') NOT NULL DEFAULT 'pending_payroll',
	`run_id` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_encashment_handovers_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_encash_unique` UNIQUE(`employee_id`,`leave_type_id`,`cycle_start_date`,`trigger`)
);
--> statement-breakpoint
CREATE TABLE `leave_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`description` text,
	`status` enum('draft','active','scheduled','archived') NOT NULL DEFAULT 'draft',
	`scope` enum('company','department','location','employment_type','custom') NOT NULL DEFAULT 'company',
	`scope_id` varchar(64),
	`scope_name` varchar(100),
	`effective_from` varchar(10) NOT NULL,
	`effective_to` varchar(10),
	`linked_leave_type_ids` json NOT NULL,
	`priority` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_policies_company_code` UNIQUE(`company_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `leave_policy_entitlements` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`policy_id` varchar(64) NOT NULL,
	`leave_type_id` varchar(64) NOT NULL,
	`annual_quota` decimal(6,2),
	`max_per_year_override` decimal(6,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_policy_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_pol_ent_policy_type` UNIQUE(`policy_id`,`leave_type_id`)
);
--> statement-breakpoint
CREATE TABLE `leave_request_approvals` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`request_id` varchar(64) NOT NULL,
	`purpose` enum('approval','cancellation') NOT NULL DEFAULT 'approval',
	`level` int NOT NULL,
	`approver_employee_id` varchar(64),
	`approver_role_id` varchar(64),
	`action` enum('pending','approved','rejected','escalated','skipped','cancelled','waiting') NOT NULL DEFAULT 'waiting',
	`acted_by_user_id` varchar(64),
	`comment` varchar(500),
	`acted_at` timestamp,
	`sla_due_at` timestamp,
	`sla_breached_at` timestamp,
	`on_sla_breach` enum('escalate_to_next','notify_only','auto_approve') NOT NULL DEFAULT 'notify_only',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_request_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_restriction_rules` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`rule_key` varchar(64) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`rule_type` enum('clubbing','blackout','min_notice','min_gap','frequency_cap','team_concurrency') NOT NULL,
	`name` varchar(100) NOT NULL,
	`config` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`superseded_at` timestamp,
	`created_by_user_id` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_restriction_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_restr_key_version` UNIQUE(`rule_key`,`version`)
);
--> statement-breakpoint
CREATE TABLE `leave_types` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(20) NOT NULL,
	`short_label` varchar(50) NOT NULL,
	`color_token` varchar(30) NOT NULL DEFAULT 'warning',
	`description` text,
	`instructions` text,
	`category` enum('paid','unpaid','statutory','special_event','compensatory','optional_holiday','loss_of_pay') NOT NULL DEFAULT 'paid',
	`visible_to_employee` boolean NOT NULL DEFAULT true,
	`is_tracked` boolean NOT NULL DEFAULT true,
	`grant_method` enum('fixed_annual','periodic_accrual','per_days_worked','anniversary','event_based','auto_date','manual_only','formula') NOT NULL DEFAULT 'fixed_annual',
	`unit` enum('days','half_days','hours') NOT NULL DEFAULT 'days',
	`allow_half_day` boolean NOT NULL DEFAULT true,
	`min_per_request` decimal(5,2) NOT NULL DEFAULT '1.00',
	`max_per_request` decimal(5,2),
	`max_per_year` decimal(5,2),
	`max_consecutive_days` int,
	`count_weekly_off` boolean NOT NULL DEFAULT false,
	`count_holidays` boolean NOT NULL DEFAULT false,
	`sandwich_rule_enabled` boolean NOT NULL DEFAULT false,
	`document_requirement` enum('none','optional','mandatory','mandatory_after_n_days') NOT NULL DEFAULT 'none',
	`document_threshold_days` int,
	`certificate_type` varchar(100),
	`carry_forward_enabled` boolean NOT NULL DEFAULT false,
	`encashment_enabled` boolean NOT NULL DEFAULT false,
	`negative_balance_enabled` boolean NOT NULL DEFAULT false,
	`negative_balance_limit` decimal(5,2),
	`counts_toward_service` boolean NOT NULL DEFAULT true,
	`allowed_in_probation` boolean NOT NULL DEFAULT true,
	`allowed_in_notice_period` boolean NOT NULL DEFAULT false,
	`gender_eligibility` enum('all','female','male') NOT NULL DEFAULT 'all',
	`attendance_status_code` varchar(20) NOT NULL DEFAULT 'L',
	`counts_as_present` boolean NOT NULL DEFAULT false,
	`payroll_impact` enum('paid','unpaid','partly_paid') NOT NULL DEFAULT 'paid',
	`team_calendar_visibility` enum('leave_type','generic_leave','none') NOT NULL DEFAULT 'generic_leave',
	`workflow_id` varchar(64),
	`is_active` boolean NOT NULL DEFAULT true,
	`is_archived` boolean NOT NULL DEFAULT false,
	`effective_from` varchar(10) NOT NULL,
	`effective_to` varchar(10),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`weekly_off_treatment` varchar(20) NOT NULL DEFAULT 'inherit',
	`holiday_treatment` varchar(20) NOT NULL DEFAULT 'inherit',
	`max_per_month` decimal(5,2),
	CONSTRAINT `leave_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_leave_types_company_code` UNIQUE(`company_id`,`code`)
);
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recruitment_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recruitment_interview_interviewers` (
	`id` varchar(64) NOT NULL,
	`interview_id` varchar(64) NOT NULL,
	`employee_id` varchar(64),
	`interviewer_name` varchar(255) NOT NULL,
	`interviewer_email` varchar(255),
	`interviewer_role` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recruitment_interview_interviewers_id` PRIMARY KEY(`id`)
);
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_onboardings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_recruitment_onb_comp_app` UNIQUE(`company_id`,`application_id`),
	CONSTRAINT `idx_recruitment_onb_comp_emp` UNIQUE(`company_id`,`created_employee_id`)
);
--> statement-breakpoint
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recruitment_stages_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_recruitment_stages_company_code` UNIQUE(`company_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `workforce_clearance_checklist_templates` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`department` enum('it','admin','finance','hr') NOT NULL,
	`item_title` varchar(255) NOT NULL,
	`description` text,
	`is_mandatory` boolean NOT NULL DEFAULT true,
	`display_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workforce_clearance_checklist_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workforce_employment_types` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`work_hours_per_week` decimal(4,1) NOT NULL DEFAULT '40.0',
	`is_benefits_eligible` boolean NOT NULL DEFAULT true,
	`default_notice_days` int NOT NULL DEFAULT 60,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_employment_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_emp_type_comp_code` UNIQUE(`company_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `workforce_general_settings` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`generation_mode` enum('automatic','manual') NOT NULL DEFAULT 'automatic',
	`id_prefix` varchar(32) NOT NULL DEFAULT 'EMP-',
	`id_suffix` varchar(32),
	`sequence_length` int NOT NULL DEFAULT 4,
	`starting_number` int NOT NULL DEFAULT 1001,
	`current_counter` int NOT NULL DEFAULT 1000,
	`reset_frequency` enum('never','calendar_year','financial_year') NOT NULL DEFAULT 'never',
	`allow_manual_override` boolean NOT NULL DEFAULT true,
	`prevent_id_reuse` boolean NOT NULL DEFAULT true,
	`auto_provision_user` boolean NOT NULL DEFAULT true,
	`activation_timing` enum('instant','joining_date','manual') NOT NULL DEFAULT 'instant',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_general_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_general_company` UNIQUE(`company_id`)
);
--> statement-breakpoint
CREATE TABLE `workforce_lifecycle_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`require_releasing_manager_approval` boolean NOT NULL DEFAULT true,
	`effective_date_alignment` enum('immediate','next_payroll_month','custom') NOT NULL DEFAULT 'next_payroll_month',
	`auto_reassign_shifts` boolean NOT NULL DEFAULT true,
	`auto_reassign_leave_approver` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_lifecycle_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_lifecycle_company` UNIQUE(`company_id`)
);
--> statement-breakpoint
CREATE TABLE `workforce_offboarding_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`probation_notice_days` int NOT NULL DEFAULT 15,
	`confirmed_notice_days` int NOT NULL DEFAULT 60,
	`leadership_notice_days` int NOT NULL DEFAULT 90,
	`allow_notice_buyout` boolean NOT NULL DEFAULT true,
	`allow_leave_offset` boolean NOT NULL DEFAULT true,
	`resignation_withdrawal_window_days` int NOT NULL DEFAULT 7,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_offboarding_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_offboarding_company` UNIQUE(`company_id`)
);
--> statement-breakpoint
CREATE TABLE `workforce_probation_policies` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`default_probation_days` int NOT NULL DEFAULT 90,
	`confirmation_mode` enum('manager_review','auto_confirm') NOT NULL DEFAULT 'manager_review',
	`reminder_lead_days` int NOT NULL DEFAULT 14,
	`max_extension_days` int NOT NULL DEFAULT 90,
	`max_extensions_allowed` int NOT NULL DEFAULT 1,
	`auto_generate_letter` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workforce_probation_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_workforce_probation_company` UNIQUE(`company_id`)
);
--> statement-breakpoint
ALTER TABLE `employee_leave_balances` DROP INDEX `idx_emp_leave_bal_type_year`;--> statement-breakpoint
ALTER TABLE `employee_attendance` MODIFY COLUMN `status` enum('present','absent','half_day','on_leave','holiday','incomplete','weekly_off') NOT NULL DEFAULT 'present';--> statement-breakpoint
ALTER TABLE `employee_leave_balances` MODIFY COLUMN `leave_type` enum('annual','sick','casual','unpaid');--> statement-breakpoint
ALTER TABLE `employee_leave_balances` MODIFY COLUMN `total_days` decimal(6,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `employee_leave_balances` MODIFY COLUMN `used_days` decimal(6,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `employee_leave_balances` MODIFY COLUMN `pending_days` decimal(6,2) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `employee_leave_requests` MODIFY COLUMN `leave_type` enum('annual','sick','casual','unpaid');--> statement-breakpoint
ALTER TABLE `employee_leave_requests` MODIFY COLUMN `total_days` decimal(5,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_leave_requests` MODIFY COLUMN `status` enum('pending','approved','rejected','cancelled','cancellation_pending') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD `leave_type_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD `carried_forward_days` decimal(6,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD `carry_forward_expires_on` varchar(10);--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD `cycle_start_date` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD `cycle_end_date` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `leave_type_id` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `policy_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `settings_version_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `workflow_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `current_level` int;--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `submitted_by_user_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `cancelled_by_user_id` varchar(64);--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `cancellation_reason` varchar(500);--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD `cancelled_at` timestamp;--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD CONSTRAINT `idx_emp_leave_bal_type_cycle` UNIQUE(`company_id`,`employee_id`,`leave_type_id`,`cycle_start_date`);--> statement-breakpoint
ALTER TABLE `candidate_applications` ADD CONSTRAINT `candidate_applications_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_applications` ADD CONSTRAINT `candidate_applications_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_applications` ADD CONSTRAINT `candidate_applications_requisition_id_job_requisitions_id_fk` FOREIGN KEY (`requisition_id`) REFERENCES `job_requisitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_applications` ADD CONSTRAINT `candidate_applications_job_posting_id_job_postings_id_fk` FOREIGN KEY (`job_posting_id`) REFERENCES `job_postings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_applications` ADD CONSTRAINT `candidate_applications_current_stage_id_recruitment_stages_id_fk` FOREIGN KEY (`current_stage_id`) REFERENCES `recruitment_stages`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_applications` ADD CONSTRAINT `candidate_applications_assigned_recruiter_id_employees_id_fk` FOREIGN KEY (`assigned_recruiter_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_forms` ADD CONSTRAINT `custom_forms_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_clearance_items` ADD CONSTRAINT `employee_clearance_items_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_clearance_items` ADD CONSTRAINT `employee_clearance_items_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_clearance_items` ADD CONSTRAINT `employee_clearance_items_action_id_employee_actions_id_fk` FOREIGN KEY (`action_id`) REFERENCES `employee_actions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_import_rows` ADD CONSTRAINT `employee_import_rows_import_id_employee_imports_id_fk` FOREIGN KEY (`import_id`) REFERENCES `employee_imports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_imports` ADD CONSTRAINT `employee_imports_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `holiday_calendar_locations` ADD CONSTRAINT `holiday_calendar_locations_calendar_id_holiday_calendars_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `holiday_calendar_locations` ADD CONSTRAINT `holiday_calendar_locations_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `holiday_calendars` ADD CONSTRAINT `holiday_calendars_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_calendar_id_holiday_calendars_id_fk` FOREIGN KEY (`calendar_id`) REFERENCES `holiday_calendars`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hrms_shift_assignments` ADD CONSTRAINT `hrms_shift_assignments_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hrms_shift_assignments` ADD CONSTRAINT `hrms_shift_assignments_shift_id_hrms_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `hrms_shifts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hrms_shift_assignments` ADD CONSTRAINT `hrms_shift_assignments_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hrms_shift_assignments` ADD CONSTRAINT `hrms_shift_assignments_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hrms_shift_assignments` ADD CONSTRAINT `hrms_shift_assignments_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hrms_shifts` ADD CONSTRAINT `hrms_shifts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_postings` ADD CONSTRAINT `job_postings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_postings` ADD CONSTRAINT `job_postings_requisition_id_job_requisitions_id_fk` FOREIGN KEY (`requisition_id`) REFERENCES `job_requisitions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_requisitions` ADD CONSTRAINT `job_requisitions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_requisitions` ADD CONSTRAINT `job_requisitions_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_requisitions` ADD CONSTRAINT `job_requisitions_designation_id_designations_id_fk` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_requisitions` ADD CONSTRAINT `job_requisitions_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_requisitions` ADD CONSTRAINT `job_requisitions_hiring_manager_id_employees_id_fk` FOREIGN KEY (`hiring_manager_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `job_requisitions` ADD CONSTRAINT `job_requisitions_recruiter_id_employees_id_fk` FOREIGN KEY (`recruiter_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_accrual_rules` ADD CONSTRAINT `leave_accrual_rules_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_approval_workflows` ADD CONSTRAINT `leave_approval_workflows_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balance_transactions` ADD CONSTRAINT `leave_balance_transactions_balance_id_employee_leave_balances_id_fk` FOREIGN KEY (`balance_id`) REFERENCES `employee_leave_balances`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_cycle_close_runs` ADD CONSTRAINT `leave_cycle_close_runs_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_policies` ADD CONSTRAINT `leave_policies_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_policy_entitlements` ADD CONSTRAINT `leave_policy_entitlements_policy_id_leave_policies_id_fk` FOREIGN KEY (`policy_id`) REFERENCES `leave_policies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_policy_entitlements` ADD CONSTRAINT `leave_policy_entitlements_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_request_approvals` ADD CONSTRAINT `leave_request_approvals_request_id_employee_leave_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `employee_leave_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_restriction_rules` ADD CONSTRAINT `leave_restriction_rules_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_types` ADD CONSTRAINT `leave_types_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_activities` ADD CONSTRAINT `recruitment_activities_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_activities` ADD CONSTRAINT `recruitment_activities_application_id_candidate_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `candidate_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_activities` ADD CONSTRAINT `recruitment_activities_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_interview_interviewers` ADD CONSTRAINT `recruitment_interview_interviewers_interview_id_recruitment_interviews_id_fk` FOREIGN KEY (`interview_id`) REFERENCES `recruitment_interviews`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_interview_interviewers` ADD CONSTRAINT `recruitment_interview_interviewers_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_interviews` ADD CONSTRAINT `recruitment_interviews_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_interviews` ADD CONSTRAINT `recruitment_interviews_application_id_candidate_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `candidate_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_interviews` ADD CONSTRAINT `recruitment_interviews_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_candidate_id_candidates_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_application_id_candidate_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `candidate_applications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_created_employee_id_employees_id_fk` FOREIGN KEY (`created_employee_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_department_id_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_designation_id_designations_id_fk` FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_onboardings` ADD CONSTRAINT `recruitment_onboardings_reporting_manager_id_employees_id_fk` FOREIGN KEY (`reporting_manager_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recruitment_stages` ADD CONSTRAINT `recruitment_stages_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workforce_clearance_checklist_templates` ADD CONSTRAINT `workforce_clearance_checklist_templates_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workforce_employment_types` ADD CONSTRAINT `workforce_employment_types_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workforce_general_settings` ADD CONSTRAINT `workforce_general_settings_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workforce_lifecycle_policies` ADD CONSTRAINT `workforce_lifecycle_policies_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workforce_offboarding_policies` ADD CONSTRAINT `workforce_offboarding_policies_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workforce_probation_policies` ADD CONSTRAINT `workforce_probation_policies_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_tenant_comp` ON `candidate_applications` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_candidate` ON `candidate_applications` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_requisition` ON `candidate_applications` (`requisition_id`);--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_stage` ON `candidate_applications` (`company_id`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_candidate_apps_status` ON `candidate_applications` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_candidates_tenant` ON `candidates` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_candidates_tenant_email` ON `candidates` (`tenant_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_candidates_tenant_name` ON `candidates` (`tenant_id`,`last_name`,`first_name`);--> statement-breakpoint
CREATE INDEX `idx_custom_forms_company` ON `custom_forms` (`tenant_id`,`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_clearance_items_action` ON `employee_clearance_items` (`action_id`);--> statement-breakpoint
CREATE INDEX `idx_clearance_items_employee` ON `employee_clearance_items` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_clearance_items_tenant_company` ON `employee_clearance_items` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_import_rows_import_id` ON `employee_import_rows` (`import_id`);--> statement-breakpoint
CREATE INDEX `idx_import_rows_status` ON `employee_import_rows` (`status`);--> statement-breakpoint
CREATE INDEX `idx_import_rows_row_number` ON `employee_import_rows` (`import_id`,`row_number`);--> statement-breakpoint
CREATE INDEX `idx_employee_imports_tenant_company` ON `employee_imports` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_imports_status` ON `employee_imports` (`status`);--> statement-breakpoint
CREATE INDEX `idx_employee_imports_created_at` ON `employee_imports` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_holiday_cal_loc_location` ON `holiday_calendar_locations` (`company_id`,`location_id`);--> statement-breakpoint
CREATE INDEX `idx_holiday_cal_tenant_comp` ON `holiday_calendars` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_holiday_cal_year_status` ON `holiday_calendars` (`company_id`,`year`,`status`);--> statement-breakpoint
CREATE INDEX `idx_holidays_tenant_comp` ON `holidays` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_tenant_comp` ON `hrms_shift_assignments` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_shift` ON `hrms_shift_assignments` (`shift_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_emp` ON `hrms_shift_assignments` (`company_id`,`assignment_scope`,`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_dept` ON `hrms_shift_assignments` (`company_id`,`assignment_scope`,`department_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_loc` ON `hrms_shift_assignments` (`company_id`,`assignment_scope`,`location_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shift_asgn_dates` ON `hrms_shift_assignments` (`effective_start_date`,`effective_end_date`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shifts_tenant_comp` ON `hrms_shifts` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_hrms_shifts_comp_active` ON `hrms_shifts` (`company_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_tenant_comp` ON `job_postings` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_requisition` ON `job_postings` (`requisition_id`);--> statement-breakpoint
CREATE INDEX `idx_job_postings_status` ON `job_postings` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_job_requisitions_tenant_comp` ON `job_requisitions` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_job_requisitions_status` ON `job_requisitions` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_job_requisitions_department` ON `job_requisitions` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_accrual_tenant_comp` ON `leave_accrual_rules` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_wf_tenant_comp` ON `leave_approval_workflows` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_bal_txn_tenant_comp` ON `leave_balance_transactions` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_bal_txn_balance` ON `leave_balance_transactions` (`balance_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_bal_txn_employee_type` ON `leave_balance_transactions` (`employee_id`,`leave_type_id`,`cycle_start_date`);--> statement-breakpoint
CREATE INDEX `idx_leave_bal_txn_reference` ON `leave_balance_transactions` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_encash_company_status` ON `leave_encashment_handovers` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_leave_policies_tenant_comp` ON `leave_policies` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_policies_status` ON `leave_policies` (`status`);--> statement-breakpoint
CREATE INDEX `idx_leave_policies_scope` ON `leave_policies` (`scope`,`scope_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_policies_effective` ON `leave_policies` (`effective_from`,`effective_to`);--> statement-breakpoint
CREATE INDEX `idx_leave_pol_ent_tenant_comp` ON `leave_policy_entitlements` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_pol_ent_type` ON `leave_policy_entitlements` (`leave_type_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_req_appr_request` ON `leave_request_approvals` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_req_appr_queue` ON `leave_request_approvals` (`company_id`,`action`,`approver_employee_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_req_appr_role` ON `leave_request_approvals` (`company_id`,`action`,`approver_role_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_req_appr_sla` ON `leave_request_approvals` (`action`,`sla_due_at`);--> statement-breakpoint
CREATE INDEX `idx_leave_restr_tenant_comp` ON `leave_restriction_rules` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_restr_current` ON `leave_restriction_rules` (`company_id`,`rule_type`,`superseded_at`);--> statement-breakpoint
CREATE INDEX `idx_leave_types_tenant_comp` ON `leave_types` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_leave_types_category` ON `leave_types` (`category`);--> statement-breakpoint
CREATE INDEX `idx_leave_types_active` ON `leave_types` (`is_active`,`is_archived`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_act_app` ON `recruitment_activities` (`application_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_act_candidate` ON `recruitment_activities` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_act_tenant_comp` ON `recruitment_activities` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_panel_int` ON `recruitment_interview_interviewers` (`interview_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_panel_emp` ON `recruitment_interview_interviewers` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_app` ON `recruitment_interviews` (`application_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_candidate` ON `recruitment_interviews` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_comp_date` ON `recruitment_interviews` (`company_id`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_int_status` ON `recruitment_interviews` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_onb_tenant_comp` ON `recruitment_onboardings` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_onb_candidate` ON `recruitment_onboardings` (`candidate_id`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_onb_status` ON `recruitment_onboardings` (`company_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_recruitment_stages_tenant_company` ON `recruitment_stages` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_workforce_clearance_comp_dept` ON `workforce_clearance_checklist_templates` (`company_id`,`department`);--> statement-breakpoint
CREATE INDEX `idx_workforce_emp_type_tenant_comp` ON `workforce_employment_types` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_workforce_general_tenant_comp` ON `workforce_general_settings` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_workforce_lifecycle_tenant_comp` ON `workforce_lifecycle_policies` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_workforce_offboarding_tenant_comp` ON `workforce_offboarding_policies` (`tenant_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_workforce_probation_tenant_comp` ON `workforce_probation_policies` (`tenant_id`,`company_id`);--> statement-breakpoint
ALTER TABLE `employee_leave_balances` ADD CONSTRAINT `employee_leave_balances_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_leave_requests` ADD CONSTRAINT `employee_leave_requests_leave_type_id_leave_types_id_fk` FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_emp_leave_req_type` ON `employee_leave_requests` (`leave_type_id`);