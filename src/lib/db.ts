import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string; name: string; email: string;
  password_hash: string; role: string; created_at: string;
}

export interface ClientRow {
  id: string; name: string; email: string; user_id: string | null;
  active: boolean; daily_limit: number; message_template: string; created_at: string;
}

export interface LeadRow {
  id: string; client_id: string; import_batch_id: string | null;
  name: string; phone: string; company: string | null; email: string | null;
  segment: string | null; position: string | null; city: string | null; state: string | null;
  status: string; sent_at: string | null; created_at: string;
  client_name?: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { data } = await sb().from("users").select("*").eq("email", email).single();
  return data ?? null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const { data } = await sb().from("users").select("*").eq("id", id).single();
  return data ?? null;
}

export async function createUser(name: string, email: string, password: string, role: "operator" | "client"): Promise<string> {
  const hash = bcrypt.hashSync(password, 10);
  const { data } = await sb().from("users").insert({ name, email, password_hash: hash, role }).select("id").single();
  return data!.id;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(): Promise<ClientRow[]> {
  const { data } = await sb().from("clients").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getClientById(id: string): Promise<ClientRow | null> {
  const { data } = await sb().from("clients").select("*").eq("id", id).single();
  return data ?? null;
}

export async function getClientByUserId(userId: string): Promise<ClientRow | null> {
  const { data } = await sb().from("clients").select("*").eq("user_id", userId).single();
  return data ?? null;
}

export async function createClientRecord(data: {
  name: string; email: string; userId: string; dailyLimit: number; messageTemplate: string;
}): Promise<string> {
  const { data: row } = await sb().from("clients").insert({
    name: data.name, email: data.email, user_id: data.userId,
    daily_limit: data.dailyLimit, message_template: data.messageTemplate,
  }).select("id").single();
  return row!.id;
}

export async function updateClient(id: string, updates: Record<string, unknown>): Promise<void> {
  await sb().from("clients").update(updates).eq("id", id);
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function getLeads(filters: { clientId?: string; status?: string } = {}): Promise<LeadRow[]> {
  let q = sb().from("leads").select("*, clients(name)").order("created_at", { ascending: false }).limit(200);
  if (filters.clientId) q = q.eq("client_id", filters.clientId);
  if (filters.status) q = q.eq("status", filters.status);
  const { data } = await q;
  return (data ?? []).map((r: LeadRow & { clients?: { name: string } }) => ({
    ...r, client_name: r.clients?.name ?? undefined, clients: undefined,
  }));
}

export async function getLeadsByClientId(clientId: string): Promise<LeadRow[]> {
  const { data } = await sb().from("leads").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function getPendingLeads(clientId: string, limit: number): Promise<LeadRow[]> {
  const { data } = await sb().from("leads").select("*")
    .eq("client_id", clientId).eq("status", "novo").is("sent_at", null)
    .order("created_at", { ascending: true }).limit(limit);
  return data ?? [];
}

export async function insertLeads(leads: Omit<LeadRow, "id" | "created_at">[]): Promise<number> {
  const rows = leads.map((l) => ({
    client_id: l.client_id, import_batch_id: l.import_batch_id ?? null,
    name: l.name, phone: l.phone, company: l.company ?? null, email: l.email ?? null,
    segment: l.segment ?? null, position: l.position ?? null,
    city: l.city ?? null, state: l.state ?? null, status: l.status ?? "novo", sent_at: l.sent_at ?? null,
  }));
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await sb().from("leads").insert(rows.slice(i, i + BATCH));
    if (!error) inserted += Math.min(BATCH, rows.length - i);
  }
  return inserted;
}

export async function updateLeadStatus(id: string, status: string, sentAt?: string): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (sentAt) updates.sent_at = sentAt;
  await sb().from("leads").update(updates).eq("id", id);
}

// ─── Batches ──────────────────────────────────────────────────────────────────

export async function createBatch(clientId: string, fileName: string, total: number, source = "csv"): Promise<string> {
  const { data } = await sb().from("lead_import_batches")
    .insert({ client_id: clientId, file_name: fileName, total_leads: total, source })
    .select("id").single();
  return data!.id;
}

// ─── Daily Sends ──────────────────────────────────────────────────────────────

export async function getDailySendCount(clientId: string, date: string): Promise<number> {
  const { data } = await sb().from("daily_sends").select("count").eq("client_id", clientId).eq("send_date", date).single();
  return data?.count ?? 0;
}

export async function incrementDailySend(clientId: string, date: string, amount: number): Promise<void> {
  const current = await getDailySendCount(clientId, date);
  await sb().from("daily_sends").upsert(
    { client_id: clientId, send_date: date, count: current + amount },
    { onConflict: "client_id,send_date" }
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getOperatorStats() {
  const [c, l, s] = await Promise.all([
    sb().from("clients").select("*", { count: "exact", head: true }),
    sb().from("leads").select("*", { count: "exact", head: true }),
    sb().from("leads").select("*", { count: "exact", head: true }).eq("status", "mensagem_enviada"),
  ]);
  return { totalClients: c.count ?? 0, totalLeads: l.count ?? 0, totalSent: s.count ?? 0 };
}

export async function getClientStats(clientId: string) {
  const today = new Date().toISOString().split("T")[0];
  const [total, interested, statusData, sentToday] = await Promise.all([
    sb().from("leads").select("*", { count: "exact", head: true }).eq("client_id", clientId),
    sb().from("leads").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "interessado"),
    sb().from("leads").select("status").eq("client_id", clientId),
    getDailySendCount(clientId, today),
  ]);
  const statusCounts: Record<string, number> = {};
  (statusData.data ?? []).forEach((r: { status: string }) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  });
  return { totalLeads: total.count ?? 0, interested: interested.count ?? 0, sentToday, statusCounts };
}

export async function getRecentClients(limit = 5): Promise<ClientRow[]> {
  const { data } = await sb().from("clients").select("*").order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

// ─── Seed inicial (operador padrão) ───────────────────────────────────────────

export async function seedOperatorIfEmpty(): Promise<void> {
  const { count } = await sb().from("users").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  const hash = bcrypt.hashSync("admin123", 10);
  await sb().from("users").insert({
    name: "Operador B2Lead", email: "admin@b2lead.com", password_hash: hash, role: "operator",
  });
}
