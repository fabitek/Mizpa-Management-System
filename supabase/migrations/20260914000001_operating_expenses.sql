-- ==============================================================================
-- MIZPA FC - MIGRACIÓN: CAJA MENOR & GASTOS OPERATIVOS (OPERATING EXPENSES)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.operating_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN (
      'BALLS_EQUIPMENT',
      'BIBS_VESTS',
      'HYDRATION',
      'REFEREE_STAFF',
      'FIRST_AID',
      'AWARDS_CAPTAIN',
      'FIELD_MAINTENANCE',
      'OTHER'
    )),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    receipt_url TEXT,
    recorded_by_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operating_expenses_date ON public.operating_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_category ON public.operating_expenses(category);
