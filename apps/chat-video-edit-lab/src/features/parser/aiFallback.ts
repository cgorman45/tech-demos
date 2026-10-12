import { z } from "zod";
import type { Step } from "@/features/plan/steps";
import { stepId } from "@/features/plan/steps";

export interface AiSettings {
  provider: "anthropic" | "openai";
  apiKey: string;
  model: string;
}

const rangeSchema = z.union([
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("third"), which: z.enum(["first", "middle", "last"]) }),
  z.object({ kind: z.literal("span"), from: z.number(), to: z.number() }),
]);

const aiStepSchema = z.union([
  z.object({
    type: z.literal("trim"),
    mode: z.enum(["start", "end", "keep"]),
    seconds: z.number().default(0),
    from: z.number().default(0),
    to: z.number().default(0),
  }),
  z.object({ type: z.literal("cutRange"), from: z.number(), to: z.number() }),
  z.object({ type: z.literal("speed"), factor: z.number().positive(), range: rangeSchema }),
  z.object({
    type: z.literal("titleCard"),
    text: z.string().min(1),
    seconds: z.number().positive().default(2),
    position: z.enum(["start", "end"]).default("start"),
  }),
  z.object({
    type: z.literal("captions"),
    segments: z.array(z.object({ from: z.number(), to: z.number(), text: z.string() })),
  }),
  z.object({
    type: z.literal("textOverlay"),
    text: z.string().min(1),
    from: z.number().default(0),
    to: z.number().default(9999),
    corner: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("top-right"),
  }),
  z.object({
    type: z.literal("fade"),
    direction: z.enum(["in", "out"]),
    seconds: z.number().positive().default(1),
  }),
  z.object({ type: z.literal("mute") }),
  z.object({
    type: z.literal("filter"),
    filter: z.enum(["grayscale", "brightness", "contrast"]),
    amount: z.number().positive().default(1),
  }),
]);

const replySchema = z.object({ steps: z.array(aiStepSchema) });

const SYSTEM_PROMPT = `You convert one plain-English video editing instruction into JSON. Reply with only a JSON object: {"steps": [...]}. Each step is one of:
{"type":"trim","mode":"start|end|keep","seconds":n,"from":n,"to":n}
{"type":"cutRange","from":n,"to":n}
{"type":"speed","factor":n,"range":{"kind":"all"}|{"kind":"third","which":"first|middle|last"}|{"kind":"span","from":n,"to":n}}
{"type":"titleCard","text":"...","seconds":n,"position":"start|end"}
{"type":"captions","segments":[{"from":n,"to":n,"text":"..."}]}
{"type":"textOverlay","text":"...","from":n,"to":n,"corner":"top-left|top-right|bottom-left|bottom-right"}
{"type":"fade","direction":"in|out","seconds":n}
{"type":"mute"}
{"type":"filter","filter":"grayscale|brightness|contrast","amount":n}
Times are seconds. If the instruction cannot be expressed, reply {"steps":[]}.`;

async function callModel(settings: AiSettings, clause: string): Promise<string> {
  if (settings.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model || "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: clause }],
      }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: clause },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Send one unparsed clause to the configured model. Never called unless the
 * user saved an API key in Settings. The reply is validated with zod.
 */
export async function aiParseClause(settings: AiSettings, clause: string): Promise<Step[]> {
  const raw = await callModel(settings, clause);
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) return [];
  const parsed = replySchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) return [];
  return parsed.data.steps.map((s) => ({ ...s, id: stepId(), enabled: true }) as Step);
}
