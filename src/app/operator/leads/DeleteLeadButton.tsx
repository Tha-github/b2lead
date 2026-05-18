"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DeleteLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/operator/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lead apagado");
      router.refresh();
    } else {
      toast.error("Erro ao apagar");
    }
    setLoading(false);
    setConfirm(false);
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={handleDelete} disabled={loading} className="text-xs text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded font-medium">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
