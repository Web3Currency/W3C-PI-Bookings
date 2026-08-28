-- Stage 2: durable Pi U2A payment → booking reconciliation
-- Run in Supabase SQL editor.

-- 1) Unique Pi payment id on bookings (idempotent finalize)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pi_payment_id text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_pi_payment_id_uidx
  ON public.bookings (pi_payment_id)
  WHERE pi_payment_id IS NOT NULL;

-- 2) Payment intents: survive browser loss between approve and booking insert
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_payment_id text NOT NULL,
  pi_txid text,
  status text NOT NULL DEFAULT 'approved',
  amount_pi numeric,
  client_pi_uid text,
  client_pi_username text,
  client_name text,
  client_phone text,
  client_email text,
  notes text,
  service_id text,
  service_title text,
  provider_id uuid,
  business_id text,
  booking_date text,
  booking_time text,
  booking_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT payment_intents_pi_payment_id_key UNIQUE (pi_payment_id)
);

CREATE INDEX IF NOT EXISTS payment_intents_status_idx ON public.payment_intents (status);
CREATE INDEX IF NOT EXISTS payment_intents_client_uid_idx ON public.payment_intents (client_pi_uid);

COMMENT ON TABLE public.payment_intents IS
  'Durable Pi U2A payment intents. Server finalizes booking on complete/reconcile; idempotent by pi_payment_id.';
