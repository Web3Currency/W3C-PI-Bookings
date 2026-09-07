-- Add optional storage path for the Pi Network watermark used by client-facing hero sections.
ALTER TABLE public.app_branding
  ADD COLUMN IF NOT EXISTS pi_watermark_path text;

COMMENT ON COLUMN public.app_branding.pi_watermark_path IS
  'Optional Supabase Storage path for the Pi Network watermark asset used in client-facing hero sections.';
