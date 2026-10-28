CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `cloud_usage` (
	`day` text PRIMARY KEY NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text(3) DEFAULT 'TRY' NOT NULL,
	`date` text NOT NULL,
	`merchant` text,
	`category_id` integer,
	`note` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`file_hash` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "expenses_amount_positive" CHECK("expenses"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE TABLE `extractions` (
	`file_hash` text PRIMARY KEY NOT NULL,
	`result_json` text NOT NULL,
	`provider` text NOT NULL,
	`tier` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `merchants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`normalized_name` text NOT NULL,
	`category_id` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchants_normalized_name_unique` ON `merchants` (`normalized_name`);