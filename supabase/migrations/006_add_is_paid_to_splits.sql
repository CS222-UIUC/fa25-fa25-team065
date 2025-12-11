-- ============================================================================
-- ADD is_paid COLUMN TO SPLITS TABLE
-- Allows payers to mark splits as paid when they receive payment
-- ============================================================================

-- Add is_paid column to splits table
ALTER TABLE public.splits 
ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;

-- Add index for better query performance when filtering paid/unpaid splits
CREATE INDEX IF NOT EXISTS idx_splits_is_paid ON public.splits(is_paid);
CREATE INDEX IF NOT EXISTS idx_splits_payer_paid ON public.splits(payer_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_splits_participant_paid ON public.splits(participant_id, is_paid);

-- Add comment
COMMENT ON COLUMN public.splits.is_paid IS 'Indicates whether the participant has paid the payer. Set to true when the payer marks the split as paid.';
