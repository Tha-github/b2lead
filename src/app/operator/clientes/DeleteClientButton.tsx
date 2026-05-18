"use client";

import { useState } from "react";
import { Trash2, Loader2, X, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/operator/clientes/${clientId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Cliente apagado");
      setOpen(false);
      router.push("/operator/clientes");
      router.refresh();
    } else {
      toast.error("Erro ao apagar cliente");
    }
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-danger">
        <Trash2 className="h-4 w-4" />
        Apagar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Apagar cliente</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-slate-700">
                Tem certeza que deseja apagar <strong>{clientName}</strong>?
              </p>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                ⚠️ Isso vai apagar também todos os leads, importações e o acesso de login deste cliente. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleDelete} disabled={loading} className="btn-danger flex-1 justify-center">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, apagar tudo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
