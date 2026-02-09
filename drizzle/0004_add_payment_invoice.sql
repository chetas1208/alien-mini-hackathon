-- Add missing payment_invoice column to agents table
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "payment_invoice" text;

-- Fix default status to match schema (pending_payment instead of active)
ALTER TABLE "agents" ALTER COLUMN "status" SET DEFAULT 'pending_payment';

-- Add missing winner columns to cards table
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "won_by_agent_id" uuid;
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "won_by_alien_id" text;
