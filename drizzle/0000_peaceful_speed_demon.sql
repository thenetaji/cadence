CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency` text NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`budget_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`budget_id`, `category_id`),
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`period` text NOT NULL,
	`start_anchor` integer NOT NULL,
	`scope` text NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `categories_kind_sort_idx` ON `categories` (`kind`,`sort_order`);--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`rate` real NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`base`, `quote`)
);
--> statement-breakpoint
CREATE TABLE `recurring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`transfer_account_id` text,
	`transfer_amount` integer,
	`frequency` text NOT NULL,
	`interval` integer DEFAULT 1 NOT NULL,
	`anchor_day` integer,
	`start_date` text NOT NULL,
	`end_date` text,
	`next_due` text NOT NULL,
	`auto_post` integer DEFAULT true NOT NULL,
	`paused_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recurring_rules_next_due_idx` ON `recurring_rules` (`next_due`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `title_memory` (
	`title_norm` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`category_id` text,
	`account_id` text,
	`last_amount` integer,
	`last_currency` text,
	`use_count` integer DEFAULT 1 NOT NULL,
	`last_used_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `title_memory_kind_idx` ON `title_memory` (`kind`,"use_count" desc,"last_used_at" desc);--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount` integer NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transaction_splits_tx_idx` ON `transaction_splits` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_splits_category_idx` ON `transaction_splits` (`category_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text,
	`transfer_account_id` text,
	`transfer_amount` integer,
	`transfer_currency` text,
	`occurred_at` integer NOT NULL,
	`date_key` text NOT NULL,
	`is_split` integer DEFAULT false NOT NULL,
	`recurring_rule_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recurring_rule_id`) REFERENCES `recurring_rules`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` ("date_key" desc,"occurred_at" desc);--> statement-breakpoint
CREATE INDEX `transactions_account_date_idx` ON `transactions` (`account_id`,`date_key`);--> statement-breakpoint
CREATE INDEX `transactions_category_date_idx` ON `transactions` (`category_id`,`date_key`);--> statement-breakpoint
CREATE INDEX `transactions_rule_idx` ON `transactions` (`recurring_rule_id`);--> statement-breakpoint
CREATE INDEX `transactions_transfer_account_idx` ON `transactions` (`transfer_account_id`);