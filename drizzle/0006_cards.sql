CREATE TABLE `post_gallery` (
	`post_id` text NOT NULL,
	`media_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`post_id`, `media_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "post_gallery_position" CHECK(position >= 0)
);
--> statement-breakpoint
CREATE INDEX `post_gallery_media` ON `post_gallery` (`media_id`);--> statement-breakpoint
ALTER TABLE `post_revisions` ADD `card_values_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `card_type_id` text REFERENCES card_types(id);--> statement-breakpoint
ALTER TABLE `posts` ADD `card_values_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX `posts_card_type` ON `posts` (`card_type_id`);