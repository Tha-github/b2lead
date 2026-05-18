const EVOLUTION_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || "";

async function evolutionFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${error}`);
  }

  return res.json();
}

export async function createInstance(instanceName: string) {
  return evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

export async function getInstanceQRCode(instanceName: string) {
  return evolutionFetch(`/instance/connect/${instanceName}`);
}

export async function getInstanceStatus(instanceName: string) {
  return evolutionFetch(`/instance/connectionState/${instanceName}`);
}

export async function deleteInstance(instanceName: string) {
  return evolutionFetch(`/instance/delete/${instanceName}`, {
    method: "DELETE",
  });
}

export async function sendTextMessage(
  instanceName: string,
  phone: string,
  text: string
) {
  const number = phone.replace(/\D/g, "");
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      text,
    }),
  });
}

export async function setWebhook(instanceName: string, webhookUrl: string) {
  return evolutionFetch(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "CONNECTION_UPDATE",
      ],
    }),
  });
}

export function buildMessage(template: string, lead: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => lead[key] || "");
}
