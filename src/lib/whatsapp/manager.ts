// WhatsApp integration removed in v1 — using manual wa.me links instead

export const waManager = {
  isConnected: (_: string) => false,
  listInstances: () => [],
  getStatus: (_: string): "disconnected" => "disconnected",
  getQR: (_: string): null => null,
  getPairingCode: (_: string): null => null,
  getError: (_: string): null => null,
  connect: async (_name: string, _clientId?: string) => {},
  connectWithPairingCode: async (_name: string, _phone: string, _clientId?: string): Promise<string> => "",
  sendMessage: async (_name: string, _phone: string, _text: string) => {
    throw new Error("WhatsApp não disponível nesta versão");
  },
  initializeFromDB: async () => {},
};
