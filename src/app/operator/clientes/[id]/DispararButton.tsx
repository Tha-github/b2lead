"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";

interface Props {
  clientId: string;
  pending: number;
  sentToday: number;
  dailyLimit: number;
}

export default function DispararButton({ pending, sentToday, dailyLimit }: Props) {
  const remaining = dailyLimit - sentToday;

  return (
    <div className="card p-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <CalendarClock className="h-5 w-5 text-brand-600 flex-shrink-0" />
        <div>
          <p className="font-semibold text-slate-800">
            {sentToday}/{dailyLimit} enviados hoje &nbsp;·&nbsp; {pending} na fila &nbsp;·&nbsp; {remaining} restantes
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Use a Fila do Dia para enviar manualmente via WhatsApp Web</p>
        </div>
      </div>
      <Link href="/operator/fila" className="btn-primary whitespace-nowrap">
        <CalendarClock className="h-4 w-4" />
        Abrir Fila
      </Link>
    </div>
  );
}
