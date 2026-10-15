PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__webhook_delivery_attempts_copy` AS SELECT * FROM `webhook_delivery_attempts`;--> statement-breakpoint
CREATE TABLE `__new_webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "webhook_deliveries_event" CHECK(event in ('post.published', 'post.updated', 'post.unpublished', 'post.hidden', 'post.unhidden', 'post.deleted', 'card.published', 'card.updated', 'card.unpublished', 'card.hidden', 'card.unhidden', 'card.deleted')),
	CONSTRAINT "webhook_deliveries_status" CHECK(status in ('pending', 'delivering', 'succeeded', 'failed')),
	CONSTRAINT "webhook_deliveries_attempt_count" CHECK(attempt_count >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_webhook_deliveries`("id", "webhook_id", "event", "payload", "status", "attempt_count", "next_attempt_at", "completed_at", "created_at") SELECT "id", "webhook_id", "event", "payload", "status", "attempt_count", "next_attempt_at", "completed_at", "created_at" FROM `webhook_deliveries`;--> statement-breakpoint
DROP TABLE `webhook_deliveries`;--> statement-breakpoint
ALTER TABLE `__new_webhook_deliveries` RENAME TO `webhook_deliveries`;--> statement-breakpoint
DELETE FROM `webhook_delivery_attempts`;--> statement-breakpoint
INSERT INTO `webhook_delivery_attempts`("id", "delivery_id", "status_code", "duration_ms", "error", "created_at") SELECT "id", "delivery_id", "status_code", "duration_ms", "error", "created_at" FROM `__webhook_delivery_attempts_copy`;--> statement-breakpoint
DROP TABLE `__webhook_delivery_attempts_copy`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `webhook_deliveries_queue` ON `webhook_deliveries` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_webhook` ON `webhook_deliveries` (`webhook_id`,`created_at`);