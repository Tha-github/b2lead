import { randomUUID } from "crypto";

export interface ExtractedLead {
  name: string;
  phone: string;
  company: string;
  email: string;
  segment: string;
  city: string;
  state: string;
  website: string;
  source: string;
}

export interface ScraperJob {
  id: string;
  status: "running" | "done" | "error" | "stopped";
  source: string;
  progress: number;
  total: number;
  results: ExtractedLead[];
  error?: string;
  shouldStop: boolean;
  startedAt: Date;
}

const g = global as typeof globalThis & { scraperJobs?: Map<string, ScraperJob> };
if (!g.scraperJobs) g.scraperJobs = new Map();
const jobs = g.scraperJobs;

export function createJob(source: string): ScraperJob {
  const job: ScraperJob = {
    id: randomUUID(),
    status: "running",
    source,
    progress: 0,
    total: 0,
    results: [],
    shouldStop: false,
    startedAt: new Date(),
  };
  jobs.set(job.id, job);
  return job;
}

export function stopJob(id: string) {
  const job = jobs.get(id);
  if (job && job.status === "running") {
    job.shouldStop = true;
    job.status = "stopped";
  }
}

export function getJob(id: string): ScraperJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<ScraperJob>) {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}

export function pushResult(id: string, lead: ExtractedLead) {
  const job = jobs.get(id);
  if (job) {
    job.results.push(lead);
    job.progress = job.results.length;
  }
}

// Limpa jobs antigos (>1h) para não acumular memória
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  Array.from(jobs.entries()).forEach(([id, job]) => {
    if (job.startedAt.getTime() < cutoff) jobs.delete(id);
  });
}, 15 * 60 * 1000);
