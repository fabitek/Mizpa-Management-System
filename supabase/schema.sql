-- ==============================================================================
-- MIZPA FC - ESQUEMA INTEGRAL DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- Versión: 1.0 (MVP Producción)
-- ==============================================================================

-- 0. Limpieza previa para garantizar instalación limpia desde ceros
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.goal_events CASCADE;
DROP TABLE IF EXISTS public.financial_entries CASCADE;
DROP TABLE IF EXISTS public.attendances CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Jugadores (Players)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    document_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    alias TEXT,
    role TEXT NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('ADMIN', 'CAPTAIN', 'PLAYER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de Partidos (Matches)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    location_address TEXT,
    google_maps_url TEXT,
    pitch_rental_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (pitch_rental_cost >= 0),
    extra_costs NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_costs >= 0),
    duration_hours NUMERIC(4, 2) NOT NULL DEFAULT 2 CHECK (duration_hours > 0),
    parking_fee_per_hour NUMERIC(12, 2) NOT NULL DEFAULT 1000 CHECK (parking_fee_per_hour >= 0),
    max_players INT NOT NULL DEFAULT 18 CHECK (max_players > 0),
    settled_fee_per_player NUMERIC(12, 2) CHECK (settled_fee_per_player IS NULL OR settled_fee_per_player >= 0),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN_REGISTRATION', 'PLAYED', 'SETTLED', 'CANCELLED')),
    mvp_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de Asistencias & Cupos (Attendances)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'WAITLIST', 'CANCELLED', 'ATTENDED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    registered_by_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    guest_name TEXT,
    has_vehicle BOOLEAN DEFAULT false,
    vehicle_plate TEXT
);

-- Evitar duplicados en auto-inscripciones directas
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_self_attendance
ON public.attendances (match_id, player_id)
WHERE guest_name IS NULL;

-- 5. Tabla de Libro Contable Inmutable (Financial Entries)
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

-- 6. Tabla de Goles & Estadísticas (Goal Events)
CREATE TABLE IF NOT EXISTS public.goal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    minute INT CHECK (minute IS NULL OR (minute >= 0 AND minute <= 130)),
    type TEXT NOT NULL DEFAULT 'OPEN_PLAY' CHECK (type IN ('OPEN_PLAY', 'PENALTY', 'OWN_GOAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tabla de Notificaciones & Convocatorias (Notifications)
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

-- 8. Índices para Alto Rendimiento en Consultas
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_mvp ON public.matches(mvp_player_id);
CREATE INDEX IF NOT EXISTS idx_attendances_match_id ON public.attendances(match_id);
CREATE INDEX IF NOT EXISTS idx_attendances_player_id ON public.attendances(player_id);
CREATE INDEX IF NOT EXISTS idx_attendances_registered_by ON public.attendances(registered_by_player_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_player_id ON public.financial_entries(player_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_match_id ON public.financial_entries(match_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_match_id ON public.goal_events(match_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_player_id ON public.goal_events(player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_player_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- 9. Políticas de Seguridad RLS (Row Level Security)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso completo para Server Actions y operaciones de la aplicación
CREATE POLICY "Public Read/Write Players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Attendances" ON public.attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Financial Entries" ON public.financial_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Goal Events" ON public.goal_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 10. Inicialización de Usuario Administrador (Fabian Tellez)
INSERT INTO public.players (id, full_name, email, phone, alias, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Fabian Tellez',
    'fabian.tellez@gmail.com',
    '+573000000000',
    'Fabian (Admin)',
    'ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'ADMIN', full_name = 'Fabian Tellez';

