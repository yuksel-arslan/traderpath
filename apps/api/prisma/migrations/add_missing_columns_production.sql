-- Migration: Add missing columns to production database
-- Date: 2026-01-18
-- Issue: Production 500 errors due to missing columns:
--   - cost_settings.credit_cost_analysis_purchase
--   - analyses.ai_expert_questions_used
--   - analyses.pdf_downloads_used
--   - analyses.emails_sent_used

-- =============================================
-- Add missing column to cost_settings table
-- =============================================

DO $$
BEGIN
    -- Add credit_cost_analysis_purchase column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cost_settings'
        AND column_name = 'credit_cost_analysis_purchase'
    ) THEN
        ALTER TABLE cost_settings
        ADD COLUMN credit_cost_analysis_purchase INTEGER NOT NULL DEFAULT 15;
        RAISE NOTICE 'Added credit_cost_analysis_purchase column to cost_settings';
    ELSE
        RAISE NOTICE 'credit_cost_analysis_purchase column already exists in cost_settings';
    END IF;
END $$;

-- =============================================
-- Add missing columns to analyses table
-- =============================================

DO $$
BEGIN
    -- Add ai_expert_questions_used column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analyses'
        AND column_name = 'ai_expert_questions_used'
    ) THEN
        ALTER TABLE analyses
        ADD COLUMN ai_expert_questions_used INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added ai_expert_questions_used column to analyses';
    ELSE
        RAISE NOTICE 'ai_expert_questions_used column already exists in analyses';
    END IF;

    -- Add pdf_downloads_used column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analyses'
        AND column_name = 'pdf_downloads_used'
    ) THEN
        ALTER TABLE analyses
        ADD COLUMN pdf_downloads_used INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added pdf_downloads_used column to analyses';
    ELSE
        RAISE NOTICE 'pdf_downloads_used column already exists in analyses';
    END IF;

    -- Add emails_sent_used column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analyses'
        AND column_name = 'emails_sent_used'
    ) THEN
        ALTER TABLE analyses
        ADD COLUMN emails_sent_used INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added emails_sent_used column to analyses';
    ELSE
        RAISE NOTICE 'emails_sent_used column already exists in analyses';
    END IF;
END $$;

-- =============================================
-- Verify columns were added
-- =============================================

SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('cost_settings', 'analyses')
AND column_name IN (
    'credit_cost_analysis_purchase',
    'ai_expert_questions_used',
    'pdf_downloads_used',
    'emails_sent_used'
)
ORDER BY table_name, column_name;
