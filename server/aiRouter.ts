// Nova AI Router — a provider layer that exposes 10-15 free AI models.
//
// Providers:
//   local         -> offline Local Lab Tutor (always available, no key, no internet)
//   pollinations  -> keyless, free (https://text.pollinations.ai)  [free tier may require signup in 2026]
//   gemini        -> Google AI Studio key (GEMINI_API_KEY)
//   groq          -> Groq free tier key (GROQ_API_KEY)
//   openrouter    -> OpenRouter key (OPENROUTER_API_KEY) — any ":free" model
//
// GET /api/nova/models returns the models that are currently usable (based on
// which API keys are present). POST /api/nova/chat routes to the chosen model
// and falls back to the offline Local Lab Tutor whenever a provider fails, so
// the lab always works — with or without keys or internet.

export type Language = 'en-GB' | 'hi-IN';

export interface RouterModel {
  id: string; // "provider:model"
  provider: 'local' | 'pollinations' | 'gemini' | 'groq' | 'openrouter';
  label: string;
  providerLabel: string;
  needsKey: boolean;
}

interface ModelDef {
  id: string;
  label: string;
}

const POLLINATIONS_MODELS: ModelDef[] = [
  { id: 'openai', label: 'OpenAI GPT (free)' },
  { id: 'mistral', label: 'Mistral (free)' },
  { id: 'gemini', label: 'Gemini (free)' },
  { id: 'deepseek', label: 'DeepSeek (free)' },
  { id: 'llama', label: 'Llama (free)' },
  { id: 'qwen-coder', label: 'Qwen Coder (free)' },
  { id: 'gemma', label: 'Gemma (free)' },
];

const GEMINI_MODELS: ModelDef[] = [
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
];

const GROQ_MODELS: ModelDef[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  { id: 'qwen-2.5-coder-32b', label: 'Qwen 2.5 Coder 32B' },
];

// Free model slugs verified live against openrouter.ai/api/v1/models (2026).
const OPENROUTER_MODELS: ModelDef[] = [
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B' },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B' },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra 550B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B' },
  { id: 'inclusionai/ling-3.0-tiny:free', label: 'Ling 3.0 Tiny' },
  { id: 'poolside/laguna-s-2.1:free', label: 'Laguna S 2.1' },
];

const PROVIDER_LABELS: Record<RouterModel['provider'], string> = {
  local: 'Local Lab Tutor',
  pollinations: 'Pollinations (free)',
  gemini: 'Google Gemini',
  groq: 'Groq',
  openrouter: 'OpenRouter',
};

function registry(): RouterModel[] {
  const out: RouterModel[] = [
    {
      id: 'local:tutor',
      provider: 'local',
      label: 'Local Lab Tutor',
      providerLabel: PROVIDER_LABELS.local,
      needsKey: false,
    },
  ];
  const push = (provider: RouterModel['provider'], models: ModelDef[]) => {
    for (const m of models) {
      out.push({
        id: `${provider}:${m.id}`,
        provider,
        label: m.label,
        providerLabel: PROVIDER_LABELS[provider],
        needsKey: provider !== 'pollinations',
      });
    }
  };
  push('pollinations', POLLINATIONS_MODELS);
  push('gemini', GEMINI_MODELS);
  push('groq', GROQ_MODELS);
  push('openrouter', OPENROUTER_MODELS);
  return out;
}

const ALL_MODELS = registry();

const KEY_ENV: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

// Only OpenRouter ":free" models are exposed in the model dropdown. The offline
// Local Lab Tutor stays as an invisible fallback inside routeChat, so chat never
// breaks even if the key is missing or the provider is rate-limited.
export function getAvailableModels(): RouterModel[] {
  const key = process.env[KEY_ENV.openrouter];
  const hasKey = Boolean(key && key.length > 0);
  return ALL_MODELS.filter((m) => m.provider === 'openrouter' && hasKey);
}

export function getModel(id: string | undefined): RouterModel | null {
  return ALL_MODELS.find((m) => m.id === (id || 'local:tutor')) || null;
}

// ---------- Language-aware system prompts ----------

export function systemPromptFor(language: Language, experiment: string | undefined): string {
  const base =
    'You are Nova, an expert AI Chemistry Lab Assistant inside a 3D Virtual Chemistry Lab for school students. ' +
    `Current experiment: ${experiment || 'None selected / Sandbox Mode'}. ` +
    'Respond in PLAIN TEXT ONLY - never use markdown symbols (#, *, _, $, bullet lists), because your answer is read aloud by a text-to-speech voice. Keep answers short and encouraging.';

  if (language === 'hi-IN') {
    return (
      base +
      '\nLANGUAGE: You MUST reply in HINGLISH - exactly like a friendly Indian Chemistry teacher (Guruji) speaking to students. Rules:\n' +
      '1. Scientific and chemical terms stay in English: e.g. "Hydrochloric Acid", "Sodium Hydroxide", "precipitate", "pH", "reaction", "Oxygen gas".\n' +
      '2. All explanation and instruction words are written in HINDI using DEVANAGARI script, e.g. "अब बीकर में थोड़ा-थोड़ा मिलाओ", "नीला अवक्षेप बनता है", "याद रखो बच्चों".\n' +
      '3. Use warm Indian-teacher phrases like "देखो बच्चों", "याद रखो", "समझ गए न?".\n' +
      '4. Scientific terms must remain English (never translate terms like "beaker", "precipitate"), the rest in Devanagari Hindi.\n' +
      '5. Keep it to 2-4 short sentences. Speak naturally like a Hindi-medium school teacher.'
    );
  }

  return (
    base +
    '\nLANGUAGE: Speak in clear, warm British English (UK). Use correct chemistry terminology and state symbols like (s), (l), (g), (aq) when useful. Keep it to 1-3 short sentences.'
  );
}

