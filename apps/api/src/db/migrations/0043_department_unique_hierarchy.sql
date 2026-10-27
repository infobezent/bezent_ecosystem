CREATE UNIQUE INDEX `uq_departments_company_parent_name` ON `departments` (`company_id`, (COALESCE(`parent_department_id`, '__ROOT__')), (LOWER(TRIM(`name`))));
