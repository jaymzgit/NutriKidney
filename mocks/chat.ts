import { api } from "@/lib/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  /** Source chips from the RAG backend — absent for canned/offline replies. */
  citations?: ChatCitation[];
};

export type ChatCitation = {
  ref: number;
  source: string;
  page?: number | null;
  heading?: string | null;
  snippet?: string;
};

export type ChatContext = { ckdStage?: string | null };

export const SUGGESTED_QUESTIONS = [
  "Is banana safe for my kidneys?",
  "How much protein should I eat daily?",
  "Which Malaysian foods are low in potassium?",
  "How can I cut down on salt?",
];

export const ASSISTANT_GREETING =
  "Hello! I can answer questions about eating well with kidney disease — foods, nutrients, and portion sizes. What would you like to know?";

/** Canned answers keyed by topic. First matching keyword wins. */
const REPLIES: { keywords: string[]; reply: (stage: string) => string }[] = [
  {
    keywords: ["banana", "fruit", "orange", "durian", "mango"],
    reply: (stage) =>
      `Bananas are high in potassium (about 360 mg each).${stage} Lower-potassium fruits include apples, pears, grapes, pineapple and papaya in small portions. If you do have a banana, half a small one is a safer portion.`,
  },
  {
    keywords: ["protein", "meat", "chicken", "fish", "egg"],
    reply: (stage) =>
      `For CKD stages 1–2, about 0.8 g of protein per kg of body weight each day is usual. For stages 3–5 (not on dialysis) it's often lower, around 0.6 g/kg.${stage} Egg whites, fish and skinless chicken are good-quality choices. Your dietitian can set the right amount for you.`,
  },
  {
    keywords: ["potassium", "low potassium", "vegetable", "sayur"],
    reply: (stage) =>
      `Lower-potassium Malaysian choices include white rice, bihun, cabbage, cucumber, long beans and bean sprouts.${stage} Boiling vegetables in plenty of water and throwing the water away ("leaching") removes some potassium. Go easy on potatoes, tomatoes, coconut water and dried anchovies.`,
  },
  {
    keywords: ["salt", "sodium", "soy sauce", "kicap", "msg", "garam"],
    reply: (stage) =>
      `Most sodium comes from sauces and processed foods rather than the salt shaker.${stage} Try using half the kicap, ask hawkers for less sauce, and flavour food with garlic, ginger, lemongrass, lime or pepper instead. Instant noodles and their seasoning packets are especially salty.`,
  },
  {
    keywords: ["phosphorus", "dairy", "milk", "cheese", "nuts", "cola"],
    reply: (stage) =>
      `Phosphorus is high in dairy, nuts, whole grains and dark colas.${stage} Phosphate additives in processed meats and soft drinks are absorbed most easily, so these are the first to cut back. If your doctor prescribed phosphate binders, take them with meals.`,
  },
  {
    keywords: ["water", "drink", "fluid"],
    reply: (stage) =>
      `How much you should drink depends on your stage and whether you're on dialysis.${stage} Many people in early CKD don't need to limit fluids, but people on dialysis often do. Please check your daily fluid target with your kidney doctor.`,
  },
];

const FALLBACK =
  "That's a good question. I can help with foods, potassium, phosphorus, sodium, protein and fluids. Could you tell me a bit more about what you'd like to know?";

let counter = 0;
const newId = () => `msg-${Date.now()}-${++counter}`;

type ChatApiResponse = {
  reply: string;
  citations?: ChatCitation[];
  retrieval?: string;
};

/** Offline/keyword reply — the safety net when the backend is down or quota-less. */
function cannedReply(message: string, context: ChatContext): string {
  const lower = message.toLowerCase();
  const stageNote = context.ckdStage
    ? ` As you're at stage ${context.ckdStage}, keep an eye on your daily limits on the Home screen.`
    : "";
  const match = REPLIES.find((r) => r.keywords.some((k) => lower.includes(k)));
  return match ? match.reply(stageNote) : FALLBACK;
}

/**
 * Send a message to the CKD diet assistant and get its reply.
 *
 * Calls POST /chat (RAG over backend/knowledge/). Falls back to canned
 * keyword replies when the backend is unreachable, has no LLM key, or the
 * free-tier quota is exhausted — the user always gets a reply.
 * Keep this signature: the chat screen depends on it.
 */
export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  context: ChatContext = {}
): Promise<ChatMessage> {
  try {
    const data = await api.post<ChatApiResponse>("/chat", {
      message,
      // Send only recent turns; the backend trims further before prompting.
      history: history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
      ckd_stage: context.ckdStage ?? null,
    });
    return {
      id: newId(),
      role: "assistant",
      text: data.reply,
      citations: data.citations?.length ? data.citations : undefined,
      createdAt: new Date().toISOString(),
    };
  } catch (e: any) {
    // 429 = rate limited; other errors = offline / no key / quota. Fall back.
    console.log("[chat] API unavailable, using canned reply:", e?.message);
    return {
      id: newId(),
      role: "assistant",
      text: cannedReply(message, context),
      createdAt: new Date().toISOString(),
    };
  }
}

export function createUserMessage(text: string): ChatMessage {
  return { id: newId(), role: "user", text, createdAt: new Date().toISOString() };
}
