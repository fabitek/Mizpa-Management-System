-- Migration 20260914000002: Add notification_sent_10_players to matches table for idempotency

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS notification_sent_10_players BOOLEAN NOT NULL DEFAULT false;

-- Index for fast filtering on matches where 10-player capacity notification has not been sent
CREATE INDEX IF NOT EXISTS idx_matches_notif_10 ON public.matches(notification_sent_10_players)
WHERE notification_sent_10_players = false;
