# W3C Pi Bookings — Supabase Backup

This directory is the version-controlled recovery point for the W3C Pi Bookings Supabase database.

## What belongs here

- `schema.sql` — database structure: tables, columns, constraints, indexes, triggers, functions, and policies where exported.
- `data.sql` — application data for the public tables at the time of the backup.
- `backup-manifest.json` — backup metadata, table counts, and verification details.
- `restore.md` — restoration procedure and migration notes.

## Important

This repository must remain **private** because database exports may contain client, provider, payment, booking, and other user data.

Never commit:

- Supabase API keys
- service-role keys
- database passwords
- Pi private seeds
- access tokens
- `.env` files

This backup protects the PostgreSQL database. Supabase Storage files (provider images, service covers, app branding files, etc.) must be backed up separately.

## Backup policy

Create a new dated backup before material schema changes and at regular intervals after production activity.

Recommended naming for archived copies outside this directory:

`YYYY-MM-DD/` with `schema.sql`, `data.sql`, and `backup-manifest.json`.
