"use client";

import { useState, useEffect, useRef } from "react";
import { formatDateTime, LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "@/lib/utils";
import { Send, MessageSquare, ImagePlus, X, Loader2 } from "lucide-react";
import type { Conversation, Message } from "@/lib/types";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  segment: string | null;
  status: string;
}

interface ConvWithLead extends Conversation {
  leads: Lead | null;
}

interface Props {
  conversations: ConvWithLead[];
  initialMessages: Record<string, Message[]>;
  clientId: string;
}

function parseContent(content: string): { type: "text" | "image"; text: string; src?: string; caption?: string } {
  if (content.startsWith("[IMAGE]")) {
    const rest = content.slice(7);
    const [src, caption] = rest.split("|");
    return { type: "image", text: caption || "", src, caption };
  }
  return { type: "text", text: content };
}

export default function ChatView({ conversations, initialMessages }: Props) {
  const [selected, setSelected] = useState<ConvWithLead | null>(conversations[0] ?? null);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const messages = selected ? (allMessages[selected.id] ?? []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function addLocalMessage(content: string) {
    if (!selected) return;
    const msg: Message = {
      id: `local-${Date.now()}`,
      conversation_id: selected.id,
      content,
      direction: "outbound",
      status: "sent",
      whatsapp_message_id: null,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setAllMessages((prev) => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] ?? []), msg],
    }));
  }

  async function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");
    addLocalMessage(content);
    await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: selected.id, content }),
    }).catch(() => {});
    setSending(false);
  }

  async function handleSendImage() {
    if (!imageFile || !selected || sending) return;
    setSending(true);

    const previewSrc = imagePreview!;
    const captionText = caption;
    clearImage();
    addLocalMessage(`[IMAGE]${previewSrc}${captionText ? `|${captionText}` : ""}`);

    const form = new FormData();
    form.append("conversation_id", selected.id);
    form.append("image", imageFile);
    form.append("caption", captionText);
    await fetch("/api/messages/send-image", { method: "POST", body: form }).catch(() => {});
    setSending(false);
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      {/* Lista de conversas */}
      <div className="w-72 card overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">{conversations.length} conversas</p>
        </div>
        <div className="divide-y divide-slate-100">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === conv.id ? "bg-blue-50 border-l-2 border-brand-600" : ""}`}
            >
              <p className="font-medium text-slate-800 text-sm truncate">{conv.leads?.name}</p>
              <p className="text-xs text-slate-500 truncate">{conv.leads?.company || conv.leads?.phone}</p>
              {conv.leads?.status && (
                <span className={`badge text-xs mt-1 ${LEAD_STATUS_COLORS[conv.leads.status]}`}>
                  {LEAD_STATUS_LABELS[conv.leads.status]}
                </span>
              )}
            </button>
          ))}
          {!conversations.length && (
            <div className="px-4 py-8 text-center space-y-2">
              <MessageSquare className="h-8 w-8 text-slate-200 mx-auto" />
              <p className="text-sm font-medium text-slate-500">Nenhuma conversa ainda</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                As conversas aparecem aqui quando os leads responderem às mensagens enviadas pelo operador.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Janela de chat */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="font-semibold text-slate-800">{selected.leads?.name}</p>
                <p className="text-sm text-slate-500">
                  {selected.leads?.company && `${selected.leads.company} · `}
                  {selected.leads?.phone}
                </p>
              </div>
              {selected.leads?.status && (
                <span className={`badge ${LEAD_STATUS_COLORS[selected.leads.status]}`}>
                  {LEAD_STATUS_LABELS[selected.leads.status]}
                </span>
              )}
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.map((msg) => {
                const parsed = parseContent(msg.content);
                return (
                  <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl overflow-hidden text-sm ${
                      msg.direction === "outbound"
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}>
                      {parsed.type === "image" ? (
                        <div>
                          <img
                            src={parsed.src}
                            alt="imagem"
                            className="max-w-full max-h-64 object-cover block"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          {parsed.caption && (
                            <p className="px-3 py-1.5 text-sm">{parsed.caption}</p>
                          )}
                        </div>
                      ) : (
                        <p className="px-4 py-2.5">{parsed.text}</p>
                      )}
                      <p className={`text-xs px-3 pb-1.5 ${msg.direction === "outbound" ? "text-blue-200" : "text-slate-400"}`}>
                        {formatDateTime(msg.sent_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!messages.length && (
                <div className="text-center py-12 text-slate-400 text-sm">Nenhuma mensagem ainda</div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Preview de imagem selecionada */}
            {imagePreview && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img src={imagePreview} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                    <button onClick={clearImage} className="absolute -top-2 -right-2 bg-white rounded-full border border-slate-200 p-0.5 text-slate-500 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      className="input text-sm"
                      placeholder="Legenda (opcional)"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                    />
                    <button onClick={handleSendImage} disabled={sending} className="btn-primary text-sm py-1.5 px-4">
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Enviar imagem
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input de texto */}
            {!imagePreview && (
              <form onSubmit={handleSendText} className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
                <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary px-3 flex-shrink-0"
                  title="Enviar imagem"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <input
                  className="input flex-1"
                  placeholder="Digite uma mensagem..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-4 flex-shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p>Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
