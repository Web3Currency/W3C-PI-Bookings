alter table public.marketplace_settings
  add column if not exists pi_gas_fee_pi numeric(12,6) not null default 0.01;
