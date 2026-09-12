-- ==============================================================================
-- Mizpa Management System - Migration 20260912000002_attendance_guests.sql
-- Description: Add support for guest registrations (+1) and host player tracking.
-- ==============================================================================

-- 1. Add registered_by_player_id and guest_name columns
ALTER TABLE public.attendances
ADD COLUMN IF NOT EXISTS registered_by_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- 2. Drop unique constraint on (match_id, player_id) if it strictly prevents guests
-- and replace with partial unique index for direct self-registrations
ALTER TABLE public.attendances
DROP CONSTRAINT IF EXISTS unique_match_player_attendance;

-- Only enforce uniqueness when it's a self-registration (guest_name is null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_self_attendance
ON public.attendances (match_id, player_id)
WHERE guest_name IS NULL;

-- 3. Add index on registered_by_player_id
CREATE INDEX IF NOT EXISTS idx_attendances_registered_by
ON public.attendances (registered_by_player_id);
