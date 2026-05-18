"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Eye, EyeOff } from "lucide-react";

export default function NewClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    daily_limit: "50",
    message_template: "Olá {{name}}, tudo bem? Vi que você atua na área de {{segment}} e gostaria de apresentar uma solução que pode te ajudar. Podemos conversar?",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/operator/criar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Cliente ${form.name} criado com sucesso!`);
      setOpen(false);
      setForm({ name: "", email: "", password: "", daily_limit: "50", message_template: form.message_template });
      router.push("/operator/clientes");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" />
        Novo Cliente
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Novo Cliente</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nome do cliente</label>
                <input
                  className="input"
                  placeholder="Ex: Empresa ABC"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Email de acesso</label>
                <input
                  type="email"
                  className="input"
                  placeholder="cliente@empresa.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Senha de acesso</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input pr-10"
                    placeholder="Senha que será enviada ao cliente"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Limite diário de leads</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={50}
                  value={form.daily_limit}
                  onChange={(e) => setForm({ ...form, daily_limit: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Máximo 50 leads por dia</p>
              </div>

              <div>
                <label className="label">Template da mensagem</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Use {{name}}, {{segment}}, {{company}}, {{position}}"
                  value={form.message_template}
                  onChange={(e) => setForm({ ...form, message_template: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-slate-400 mt-1">Variáveis: {'{{name}}'}, {'{{segment}}'}, {'{{company}}'}, {'{{position}}'}, {'{{city}}'}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
