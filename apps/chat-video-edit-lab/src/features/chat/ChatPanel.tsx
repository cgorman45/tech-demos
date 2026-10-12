import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { EXAMPLE_CAPTIONS } from "@/features/media/exampleClip";
import { aiParseClause } from "@/features/parser/aiFallback";
import { parseMessage } from "@/features/parser/parse";
import type { Step } from "@/features/plan/steps";
import { summarizeStep } from "@/features/plan/steps";
import { chatId, useProjectStore } from "@/store/useProjectStore";
import { SAMPLE_COMMANDS, Suggestions } from "./Suggestions";

export function ChatPanel() {
  const chat = useProjectStore((s) => s.chat);
  const addChat = useProjectStore((s) => s.addChat);
  const addSteps = useProjectStore((s) => s.addSteps);
  const settings = useProjectStore((s) => s.settings);
  const sourceMeta = useProjectStore((s) => s.sourceMeta);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat.length]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    addChat({ id: chatId(), role: "user", text: message });

    const ctx = {
      exampleCaptions: sourceMeta?.kind === "example" ? EXAMPLE_CAPTIONS : null,
    };
    const { steps, unknown } = parseMessage(message, ctx);
    const collected: Step[] = [...steps];
    const stillUnknown: typeof unknown = [];

    if (unknown.length > 0 && settings.aiApiKey) {
      setBusy(true);
      for (const u of unknown) {
        try {
          const aiSteps = await aiParseClause(
            { provider: settings.aiProvider, apiKey: settings.aiApiKey, model: settings.aiModel },
            u.clause,
          );
          if (aiSteps.length > 0) collected.push(...aiSteps);
          else stillUnknown.push(u);
        } catch {
          stillUnknown.push(u);
        }
      }
      setBusy(false);
    } else {
      stillUnknown.push(...unknown);
    }

    if (collected.length > 0) {
      addSteps(collected);
      addChat({
        id: chatId(),
        role: "assistant",
        text: `Added: ${collected.map(summarizeStep).join(", ")}`,
      });
    }
    for (const u of stillUnknown) {
      addChat({
        id: chatId(),
        role: "assistant",
        text: `I didn't understand "${u.clause}". Try one of these:`,
        suggestions: u.suggestions,
      });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <ScrollArea className="min-h-0 flex-1 rounded-md border border-border bg-card/50">
        <div className="flex flex-col gap-2 p-2.5">
          {chat.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              Type an instruction like "cut the first 3 seconds" and press Enter. Each instruction
              becomes a step on the right.
            </p>
          )}
          {chat.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-6 rounded-lg bg-primary/15 px-2.5 py-1.5 text-sm"
                  : "mr-6 rounded-lg bg-muted px-2.5 py-1.5 text-sm"
              }
            >
              <p className="break-words">{m.text}</p>
              {m.suggestions && (
                <div className="mt-1.5">
                  <Suggestions items={m.suggestions} onPick={(s) => void send(s)} />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <Suggestions items={SAMPLE_COMMANDS} onPick={(s) => void send(s)} />
      <div className="flex items-end gap-1.5">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          placeholder='Try "trim last 2s and fade out"'
          className="max-h-24 min-h-9 flex-1 resize-none text-sm"
          rows={1}
        />
        <Button size="sm" onClick={() => void send(draft)} disabled={busy || !draft.trim()}>
          {busy ? "Parsing" : "Send"}
        </Button>
      </div>
    </div>
  );
}
