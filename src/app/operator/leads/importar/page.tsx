export const dynamic = "force-dynamic";

import { getClients } from "@/lib/db";
import CsvImporter from "./CsvImporter";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ImportarLeadsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/operator/leads" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Faça upload de um arquivo CSV com nome e WhatsApp</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm font-medium text-blue-800 mb-2">Colunas esperadas no CSV:</p>
          <div className="flex flex-wrap gap-2">
            {["name", "phone"].map((col) => (
              <code key={col} className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs text-blue-700 font-bold">
                {col}
              </code>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            O CSV precisa ter as colunas <strong>name</strong> (nome) e <strong>phone</strong> (número WhatsApp).
            Apenas os dígitos do número são salvos — pode vir com máscara.
          </p>
        </div>

        <CsvImporter clients={clients.filter((c) => c.active)} />
      </div>
    </div>
  );
}