// ---------- Small in-memory cache so keyless polls don't spam the free tier ----------

const cache = new Map<string, { text: string; at: number }>();
const CACHE_TTL = 30000; // 30s

function cached(key: string): string | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.text;
  if (hit) cache.delete(key);
  return null;
}

function store(key: string, text: string) {
  cache.set(key, { text, at: Date.now() });
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

// ---------- Providers ----------

async function callPollinations(model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 400,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Pollinations empty reply');
  return text.trim();
}

async function callGemini(model: string, system: string, user: string): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model,
    contents: user,
    config: { systemInstruction: system },
  });
  const text = response.text;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Gemini empty reply');
  return text.trim();
}

async function callGroq(model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Groq empty reply');
  return text.trim();
}

async function callOpenRouter(model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://localhost:3000',
      'X-Title': 'Mentis Chemistry Lab',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('OpenRouter empty reply');
  return text.trim();
}

// ---------- Offline Local Lab Tutor (works with zero keys / no internet) ----------

const has = (msg: string, ...needles: string[]) => needles.some((n) => msg.toLowerCase().includes(n.toLowerCase()));

function localTutor(message: string, experiment: string | undefined, language: Language): string {
  const msg = message.toLowerCase();

  if (has(msg, 'acid-base', 'acid base', 'neutralis', 'neutraliz', 'titration', 'hydrochloric', 'phenolphthalein')) {
    return language === 'hi-IN'
      ? 'देखो बच्चों, jab हम Hydrochloric Acid को Sodium Hydroxide के साथ मिलाते हैं तो Neutralisation reaction होती है। Acid और Base मिलकर Salt और Water बनाते हैं। Phenolphthalein indicator acid में colourless रहता है, पर जैसे ही Base ज़्यादा होता है, solution vibrant MAGENTA PINK हो जाता है! यही हमारा Endpoint है, समझ गए न?'
      : 'In this neutralisation titration, Hydrochloric Acid reacts with Sodium Hydroxide to form Sodium Chloride salt and water. Phenolphthalein stays colourless on the acid side, then turns pink at the endpoint and vivid magenta when the base is in excess.';
  }

  if (has(msg, 'oxygen', 'kmno4', 'permanganate')) {
    return language === 'hi-IN'
      ? 'जब Potassium Permanganate को 200°C से ऊपर गर्म करते हैं, तो यह thermally decompose होकर Oxygen gas छोड़ता है। देखो, bubbles उठ रहे हैं — यही Oxygen gas है! याद रखो, glowing splint को gas के पास ले जाओ तो वह flame से जल उठेगा।'
      : 'Heating Potassium Permanganate above 200 degrees Celsius causes thermal decomposition, releasing Oxygen gas. A glowing splint relights in this gas — the classic test for oxygen.';
  }

  if (has(msg, 'cuso4', 'copper sulfate', 'copper sulphate', 'blue vitriol')) {
    if (has(msg, 'naoh', 'sodium hydroxide', 'base')) {
      return language === 'hi-IN'
        ? 'Copper Sulfate में Sodium Hydroxide मिलाने से gelatinous light blue precipitate बनता है — वह है Copper Hydroxide, Cu(OH)₂। Reaction का equation याद रखो: CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄।'
        : 'Adding Sodium Hydroxide to Copper Sulfate solution forms a gelatinous light blue precipitate of Copper(II) Hydroxide, Cu(OH)2. The equation is CuSO4 + 2NaOH gives Cu(OH)2 precipitate plus Na2SO4.';
    }
    return language === 'hi-IN'
      ? 'Copper Sulfate aqueous solution का deep blue colour aqueous Copper ions, Cu²⁺, की वजह से होता है। यह सबसे common और beautiful transition metal salt है।'
      : 'Copper Sulfate solution is deep blue because of aqueous Copper(II) ions, Cu2+. It is the classic transition-metal salt used in electrolysis and double displacement reactions.';
  }

  if (has(msg, 'kmno4', 'permanganate') && has(msg, 'hcl', 'hydrochloric')) {
    return language === 'hi-IN'
      ? 'सावधान बच्चों! Potassium Permanganate और Hydrochloric Acid की reaction से toxic Chlorine gas निकलती है। यह reaction fume hood में ही करनी चाहिए।'
      : 'Careful! Potassium Permanganate oxidises Hydrochloric Acid to release toxic Chlorine gas, Cl2. This reaction must always be done under a fume hood.';
  }

  if (has(msg, 'h2o2', 'hydrogen peroxide')) {
    return language === 'hi-IN'
      ? 'Hydrogen Peroxide धीरे-धीरे अपने आप decompose होकर Oxygen gas और Water बनाता है। थोड़ा Manganese Dioxide या Potassium Permanganate डाल दो, तो decomposition बहुत fast हो जाता है और ढेर सारा Oxygen बुलबुले बनता है!'
      : 'Hydrogen Peroxide slowly decomposes into Oxygen gas and water. Adding a little Manganese Dioxide or Potassium Permanganate catalyses it, releasing Oxygen rapidly.';
  }

  if (has(msg, 'ki', 'potassium iodide', 'lead', 'pbi')) {
    return language === 'hi-IN'
      ? 'Potassium Iodide को Lead Nitrate के साथ मिलाओ तो golden yellow precipitate बनता है — Lead Iodide, PbI₂। यह famous Golden Rain experiment है!'
      : 'Potassium Iodide reacts with Lead Nitrate to form a golden yellow precipitate of Lead Iodide, PbI2 — the famous Golden Rain experiment.';
  }

  if (has(msg, 'litmus', 'acid', 'indicator')) {
    return language === 'hi-IN'
      ? 'Litmus paper का रंग हमें बताता है कि solution acid है या base। Acid में blue litmus red हो जाता है, और base में red litmus blue। याद रखो: RED for ACID, BLUE for BASE!'
      : 'Litmus paper tells us whether a solution is acidic or basic. Blue litmus turns red in acid, and red litmus turns blue in base. Red for acid, blue for base.';
  }

  if (experiment && has(msg, 'step', 'guide', 'how', 'perform', 'procedure')) {
    return language === 'hi-IN'
      ? `चलो बच्चों, हम "${experiment}" शुरू करते हैं। पहले सारा equipment table पर arrange करो, फिर each chemical की quantity carefully measure करो। Indicator हमेशा थोड़ा-थोड़ा डालो और colour change ध्यान से देखो। प्रश्न हो तो पूछो, main step-by-step guide करूँगा।`
      : `Let us begin the experiment "${experiment}". First arrange all equipment on the table, then measure each chemical carefully. Add the indicator a little at a time and watch for the colour change. I will guide you step by step.`;
  }

  if (has(msg, 'property', 'what is', 'explain', 'about')) {
    return language === 'hi-IN'
      ? 'सबसे पहले chemical की identity जानना ज़रूरी है — उसका formula, physical state और chemical properties। अपने workstation table पर रखे chemical को select करो, मैं उसकी properties detail में बताऊँगा।'
      : 'Always identify a chemical by its formula, physical state and key properties before use. Select the chemical on your workstation table and I will explain its properties in detail.';
  }

  return language === 'hi-IN'
    ? 'Nova यहाँ हमेशा मौजूद है! अपनी workstation table पर chemicals arrange करो, एक दूसरे में pour करो, या experiment select करो — main step-by-step guide करूँगा। कौन सा reaction try करना चाहते हो?'
    : 'Nova is right here with you in the lab. Arrange chemicals on your workstation table, pour them together, or select an experiment — I will guide you step by step. Which reaction would you like to try?';
}

