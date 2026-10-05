ALTER TABLE `tenants` ADD `max_companies` int NOT NULL DEFAULT 5;
--> statement-breakpoint
UPDATE `tenants` t
LEFT JOIN (
	SELECT `tenant_id`, COUNT(*) AS cnt
	FROM `companies`
	GROUP BY `tenant_id`
) c ON t.`id` = c.`tenant_id`
SET t.`max_companies` = GREATEST(5, COALESCE(c.cnt, 0));
