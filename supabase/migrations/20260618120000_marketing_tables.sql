-- ═══════════════════════════════════════════════════════
--  Marketing Module Tables
-- ═══════════════════════════════════════════════════════

-- Campanhas
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  channel       text NOT NULL CHECK (channel IN ('instagram','google_ads','facebook','email','tiktok','organico','whatsapp','outro')),
  status        text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','encerrada','rascunho')),
  budget        numeric(14,2) NOT NULL DEFAULT 0,
  spent         numeric(14,2) NOT NULL DEFAULT 0,
  revenue       numeric(14,2) NOT NULL DEFAULT 0,
  impressions   integer NOT NULL DEFAULT 0,
  clicks        integer NOT NULL DEFAULT 0,
  conversions   integer NOT NULL DEFAULT 0,
  start_date    date NOT NULL,
  end_date      date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id   uuid REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  name          text,
  email         text,
  phone         text,
  channel       text NOT NULL DEFAULT 'organico',
  stage         text NOT NULL DEFAULT 'novo' CHECK (stage IN ('novo','contato','qualificado','proposta','fechado','perdido')),
  value         numeric(14,2) DEFAULT 0,
  lead_date     date NOT NULL DEFAULT CURRENT_DATE,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Desempenho diário por canal
CREATE TABLE IF NOT EXISTS public.marketing_channel_daily (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel       text NOT NULL,
  ref_date      date NOT NULL,
  leads         integer NOT NULL DEFAULT 0,
  clicks        integer NOT NULL DEFAULT 0,
  impressions   integer NOT NULL DEFAULT 0,
  spent         numeric(14,2) NOT NULL DEFAULT 0,
  conversions   integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel, ref_date)
);

-- ── Índices ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaigns_user    ON public.marketing_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status  ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_leads_user        ON public.marketing_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage       ON public.marketing_leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_date        ON public.marketing_leads(lead_date);
CREATE INDEX IF NOT EXISTS idx_channel_user_date ON public.marketing_channel_daily(user_id, ref_date);

-- ── Row Level Security ────────────────────────────────
ALTER TABLE public.marketing_campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_channel_daily ENABLE ROW LEVEL SECURITY;

-- Admins do mesmo tenant veem tudo (usando profiles para resolver tenant)
CREATE POLICY "marketing_campaigns_tenant"
  ON public.marketing_campaigns FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "marketing_leads_tenant"
  ON public.marketing_leads FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "marketing_channel_daily_tenant"
  ON public.marketing_channel_daily FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- ── updated_at trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.marketing_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
