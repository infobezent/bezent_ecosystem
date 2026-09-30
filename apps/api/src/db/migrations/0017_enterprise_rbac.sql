CREATE TABLE IF NOT EXISTS `roles` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64),
  `company_id` varchar(64),
  `code` varchar(64) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500),
  `module_code` enum('hrms','crm','project_management'),
  `is_system` boolean NOT NULL DEFAULT false,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` varchar(64),
  `updated_by` varchar(64),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_roles_tenant_company` (`tenant_id`, `company_id`),
  UNIQUE INDEX `idx_roles_company_code` (`tenant_id`, `company_id`, `code`),
  CONSTRAINT `fk_roles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `role_id` varchar(64) NOT NULL,
  `permission_id` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_role_permissions_tenant_company` (`tenant_id`, `company_id`),
  UNIQUE INDEX `idx_role_permissions_role_perm` (`role_id`, `permission_id`),
  CONSTRAINT `fk_role_permissions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `role_assignments` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `role_id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) NOT NULL,
  `company_id` varchar(64) NOT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `assigned_by` varchar(64),
  `revoked_by` varchar(64),
  `revoked_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_role_assignments_tenant_company` (`tenant_id`, `company_id`),
  INDEX `idx_role_assignments_user` (`user_id`),
  INDEX `idx_role_assignments_role` (`role_id`),
  UNIQUE INDEX `idx_role_assignments_user_company_role` (`user_id`, `company_id`, `role_id`),
  CONSTRAINT `fk_role_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_role_assignments_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_role_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
);
--> statement-breakpoint
-- System roles. Identifiers match SYSTEM_ROLES in platform/access/catalog.
INSERT IGNORE INTO `roles` (`id`, `tenant_id`, `company_id`, `code`, `name`, `description`, `module_code`, `is_system`, `status`) VALUES
  ('role_sys_company_admin', NULL, NULL, 'company_admin', 'Company Administrator', 'Administers the company: users, role assignments, profile, modules and audit.', NULL, true, 'active'),
  ('role_sys_hr_manager', NULL, NULL, 'hr_manager', 'HR', 'Workforce administration: employees, onboarding, documents, organization, attendance and leave.', 'hrms', true, 'active'),
  ('role_sys_manager', NULL, NULL, 'manager', 'Manager', 'Team operations: team members, team attendance and team leave approvals.', 'hrms', true, 'active'),
  ('role_sys_employee', NULL, NULL, 'employee', 'Employee', 'Workforce member. Self-service access follows the linked employee record.', 'hrms', true, 'active'),
  ('role_sys_user', NULL, NULL, 'user', 'Platform User', 'Basic company member without administrative permissions.', NULL, true, 'active');
--> statement-breakpoint
-- Backfill: every existing membership role becomes a role assignment in the same company.
INSERT IGNORE INTO `role_assignments` (`id`, `user_id`, `role_id`, `tenant_id`, `company_id`, `status`)
SELECT
  CONCAT('ra_', `m`.`id`),
  `m`.`user_id`,
  CONCAT('role_sys_', `m`.`role`),
  `m`.`tenant_id`,
  `m`.`company_id`,
  CASE WHEN `m`.`status` = 'active' THEN 'active' ELSE 'revoked' END
FROM `memberships` `m`;
