-- ==============================================================================
-- Mizpa Management System - Initial Seed Data for Supabase
-- ==============================================================================

-- 1. Insert Initial Players
INSERT INTO public.players (id, full_name, email, phone, alias, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Carlos Valderrama', 'pibe@mizpa.com', '+573001234501', 'El Pibe', true),
    ('a0000000-0000-0000-0000-000000000002', 'Faustino Asprilla', 'tino@mizpa.com', '+573001234502', 'El Tino', true),
    ('a0000000-0000-0000-0000-000000000003', 'Radamel Falcao', 'tigre@mizpa.com', '+573001234503', 'El Tigre', true),
    ('a0000000-0000-0000-0000-000000000004', 'James Rodríguez', 'james@mizpa.com', '+573001234504', 'El 10', true),
    ('a0000000-0000-0000-0000-000000000005', 'Juan Cuadrado', 'cuadrado@mizpa.com', '+573001234505', 'Neco', true),
    ('a0000000-0000-0000-0000-000000000006', 'David Ospina', 'ospina@mizpa.com', '+573001234506', 'San David', true),
    ('a0000000-0000-0000-0000-000000000007', 'Mario Yepes', 'yepes@mizpa.com', '+573001234507', 'El Mariscal', true),
    ('a0000000-0000-0000-0000-000000000008', 'Luis Díaz', 'lucho@mizpa.com', '+573001234508', 'Luchito', true),
    ('a0000000-0000-0000-0000-000000000009', 'Freddy Rincón', 'rincon@mizpa.com', '+573001234509', 'El Coloso', true),
    ('a0000000-0000-0000-0000-000000000010', 'Iván Córdoba', 'cordoba@mizpa.com', '+573001234510', 'El Capitán', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Initial Match
INSERT INTO public.matches (id, date, location, pitch_rental_cost, extra_costs, max_players, settled_fee_per_player, status)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        '2026-09-15 19:00:00+00',
        'Cancha El Campín 5',
        120000.00,
        20000.00,
        10,
        NULL,
        'OPEN_REGISTRATION'
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Initial Attendances (10 players marked as ATTENDED)
INSERT INTO public.attendances (id, match_id, player_id, status, registered_at)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'ATTENDED', now()),
    ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'ATTENDED', now())
ON CONFLICT (id) DO NOTHING;
