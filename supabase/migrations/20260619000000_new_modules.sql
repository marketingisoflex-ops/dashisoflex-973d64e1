-- ═══════════════════════════════════════════════════════
--  New Modules Schema Migration (Mercado Livre, Comercial, Financeiro, Engenharia)
-- ═══════════════════════════════════════════════════════

-- 1. Mercado Livre Performance
CREATE TABLE IF NOT EXISTS public.mercadolivre_performance (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ref_date            date NOT NULL,
  vendas_totais       numeric(14,2) NOT NULL DEFAULT 0,
  vendas_ads          numeric(14,2) NOT NULL DEFAULT 0,
  vendas_organicas    numeric(14,2) NOT NULL DEFAULT 0,
  pedidos             integer NOT NULL DEFAULT 0,
  unidades            integer NOT NULL DEFAULT 0,
  investimento_ads    numeric(14,2) NOT NULL DEFAULT 0,
  conversoes          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ref_date)
);

CREATE INDEX IF NOT EXISTS idx_ml_perf_date ON public.mercadolivre_performance(ref_date);
ALTER TABLE public.mercadolivre_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ml_perf_tenant"
  ON public.mercadolivre_performance FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 2. Comercial (Saleswomen & Opportunities)
CREATE TABLE IF NOT EXISTS public.comercial_saleswomen (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  region              text NOT NULL,
  email               text,
  phone               text,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comercial_saleswomen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_saleswomen_tenant"
  ON public.comercial_saleswomen FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.comercial_opportunities (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name         text NOT NULL,
  saleswoman_id       uuid REFERENCES public.comercial_saleswomen(id) ON DELETE SET NULL,
  value               numeric(14,2) NOT NULL DEFAULT 0,
  stage               text NOT NULL CHECK (stage IN ('contato','reuniao','proposta','negociacao','ganho','perdido')),
  notes               text,
  ref_date            date NOT NULL DEFAULT CURRENT_DATE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_com_opp_stage ON public.comercial_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_com_opp_date ON public.comercial_opportunities(ref_date);
ALTER TABLE public.comercial_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comercial_opportunities_tenant"
  ON public.comercial_opportunities FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 3. Financeiro Transactions
CREATE TABLE IF NOT EXISTS public.financeiro_transactions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type                text NOT NULL CHECK (type IN ('receita','despesa')),
  category            text NOT NULL,
  value               numeric(14,2) NOT NULL DEFAULT 0,
  ref_date            date NOT NULL,
  description         text,
  status              text NOT NULL DEFAULT 'realizado' CHECK (status IN ('previsto','realizado')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON public.financeiro_transactions(ref_date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON public.financeiro_transactions(type);
ALTER TABLE public.financeiro_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financeiro_transactions_tenant"
  ON public.financeiro_transactions FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 4. Engenharia Projects & PCP
CREATE TABLE IF NOT EXISTS public.engenharia_projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  code                text,
  client              text,
  progress            numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status              text NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento','detalhamento','aprovacao','producao','concluido','suspenso')),
  drawings_url        text,
  pcp_status          text NOT NULL DEFAULT 'aguardando' CHECK (pcp_status IN ('aguardando','programado','em_execucao','concluido')),
  start_date          date,
  delivery_date       date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eng_proj_status ON public.engenharia_projects(status);
ALTER TABLE public.engenharia_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engenharia_projects_tenant"
  ON public.engenharia_projects FOR ALL
  USING (
    user_id IN (
      SELECT id FROM auth.users
      WHERE raw_app_meta_data->>'tenant_id' = (
        SELECT raw_app_meta_data->>'tenant_id'
        FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 5. Triggers for updated_at
CREATE TRIGGER ml_perf_updated_at
  BEFORE UPDATE ON public.mercadolivre_performance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER com_saleswomen_updated_at
  BEFORE UPDATE ON public.comercial_saleswomen
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER com_opportunities_updated_at
  BEFORE UPDATE ON public.comercial_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER fin_transactions_updated_at
  BEFORE UPDATE ON public.financeiro_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER eng_projects_updated_at
  BEFORE UPDATE ON public.engenharia_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Add 'mercadolivre' to app_module type if not exists
-- Enums cannot be altered inside transaction easily, but we'll include it in the migration file
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'mercadolivre';
