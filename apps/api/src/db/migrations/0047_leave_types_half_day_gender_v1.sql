ALTER TABLE `leave_types`
	ADD COLUMN `allow_half_day` boolean NOT NULL DEFAULT true AFTER `unit`,
	ADD COLUMN `gender_eligibility` enum('all','female','male') NOT NULL DEFAULT 'all' AFTER `allowed_in_notice_period`;
