-- ==============================================================================
-- MIZPA MANAGEMENT SYSTEM - SUPABASE PRODUCTION SCHEMA (POSTGRESQL)
-- ==============================================================================

-- 1. Clean Existing Tables (if re-running in development)
DROP TABLE IF EXISTS goal_events CASCADE;
DROP TABLE IF EXISTS financial_entries CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;

-- ------------------------------------------------------------------------------
-- Table: players
-- ------------------------------------------------------------------------------
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    document_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    alias TEXT,
    role TEXT NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('ADMIN', 'CAPTAIN', 'PLAYER')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching and unique lookups
CREATE INDEX idx_players_email ON players (email);
CREATE INDEX idx_players_phone ON players (phone);
CREATE INDEX idx_players_role ON players (role);

-- ------------------------------------------------------------------------------
-- Table: matches
-- ------------------------------------------------------------------------------
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    location_address TEXT,
    google_maps_url TEXT,
    pitch_rental_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    extra_costs NUMERIC(12, 2) NOT NULL DEFAULT 0,
    duration_hours NUMERIC(4, 2) DEFAULT 2.0,
    parking_fee_per_hour NUMERIC(12, 2) DEFAULT 1000.0,
    max_players INTEGER NOT NULL DEFAULT 18,
    settled_fee_per_player NUMERIC(12, 2) DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN_REGISTRATION', 'PLAYED', 'SETTLED', 'CANCELLED')),
    mvp_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matches_date ON matches (date DESC);
CREATE INDEX idx_matches_status ON matches (status);

-- ------------------------------------------------------------------------------
-- Table: attendances
-- ------------------------------------------------------------------------------
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'WAITLIST', 'CANCELLED', 'ATTENDED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    registered_by_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    guest_name TEXT,
    has_vehicle BOOLEAN DEFAULT FALSE,
    vehicle_plate TEXT,
    CONSTRAINT uq_match_player_self UNIQUE (match_id, player_id, guest_name)
);

CREATE INDEX idx_attendances_match ON attendances (match_id);
CREATE INDEX idx_attendances_player ON attendances (player_id);
CREATE INDEX idx_attendances_status ON attendances (status);

-- ------------------------------------------------------------------------------
-- Table: financial_entries (Immutable Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reference_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    receipt_url TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finance_player ON financial_entries (player_id);
CREATE INDEX idx_finance_match ON financial_entries (match_id);
CREATE INDEX idx_finance_ref_date ON financial_entries (reference_date DESC);

-- ------------------------------------------------------------------------------
-- Table: goal_events
-- ------------------------------------------------------------------------------
CREATE TABLE goal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    minute INTEGER CHECK (minute >= 0 AND minute <= 130),
    type TEXT NOT NULL DEFAULT 'OPEN_PLAY' CHECK (type IN ('OPEN_PLAY', 'PENALTY', 'OWN_GOAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_match ON goal_events (match_id);
CREATE INDEX idx_goals_player ON goal_events (player_id);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Setup
-- ------------------------------------------------------------------------------
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for anon and authenticated users)
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read attendances" ON attendances FOR SELECT USING (true);
CREATE POLICY "Public read financial_entries" ON financial_entries FOR SELECT USING (true);
CREATE POLICY "Public read goal_events" ON goal_events FOR SELECT USING (true);

-- Allow full write operations for authenticated / service role and anon actions
CREATE POLICY "Full access players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access attendances" ON attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access financial_entries" ON financial_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access goal_events" ON goal_events FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- Initial Seed Data: Superadmin (Fabián Téllez)
-- ------------------------------------------------------------------------------
INSERT INTO players (id, full_name, document_id, email, phone, alias, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Fabián Téllez',
    '1010101010',
    'fabian.tellez@gmail.com',
    '3001234567',
    'Admin',
    'ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'ADMIN',
    is_active = true;
