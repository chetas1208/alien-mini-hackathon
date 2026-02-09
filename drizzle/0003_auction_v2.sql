-- Add new columns to cards
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "scheduled_start_time" timestamp with time zone;
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "winning_bid" real;

-- Migrate: set scheduled_start_time from auction_end_time for existing rows
UPDATE "cards" SET "scheduled_start_time" = "auction_end_time" - interval '30 seconds' WHERE "scheduled_start_time" IS NULL;

-- Make scheduled_start_time NOT NULL after backfill
ALTER TABLE "cards" ALTER COLUMN "scheduled_start_time" SET NOT NULL;

-- Allow auction_end_time to be nullable (set when auction goes live)
ALTER TABLE "cards" ALTER COLUMN "auction_end_time" DROP NOT NULL;

-- Update status values: rename 'active' to 'live' for existing rows
UPDATE "cards" SET "status" = 'scheduled' WHERE "status" = 'active';
UPDATE "cards" SET "status" = 'completed' WHERE "status" = 'sold';

-- Add new columns to agents
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "is_bot" text;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
