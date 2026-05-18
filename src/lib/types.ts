export type Role = "operator" | "client";

export type LeadStatus =
  | "novo"
  | "mensagem_enviada"
  | "respondeu"
  | "interessado"
  | "nao_interessado";

export type InstanceStatus = "connected" | "disconnected" | "connecting";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  profile_id: string | null;
  whatsapp_instance_id: string | null;
  active: boolean;
  daily_limit: number;
  message_template: string;
  target_profile: Record<string, unknown>;
  created_at: string;
}

export interface WhatsappInstance {
  id: string;
  instance_name: string;
  phone_number: string | null;
  status: InstanceStatus;
  client_id: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  import_batch_id: string | null;
  name: string;
  phone: string;
  company: string | null;
  email: string | null;
  segment: string | null;
  position: string | null;
  city: string | null;
  state: string | null;
  status: LeadStatus;
  scheduled_date: string | null;
  sent_at: string | null;
  extra_data: Record<string, unknown>;
  created_at: string;
}

export interface LeadImportBatch {
  id: string;
  client_id: string;
  file_name: string;
  total_leads: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  client_id: string;
  instance_id: string | null;
  remote_jid: string | null;
  last_message_at: string;
  created_at: string;
  lead?: Lead;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  direction: "outbound" | "inbound";
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  whatsapp_message_id: string | null;
  sent_at: string;
  created_at: string;
}

export interface DailySend {
  id: string;
  client_id: string;
  send_date: string;
  count: number;
}