// ---------- Router ----------

export interface ChatInput {
  message: string;
  experiment?: string;
  model?: string;
  language?: Language;
}

export async function routeChat(input: ChatInput): Promise<{ text: string; usedLocalFallback: boolean }> {
  const language: Language = input.language === 'en-GB' ? 'en-GB' : 'hi-IN';
  const model = getModel(input.model);
  const system = systemPromptFor(language, input.experiment);
  const user = input.message || 'Hello Nova';

  const key = `${model?.id || 'local:tutor'}::${language}::${user.slice(0, 200)}`;
  const hit = cached(key);
  if (hit) return { text: hit, usedLocalFallback: false };

  try {
    let text: string;
    switch (model?.provider) {
      case 'local':
        text = localTutor(user, input.experiment, language);
        break;
      case 'gemini':
        text = await callGemini(model.id.split(':')[1], system, user);
        break;
      case 'groq':
        text = await callGroq(model.id.split(':')[1], system, user);
        break;
      case 'openrouter':
        text = await callOpenRouter(model.id.split(':')[1], system, user);
        break;
      default:
        text = await callPollinations(model?.id.split(':')[1] || 'openai', system, user);
        break;
    }
    store(key, text);
    return { text, usedLocalFallback: false };
  } catch (err) {
    // Provider unreachable / no key / rate limited -> offline Local Lab Tutor.
    console.warn(`Nova provider "${model?.id || 'local'}" failed, using Local Lab Tutor:`, (err as Error)?.message);
    const fallback = localTutor(user, input.experiment, language);
    store(key, fallback);
    return { text: fallback, usedLocalFallback: true };
  }
}
