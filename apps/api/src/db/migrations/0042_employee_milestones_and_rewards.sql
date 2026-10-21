CREATE TABLE IF NOT EXISTS `milestone_configs` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`milestone_key` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`required_hours` int NOT NULL DEFAULT 100000,
	`badge_icon` varchar(100) NOT NULL DEFAULT 'award',
	`badge_label` varchar(100) NOT NULL DEFAULT 'Centurion of Service',
	`poster_template` json,
	`approval_required` boolean NOT NULL DEFAULT true,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestone_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_ms_cfg_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_milestone_cfg_tenant_comp` ON `milestone_configs` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_milestone_cfg_key` ON `milestone_configs` (`tenant_id`,`company_id`,`milestone_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `employee_milestone_achievements` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`milestone_key` varchar(64) NOT NULL,
	`milestone_title` varchar(255) NOT NULL,
	`milestone_hours` int NOT NULL,
	`achieved_hours` decimal(10,2) NOT NULL,
	`status` enum('unlocked','reviewed','published') NOT NULL DEFAULT 'unlocked',
	`achieved_at` timestamp NOT NULL DEFAULT (now()),
	`notified_at` timestamp,
	`poster_published_at` timestamp,
	`poster_data` json,
	`feed_post_id` varchar(64),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_milestone_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_emp_ms_ach_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_emp_ms_ach_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_emp_ms_ach_tenant_comp` ON `employee_milestone_achievements` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_emp_ms_ach_emp` ON `employee_milestone_achievements` (`employee_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_emp_ms_ach_unique` ON `employee_milestone_achievements` (`tenant_id`,`company_id`,`employee_id`,`milestone_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rewards_catalogue` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`milestone_key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL DEFAULT 'gift',
	`image_url` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rewards_catalogue_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_rew_cat_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_rew_cat_tenant_comp` ON `rewards_catalogue` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_rew_cat_ms` ON `rewards_catalogue` (`milestone_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `employee_reward_assignments` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`employee_id` varchar(64) NOT NULL,
	`achievement_id` varchar(64) NOT NULL,
	`reward_id` varchar(64) NOT NULL,
	`reward_name` varchar(255) NOT NULL,
	`status` enum('eligible','pending_approval','approved','assigned','dispatched','fulfilled','cancelled') NOT NULL DEFAULT 'eligible',
	`approved_by_user_id` varchar(64),
	`approved_at` timestamp,
	`fulfilled_at` timestamp,
	`notes` text,
	`audit_history` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employee_reward_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_emp_rew_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_emp_rew_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_emp_rew_tenant_comp` ON `employee_reward_assignments` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_emp_rew_emp` ON `employee_reward_assignments` (`employee_id`);
--> statement-breakpoint
CREATE INDEX `idx_emp_rew_ach` ON `employee_reward_assignments` (`achievement_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `company_feed_posts` (
	`id` varchar(64) NOT NULL,
	`tenant_id` varchar(64) NOT NULL,
	`company_id` varchar(64) NOT NULL,
	`author_id` varchar(64),
	`type` enum('birthday','new_joiner','anniversary','holiday','event','announcement','milestone_poster') NOT NULL,
	`title` varchar(255) NOT NULL,
	`subtitle` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`badge` varchar(100) NOT NULL,
	`poster_image_url` varchar(500),
	`likes_count` int NOT NULL DEFAULT 0,
	`comments_count` int NOT NULL DEFAULT 0,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_feed_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `fk_feed_posts_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_feed_posts_tenant_comp` ON `company_feed_posts` (`tenant_id`,`company_id`);
--> statement-breakpoint
CREATE INDEX `idx_feed_posts_status` ON `company_feed_posts` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_feed_posts_created` ON `company_feed_posts` (`created_at`);
