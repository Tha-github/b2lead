-- B2Lead v1 Schema — cole no SQL Editor do Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuários (auth própria com iron-session, não usa Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'client')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT TRUE,
  daily_limit INTEGER DEFAULT 50,
  message_template TEXT DEFAULT 'Olá {{name}}, tudo bem? Vi que você atua na área de {{segment}} e gostaria de apresentar uma solução que pode te ajudar. Podemos conversar?',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lotes de importação
CREATE TABLE IF NOT EXISTS lead_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  total_leads INTEGER DEFAULT 0,
  source TEXT DEFAULT 'csv',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  import_batch_id UUID REFERENCES lead_import_batches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  email TEXT,
  segment TEXT,
  position TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'mensagem_enviada', 'respondeu', 'interessado', 'nao_interessado')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Controle de envios diários
CREATE TABLE IF NOT EXISTS daily_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  send_date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(client_id, send_date)
);

-- RLS: service_role tem acesso total (nossas API routes usam service role key)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_all_users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_clients" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_leads" ON leads FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_batches" ON lead_import_batches FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "service_all_daily" ON daily_sends FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_client_status ON leads(client_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_sends_client_date ON daily_sends(client_id, send_date);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
