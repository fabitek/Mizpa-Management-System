-- ==============================================================================
-- Mizpa Management System - Database Schema Migration
-- Migration: 20260912000001_initial_schema.sql
-- Description: Core schema for matches, players, attendances, and financial ledger.
-- ==============================================================================

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    alias TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    pitch_rental_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (pitch_rental_cost >= 0),
    extra_costs NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_costs >= 0),
    max_players INT NOT NULL DEFAULT 10 CHECK (max_players > 0),
    settled_fee_per_player NUMERIC(12, 2) CHECK (settled_fee_per_player IS NULL OR settled_fee_per_player >= 0),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN_REGISTRATION', 'PLAYED', 'SETTLED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Attendances Table
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'WAITLIST', 'CANCELLED', 'ATTENDED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_match_player_attendance UNIQUE (match_id, player_id)
);

-- 5. Create Financial Entries (Immutable Accounting Ledger)
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reference_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    receipt_url TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Goal Events Table
CREATE TABLE IF NOT EXISTS public.goal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    minute INT CHECK (minute IS NULL OR (minute >= 0 AND minute <= 130)),
    type TEXT NOT NULL DEFAULT 'OPEN_PLAY' CHECK (type IN ('OPEN_PLAY', 'PENALTY', 'OWN_GOAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Indexes for Query Performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(date);
CREATE INDEX IF NOT EXISTS idx_attendances_match_id ON public.attendances(match_id);
CREATE INDEX IF NOT EXISTS idx_attendances_player_id ON public.attendances(player_id);
CREATE INDEX IF NOT EXISTS idx_attendances_match_status ON public.attendances(match_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_entries_player_id ON public.financial_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_match_id ON public.financial_entries(match_id);

-- 8. Row Level Security (RLS) Setup
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;

-- Default Read Policies (Accessible for authenticated/anon depending on deployment)
CREATE POLICY "Allow public read access on players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow public read access on matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Allow public read access on attendances" ON public.attendances FOR SELECT USING (true);
CREATE POLICY "Allow public read access on financial_entries" ON public.financial_entries FOR SELECT USING (true);
CREATE POLICY "Allow public read access on goal_events" ON public.goal_events FOR SELECT USING (true);

-- Insert/Update Policies for service role / authenticated backend actions
CREATE POLICY "Allow full access for service_role on players" ON public.players FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow full access for service_role on matches" ON public.matches FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow full access for service_role on attendances" ON public.attendances FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow full access for service_role on financial_entries" ON public.financial_entries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow full access for service_role on goal_events" ON public.goal_events FOR ALL USING (auth.role() = 'service_role');
