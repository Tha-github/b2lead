"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Map, Instagram, Search, Loader2, CheckCircle2,
  XCircle, Download, Phone, Mail, Globe,
  ChevronDown, ChevronUp, Square,
} from "lucide-react";
import type { ClientRow } from "@/lib/db";
import type { ExtractedLead } from "@/lib/scrapers/jobs";

const JOB_KEY = "b2lead_extraction_job";

interface Props { clients: ClientRow[] }

const SOURCES = [
  { id: "google_maps", label: "Google Maps", icon: Map, color: "text-green-600 bg-green-50 border-green-200", description: "Empresas locais — telefone, endereço e site" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600 bg-pink-50 border-pink-200", description: "Perfis comerciais públicos com contato no bio" },
];

type JobStatus = "idle" | "starting" | "running" | "done" | "error" | "stopped";

export default function ExtracaoClient({ clients }: Props) {
  const router = useRouter();
  const [source, setSource] = useState("google_maps");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [maxResults, setMaxResults] = useState(50);
  const [clientId, setClientId] = useState("");

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<ExtractedLead[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Reconecta ao job salvo no localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem(JOB_KEY);
    if (saved) {
      try {
        const { jobId: id, status } = JSON.parse(saved);
        if (id && (status === "running" || status === "starting")) {
          setJobId(id);
          setJobStatus("running");
        } else if (id && (status === "done" || status === "stopped")) {
          setJobId(id);
          setJobStatus(status);
        }
      } catch {}
    }
  }, []);

  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/extracao/status?job=${id}`);
      if (!res.ok) {
        localStorage.removeItem(JOB_KEY);
        setJobStatus("idle");
        setJobId(null);
        return;
      }
      const data = await res.json();
      setProgress(data.progress ?? 0);
      setTotal(data.total ?? 0);
      setResults(data.results ?? []);
      setJobStatus(data.status as JobStatus);

      localStorage.setItem(JOB_KEY, JSON.stringify({ jobId: id, status: data.status }));

      if (data.status === "done") {
        clearInterval(pollRef.current!);
        setSelected(new Set((data.results ?? []).map((_: ExtractedLead, i: number) => i)));
        toast.success(`${data.results?.length ?? 0} leads encontrados!`);
      }
      if (data.status === "stopped") {
        clearInterval(pollRef.current!);
        toast.info(`Extração pausada com ${data.results?.length ?? 0} leads`);
        setSelected(new Set((data.results ?? []).map((_: ExtractedLead, i: number) => i)));
      }
      if (data.status === "error") {
        clearInterval(pollRef.current!);
        setErrorMsg(data.error || "Erro desconhecido");
        toast.error("Erro na extração");
      }
    } catch {
      // Ignora erros de rede durante polling
    }
  }, []);

  useEffect(() => {
    if (!jobId || (jobStatus !== "running" && jobStatus !== "starting")) return;
    poll(jobId);
    pollRef.current = setInterval(() => poll(jobId), 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, jobStatus, poll]);

  async function handleStart() {
    if (!clientId) { toast.error("Selecione o cliente antes de iniciar"); return; }
    if (source === "google_maps" && !query) { toast.error("Preencha o tipo de negócio"); return; }
    if (source === "instagram" && !hashtag) { toast.error("Preencha a hashtag"); return; }

    setJobStatus("starting");
    setResults([]);
    setProgress(0);
    setSelected(new Set());
    setErrorMsg("");

    const res = await fetch("/api/extracao/iniciar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, query, location, hashtag, maxResults }),
    });
    const data = await res.json();

    if (!res.ok) { toast.error(data.error); setJobStatus("idle"); return; }

    setJobId(data.jobId);
    setJobStatus("running");
    localStorage.setItem(JOB_KEY, JSON.stringify({ jobId: data.jobId, status: "running" }));
    toast.info("Extração iniciada — Chrome rodando em segundo plano");
  }

  async function handleStop() {
    if (!jobId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    await fetch("/api/extracao/parar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    // Poll final para pegar todos os resultados já coletados
    await poll(jobId);
    setJobStatus("stopped");
    localStorage.setItem(JOB_KEY, JSON.stringify({ jobId, status: "stopped" }));
    toast.info(`Extração pausada`);
  }

  async function handleSave() {
    if (!clientId) { toast.error("Selecione o cliente"); return; }
    if (selected.size === 0) { toast.error("Selecione ao menos um lead"); return; }

    setSaving(true);
    const res = await fetch("/api/extracao/salvar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, clientId, selectedIndexes: Array.from(selected) }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { toast.error(data.error); return; }

    toast.success(`${data.count} leads salvos!`);
    localStorage.removeItem(JOB_KEY);
    router.push("/operator/leads");
  }

  function handleNewSearch() {
    if (pollRef.current) clearInterval(pollRef.current);
    localStorage.removeItem(JOB_KEY);
    setJobId(null);
    setJobStatus("idle");
    setResults([]);
    setSelected(new Set());
    setProgress(0);
    setErrorMsg("");
  }

  function toggleSelect(i: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  const isRunning = jobStatus === "running" || jobStatus === "starting";
  const isFinished = jobStatus === "done" || jobStatus === "stopped";
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Painel esquerdo */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Configurar Extração</h2>

          {/* Cliente — selecionado antes de começar */}
          <div>
            <label className="label">Cliente</label>
            {clients.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Nenhum cliente cadastrado.{" "}
                <a href="/operator/clientes" className="font-semibold underline">Criar cliente</a>
              </div>
            ) : (
              <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={isRunning}>
                <option value="">Selecione o cliente...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="label">Fonte</label>
            {SOURCES.map((s) => (
              <button key={s.id} onClick={() => !isRunning && setSource(s.id)} disabled={isRunning}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${source === s.id ? s.color + " border-current" : "border-slate-200 hover:border-slate-300"} disabled:opacity-50`}>
                <s.icon className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.description}</p>
                </div>
              </button>
            ))}
          </div>

          {source === "google_maps" && (
            <>
              <div>
                <label className="label">Tipo de negócio</label>
                <input className="input" placeholder="ex: clínicas odontológicas, academias..." value={query} onChange={(e) => setQuery(e.target.value)} disabled={isRunning} />
              </div>
              <div>
                <label className="label">Cidade / Região</label>
                <input className="input" placeholder="ex: São Paulo SP, Campinas..." value={location} onChange={(e) => setLocation(e.target.value)} disabled={isRunning} />
              </div>
            </>
          )}

          {source === "instagram" && (
            <div>
              <label className="label">Hashtag</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">#</span>
                <input className="input pl-7" placeholder="ex: clinicaodontologica" value={hashtag} onChange={(e) => setHashtag(e.target.value.replace(/^#/, ""))} disabled={isRunning} />
              </div>
            </div>
          )}

          <div>
            <label className="label">Máximo: <span className="text-brand-600 font-semibold">{maxResults}</span></label>
            <input type="range" min={10} max={200} step={10} value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="w-full accent-brand-600" disabled={isRunning} />
            <div className="flex justify-between text-xs text-slate-400"><span>10</span><span>200</span></div>
          </div>

          {!isRunning && !isFinished && (
            <button onClick={handleStart} className="btn-primary w-full justify-center py-3">
              <Search className="h-4 w-4" />Iniciar Extração
            </button>
          )}

          {isRunning && (
            <button onClick={handleStop} className="btn-danger w-full justify-center py-3">
              <Square className="h-4 w-4" />Parar Extração
            </button>
          )}

          {isFinished && (
            <button onClick={handleNewSearch} className="btn-secondary w-full justify-center py-3">
              <Search className="h-4 w-4" />Nova Busca
            </button>
          )}
        </div>

        {/* Salvar */}
        {isFinished && results.length > 0 && (
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">Salvar Leads</h2>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-brand-600">{selected.size}</span> de {results.length} selecionados
              {clientId && <span className="text-slate-400"> → {clients.find(c => c.id === clientId)?.name}</span>}
            </p>
            {!clientId && (
              <p className="text-xs text-red-500">Selecione o cliente acima antes de salvar</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !clientId || selected.size === 0}
              className="btn-primary w-full justify-center"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                : <><Download className="h-4 w-4" />Salvar {selected.size} leads</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Resultados */}
      <div className="lg:col-span-2">
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-800">
                {isRunning ? "Extraindo..." : isFinished ? "Leads encontrados" : "Resultados"}
              </h2>
              {results.length > 0 && <span className="badge bg-brand-100 text-brand-700">{results.length}</span>}
            </div>
            {results.length > 0 && (
              <div className="flex gap-2 text-xs">
                <button onClick={() => setSelected(new Set(results.map((_, i) => i)))} className="text-brand-600 hover:underline">Todos</button>
                <span className="text-slate-300">|</span>
                <button onClick={() => setSelected(new Set())} className="text-slate-500 hover:underline">Nenhum</button>
              </div>
            )}
          </div>

          {isRunning && (
            <div className="px-6 py-4 border-b border-slate-100 bg-blue-50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-blue-700 font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />Chrome rodando em segundo plano...
                </span>
                <span className="text-blue-600 font-semibold">{progress} encontrados</span>
              </div>
              {total > 0 && (
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
              <p className="text-xs text-blue-500 mt-1">Os leads aparecem aqui em tempo real. Você pode navegar para outras abas.</p>
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
            {results.map((lead, i) => (
              <div key={i} className={`px-4 py-3 transition-colors ${selected.has(i) ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggleSelect(i)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-800 text-sm truncate">{lead.name}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{lead.source}</span>
                        <button onClick={() => setExpanded(expanded === i ? null : i)} className="text-slate-400 hover:text-slate-600">
                          {expanded === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      {lead.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{lead.phone}</span>}
                      {lead.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {(lead.city || lead.state) && <span className="text-xs text-slate-500">{[lead.city, lead.state].filter(Boolean).join(", ")}</span>}
                    </div>
                    {expanded === i && (
                      <div className="mt-2 text-xs text-slate-600 bg-white rounded-lg p-2 border border-slate-100 space-y-1">
                        {lead.segment && <p><span className="text-slate-400">Segmento:</span> {lead.segment}</p>}
                        {lead.website && (
                          <p className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-slate-400" />
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline truncate max-w-[250px]">{lead.website}</a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!isRunning && results.length === 0 && (
              <div className="px-6 py-16 text-center">
                <Search className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Configure a busca e clique em &quot;Iniciar Extração&quot;</p>
                <p className="text-slate-300 text-xs mt-1">Um Chrome abrirá em segundo plano e coletará os dados automaticamente</p>
              </div>
            )}
          </div>

          {jobStatus === "done" && results.length > 0 && (
            <div className="px-6 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700 font-medium">Concluído — {results.length} leads encontrados</p>
            </div>
          )}
          {jobStatus === "stopped" && results.length > 0 && (
            <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-100 flex items-center gap-2">
              <Square className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-700 font-medium">Pausado — {results.length} leads coletados até agora</p>
            </div>
          )}
          {jobStatus === "error" && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-100">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">Erro na extração</p>
              </div>
              {errorMsg && <p className="text-xs text-red-500 ml-6">{errorMsg}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
