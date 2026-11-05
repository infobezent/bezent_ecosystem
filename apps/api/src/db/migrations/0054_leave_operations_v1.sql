ALTER TABLE `employee_leave_requests`
	ADD COLUMN `cancelled_by_user_id` varchar(64) AFTER `rejection_reason`,
	ADD COLUMN `cancellation_reason` varchar(500) AFTER `cancelled_by_user_id`,
	ADD COLUMN `cancelled_at` timestamp NULL AFTER `cancellation_reason`;
