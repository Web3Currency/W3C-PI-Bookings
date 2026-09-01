# W3C Pi Bookings — Database Restore Guide

## Goal

Recreate the W3C Pi Bookings PostgreSQL database without rebuilding the schema manually.

## Restore order

1. Create a fresh PostgreSQL/Supabase project.
2. Restore the database schema from `schema.sql`.
3. Restore the application rows from `data.sql`.
4. Verify tables, columns, constraints, functions, triggers, and row counts.
5. Restore Supabase Storage files separately.
6. Reconfigure application environment variables and secrets.
7. Run the application verification flow: authentication, service browsing, booking creation, Pi payment reconciliation, provider acceptance, delivery, review, refund, payout, and chat.

## Notes

The SQL export is the recovery copy of database state. Git migrations remain the preferred source of truth for future schema evolution.

Do not restore secrets from Git. Recreate them securely in the destination environment.
