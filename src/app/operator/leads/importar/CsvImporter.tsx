"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, CheckCircle2, X } from "lucide-react";
import type { ClientRow } from "@/lib/db";

interface Props {
  clients: ClientRow[];
}

interface ParsedRow {
  name?: string;
  phone?: string;
  [key: string]: string | undefined;
}

function normalizeRow(row: ParsedRow) {
  const lower: Record<string, string> = {};
  Object.keys(row).forEach((k) => { lower[k.toLowerCase().trim()] = (row[k] ?? "").trim(); });
  return {
    name: lower["name"] || lower["nome"] || "",
    phone: lower["phone"] || lower["telefone"] || lower["whatsapp"] || lower["celular"] || "",
  };
}

export default function CsvImporter({ clients }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ name: string; phone: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDone(null);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as ParsedRow[]).map(normalizeRow).filter((r) => r.name && r.phone);
        setPreview(rows.slice(0, 5));
      },
    });
  }

  async function handleImport() {
    if (!file || !clientId) {
      toast.error("Selecione o cliente e o arquivo CSV");
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = (results.data as ParsedRow[])
          .map(normalizeRow)
          .filter((r) => r.name && r.phone)
          .map((r) => ({
            name: r.name,
            phone: r.phone.replace(/\D/g, ""),
            company: null,
            email: null,
            segment: null,
            position: null,
            city: null,
            state: null,
            status: "novo",
            sent_at: null,
          }));

        if (!rows.length) {
          toast.error("Nenhuma linha válida encontrada. Verifique se o CSV tem colunas 'name' e 'phone'.");
          setLoading(false);
          return;
        }

        try {
          const res = await fetch("/api/leads/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: clientId, file_name: file.name, leads: rows }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          toast.success(`${data.count} leads importados!`);
          setDone(data.count);
          setFile(null);
          setPreview([]);
          if (fileRef.current) fileRef.current.value = "";
          router.push("/operator/leads");
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Erro ao importar");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label">Cliente</label>
        <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Selecione o cliente...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Arquivo CSV</label>
        <div
          className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-brand-600" />
              <div className="text-left">
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview([]); setDone(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-2 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Clique para selecionar ou arraste o CSV</p>
              <p className="text-xs text-slate-400 mt-1">Arquivo .csv com colunas name e phone</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </div>

      {preview.length > 0 && (
        <div>
          <p className="label">Prévia ({preview.length} linhas válidas mostradas)</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Nome</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Telefone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-slate-700">{row.name}</td>
                    <td className="px-4 py-2 text-slate-700 font-mono">{row.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {done !== null && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{done} leads importados com sucesso!</span>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={!file || !clientId || loading}
        className="btn-primary w-full justify-center py-3"
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
          : <><Upload className="h-4 w-4" /> Importar Leads</>
        }
      </button>
    </div>
  );
}
