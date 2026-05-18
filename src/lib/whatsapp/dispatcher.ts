// WhatsApp dispatcher removed in v1 — using manual wa.me links via Fila do Dia

export interface DispatchJob {
  id: string;
  clientId: string;
  status: "done";
  progress: number;
  total: number;
  log: string[];
}

export const dispatchJobs = new Map<string, DispatchJob>();
