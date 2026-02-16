-- ============================================================
-- COMPLYFLEET — MIGRATION: Fix magic_links + add missing columns
-- Run this in Supabase SQL Editor ONCE
-- ============================================================

-- Add missing columns to magic_links
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Ensure walkaround_checks has company_id if missing
ALTER TABLE walkaround_checks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
