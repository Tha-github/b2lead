-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('operator', 'client')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Operators can view all profiles" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Operators can insert profiles" on profiles
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

-- WhatsApp Instances
create table whatsapp_instances (
  id uuid default gen_random_uuid() primary key,
  instance_name text not null unique,
  phone_number text,
  status text default 'disconnected' check (status in ('connected', 'disconnected', 'connecting')),
  client_id uuid,
  created_at timestamptz default now()
);

alter table whatsapp_instances enable row level security;

create policy "Operators manage instances" on whatsapp_instances
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own instance" on whatsapp_instances
  for select using (
    exists (
      select 1 from clients c
      join profiles p on p.id = auth.uid()
      where c.profile_id = auth.uid() and c.whatsapp_instance_id = whatsapp_instances.id
    )
  );

-- Clients
create table clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null unique,
  profile_id uuid references profiles(id) on delete set null,
  whatsapp_instance_id uuid references whatsapp_instances(id) on delete set null,
  active boolean default true,
  daily_limit integer default 50,
  message_template text default 'Olá {{name}}, tudo bem? Vi que você atua na área de {{segment}} e gostaria de apresentar uma solução que pode te ajudar. Podemos conversar?',
  target_profile jsonb default '{}',
  created_at timestamptz default now()
);

alter table clients enable row level security;

create policy "Operators manage clients" on clients
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own data" on clients
  for select using (profile_id = auth.uid());

-- Lead import batches
create table lead_import_batches (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  file_name text not null,
  total_leads integer default 0,
  created_at timestamptz default now()
);

alter table lead_import_batches enable row level security;

create policy "Operators manage batches" on lead_import_batches
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own batches" on lead_import_batches
  for select using (
    exists (select 1 from clients c where c.id = client_id and c.profile_id = auth.uid())
  );

-- Leads
create table leads (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  import_batch_id uuid references lead_import_batches(id) on delete set null,
  name text not null,
  phone text not null,
  company text,
  email text,
  segment text,
  position text,
  city text,
  state text,
  status text default 'novo' check (status in ('novo', 'mensagem_enviada', 'respondeu', 'interessado', 'nao_interessado')),
  scheduled_date date,
  sent_at timestamptz,
  extra_data jsonb default '{}',
  created_at timestamptz default now()
);

alter table leads enable row level security;

create policy "Operators manage leads" on leads
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own leads" on leads
  for select using (
    exists (select 1 from clients c where c.id = client_id and c.profile_id = auth.uid())
  );

create policy "Clients update own leads" on leads
  for update using (
    exists (select 1 from clients c where c.id = client_id and c.profile_id = auth.uid())
  );

-- Conversations
create table conversations (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,
  instance_id uuid references whatsapp_instances(id) on delete set null,
  remote_jid text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table conversations enable row level security;

create policy "Operators manage conversations" on conversations
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own conversations" on conversations
  for select using (
    exists (select 1 from clients c where c.id = client_id and c.profile_id = auth.uid())
  );

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  content text not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  status text default 'sent' check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id text,
  sent_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Operators manage messages" on messages
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own messages" on messages
  for select using (
    exists (
      select 1 from conversations cv
      join clients c on c.id = cv.client_id
      where cv.id = conversation_id and c.profile_id = auth.uid()
    )
  );

create policy "Clients insert messages" on messages
  for insert with check (
    exists (
      select 1 from conversations cv
      join clients c on c.id = cv.client_id
      where cv.id = conversation_id and c.profile_id = auth.uid()
    )
  );

-- Daily sends tracking
create table daily_sends (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade not null,
  send_date date not null,
  count integer default 0,
  unique (client_id, send_date)
);

alter table daily_sends enable row level security;

create policy "Operators manage daily_sends" on daily_sends
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "Clients view own daily_sends" on daily_sends
  for select using (
    exists (select 1 from clients c where c.id = client_id and c.profile_id = auth.uid())
  );

-- Function to auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Realtime publications
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table daily_sends;
