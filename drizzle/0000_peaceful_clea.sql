CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`member_row_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text DEFAULT '' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_member_idx` ON `audit_logs` (`member_row_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`member_row_id` integer NOT NULL,
	`payment_order_id` text,
	`source_type` text NOT NULL,
	`source_slug` text NOT NULL,
	`title_snapshot` text NOT NULL,
	`amount_paise` integer DEFAULT 0 NOT NULL,
	`attendee_count` integer DEFAULT 1 NOT NULL,
	`requested_date` text,
	`requested_time` text,
	`status` text DEFAULT 'payment_pending' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bookings_member_idx` ON `bookings` (`member_row_id`);--> statement-breakpoint
CREATE INDEX `bookings_status_idx` ON `bookings` (`status`);--> statement-breakpoint
CREATE TABLE `form_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`member_row_id` integer,
	`name` text NOT NULL,
	`contact` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`consent_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `form_submissions_type_idx` ON `form_submissions` (`type`);--> statement-breakpoint
CREATE INDEX `form_submissions_status_idx` ON `form_submissions` (`status`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` text,
	`verification_token` text,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`mobile` text NOT NULL,
	`mobile_normalized` text NOT NULL,
	`city` text NOT NULL,
	`locality` text DEFAULT '' NOT NULL,
	`age_group` text DEFAULT '' NOT NULL,
	`primary_interest` text DEFAULT '' NOT NULL,
	`plan_id` text NOT NULL,
	`plan_price_paise` integer NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_iterations` integer DEFAULT 210000 NOT NULL,
	`issued_at` text,
	`valid_until` text,
	`consent_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_member_id_unique` ON `members` (`member_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_verification_token_unique` ON `members` (`verification_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_normalized_unique` ON `members` (`email_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_mobile_normalized_unique` ON `members` (`mobile_normalized`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`item_slug` text NOT NULL,
	`title_snapshot` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_paise` integer NOT NULL,
	`line_total_paise` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`member_row_id` integer NOT NULL,
	`payment_order_id` text,
	`status` text DEFAULT 'payment_pending' NOT NULL,
	`subtotal_paise` integer NOT NULL,
	`total_paise` integer NOT NULL,
	`shipping_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `orders_member_idx` ON `orders` (`member_row_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `password_reset_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`member_row_id` integer,
	`contact` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `password_reset_member_idx` ON `password_reset_requests` (`member_row_id`);--> statement-breakpoint
CREATE TABLE `payment_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`member_row_id` integer NOT NULL,
	`purpose` text NOT NULL,
	`reference_id` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`gateway_order_id` text,
	`gateway_payment_id` text,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_orders_gateway_order_id_unique` ON `payment_orders` (`gateway_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_orders_gateway_payment_id_unique` ON `payment_orders` (`gateway_payment_id`);--> statement-breakpoint
CREATE INDEX `payment_orders_member_idx` ON `payment_orders` (`member_row_id`);--> statement-breakpoint
CREATE INDEX `payment_orders_status_idx` ON `payment_orders` (`status`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_row_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`user_agent_hash` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`member_row_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_member_idx` ON `sessions` (`member_row_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);
