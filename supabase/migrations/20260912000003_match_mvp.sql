-- Migration 20260912000003: Add mvp_player_id to matches and indexes for goal_events
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS mvp_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_mvp_player_id ON public.matches(mvp_player_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_match_id ON public.goal_events(match_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_player_id ON public.goal_events(player_id);
