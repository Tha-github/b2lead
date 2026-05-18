import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  novo: "Novo Lead",
  mensagem_enviada: "Mensagem Enviada",
  respondeu: "Respondeu",
  interessado: "Interessado",
  nao_interessado: "Não Interessado",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  novo: "bg-slate-100 text-slate-700",
  mensagem_enviada: "bg-blue-100 text-blue-700",
  respondeu: "bg-yellow-100 text-yellow-700",
  interessado: "bg-green-100 text-green-700",
  nao_interessado: "bg-red-100 text-red-700",
};
