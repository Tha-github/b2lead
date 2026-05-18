import { createClient } from "@/lib/supabase/server";
import CsvImporter from "./CsvImporter";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ImportarLeadsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/operator/leads" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Faça upload de um arquivo CSV exportado da Dolphin</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm font-medium text-blue-800 mb-2">Colunas esperadas no CSV:</p>
          <div className="flex flex-wrap gap-2">
            {["name", "phone", "company", "email", "segment", "position", "city", "state"].map((col) => (
              <code key={col} className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs text-blue-700">
                {col}
              </code>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Apenas <strong>name</strong> e <strong>phone</strong> são obrigatórios. As demais colunas são opcionais.
          </p>
        </div>

        <CsvImporter clients={clients ?? []} />
      </div>
    </div>
  );
}
