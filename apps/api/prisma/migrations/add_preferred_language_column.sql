-- Migration: Add preferred_language column to User table
-- Date: 2026-01-22
-- Description: Adds user language preference for multi-language support

-- Add preferred_language column with default 'en' (English)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" VARCHAR(10) DEFAULT 'en' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "users"."preferred_language" IS 'User preferred language code: en, tr, ar, es, de, fr, it, pt, nl, pl, ru, fa, he, zh, ja, ko, vi, th, id, hi';
