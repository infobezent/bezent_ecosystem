CREATE TABLE IF NOT EXISTS `auth_otp_challenges` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64),
  `email` varchar(255) NOT NULL,
  `code_digest` varchar(64),
  `status` enum('pending','consumed','locked','expired') NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT 0,
  `expires_at` timestamp NOT NULL,
  `consumed_at` timestamp NULL,
  `request_ip` varchar(64),
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_otp_email_created` (`email`, `created_at`),
  INDEX `idx_otp_ip_created` (`request_ip`, `created_at`),
  INDEX `idx_otp_user` (`user_id`),
  CONSTRAINT `fk_otp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_outbox` (
  `id` varchar(64) NOT NULL,
  `recipient` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body_text` varchar(4000) NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email_outbox_recipient` (`recipient`, `created_at`)
);
