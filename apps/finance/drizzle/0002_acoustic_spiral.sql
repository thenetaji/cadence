ALTER TABLE `categories` ADD `group_name` text;--> statement-breakpoint
UPDATE `categories` SET `group_name` = 'Essentials' WHERE `kind` = 'expense' AND `name` IN ('Groceries', 'Housing', 'Bills', 'Transport', 'Health', 'Education');--> statement-breakpoint
UPDATE `categories` SET `group_name` = 'Lifestyle' WHERE `kind` = 'expense' AND `name` IN ('Food & Drink', 'Shopping', 'Entertainment', 'Travel', 'Personal', 'Subscriptions');--> statement-breakpoint
UPDATE `categories` SET `group_name` = 'Work' WHERE `kind` = 'income' AND `name` IN ('Salary', 'Freelance');
