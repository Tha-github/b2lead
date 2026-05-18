"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, CheckCircle2, X } from "lucide-react";

interface Props {
  clients: { id: string; name: string }[];
}

interface ParsedRow {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  segment?: string;
  position?: string;
  city?: string;
  state?: string;
  [key: string]: string | undefined;
}

export default function CsvImporter({ clients }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDone(false);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as ParsedRow[];
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
        const rows = results.data as ParsedRow[];

        try {
          const res = await fetch("/api/leads/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: clientId,
              file_name: file.name,
              leads: rows,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          toast.success(`${data.count} leads importados com sucesso!`);
          setDone(true);
          setFile(null);
          setPreview([]);
          if (fileRef.current) fileRef.current.value = "";
          router.refresh();
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
        <select
          className="input"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Selecione o cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
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
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview([]); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-2 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Clique para selecionar ou arraste o CSV</p>
              <p className="text-xs text-slate-400 mt-1">Suporta arquivos .csv exportados da Dolphin</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </div>

      {preview.length > 0 && (
        <div>
          <p className="label">Prévia (primeiras {preview.length} linhas)</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {Object.keys(preview[0]).slice(0, 6).map((col) => (
                    <th key={col} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).slice(0, 6).map((val, j) => (
                      <td key={j} className="px-3 py-2 text-slate-700 truncate max-w-[150px]">{val || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Importação concluída!</span>
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={!file || !clientId || loading}
        className="btn-primary w-full justify-center py-3"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
        ) : (
          <><Upload className="h-4 w-4" /> Importar Leads</>
        )}
      </button>
    </div>
  );
}
