-- Migration 20260912000004: Add user roles and notifications table

-- 1. Add role column to players
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('ADMIN', 'CAPTAIN', 'PLAYER'));

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    recipient_phone TEXT,
    recipient_email TEXT,
    channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL', 'IN_APP')),
    type TEXT NOT NULL CHECK (type IN (
      'MATCH_CONVOCATION',
      'RSVP_CONFIRMATION',
      'WAITLIST_PROMOTION',
      'MATCH_SETTLED_FEE',
      'DEBT_REMINDER'
    )),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    action_url TEXT,
    status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow full access for service_role on notifications" ON public.notifications FOR ALL USING (auth.role() = 'service_role');
