export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequestBody = {
  messages: ChatMessage[];
  temperature?: number;
  model?: string;
};

export type ChatResponseBody = {
  text: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatRole(value: unknown): value is ChatRole {
  return value === "system" || value === "user" || value === "assistant";
}

export function parseChatRequest(body: unknown): {
  messages: ChatMessage[];
  temperature: number;
  model: string;
} {
  if (!isRecord(body)) throw new Error("Invalid JSON body");

  const messagesRaw = body.messages;
  if (!Array.isArray(messagesRaw) || messagesRaw.length === 0) {
    throw new Error("'messages' must be a non-empty array");
  }

  const messages: ChatMessage[] = messagesRaw.map((m, idx) => {
    if (!isRecord(m)) throw new Error(`messages[${idx}] must be an object`);

    const role = m.role;
    const content = m.content;

    if (!isChatRole(role)) {
      throw new Error(`messages[${idx}].role must be system|user|assistant`);
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error(`messages[${idx}].content must be a non-empty string`);
    }

    return { role, content };
  });

  const temperatureRaw = body.temperature;
  const temperature =
    typeof temperatureRaw === "number" && Number.isFinite(temperatureRaw)
      ? temperatureRaw
      : 0.7;

  if (temperature < 0 || temperature > 2) {
    throw new Error("'temperature' must be between 0 and 2");
  }

  const modelRaw = body.model;
  const model = typeof modelRaw === "string" && modelRaw.trim() ? modelRaw : "gemini-2.5-flash";

  return { messages, temperature, model };
}
