import type { Card } from "@/lib/types";
import { AGENT_STEPS } from "@/store/agents";

/** Live step log for a running agent, or the finished log on a Review card. */
export function AgentLog({ card }: { card: Card }) {
  const running = card.agent.state === "running";
  if (card.agent.log.length === 0) return null;

  return (
    <div className="rounded-md border border-white/5 bg-black/25 px-2 py-1.5">
      <div className="mb-1 flex items-center gap-1.5">
        {running ? (
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
        ) : (
          <span className="size-1.5 rounded-full bg-zinc-500" />
        )}
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Agent log {running ? `· step ${card.agent.step + 1}/${AGENT_STEPS.length}` : "· finished"}
        </span>
      </div>
      <ol className="space-y-0.5">
        {card.agent.log.map((entry, i) => (
          <li
            key={`${entry.at}-${i}`}
            className="flex items-baseline gap-1.5 font-mono text-[10px] leading-4 text-zinc-400"
          >
            <span className="text-zinc-600">{i + 1}.</span>
            <span className={running && i === card.agent.log.length - 1 ? "text-zinc-200" : undefined}>
              {entry.text}
              {running && i === card.agent.log.length - 1 && (
                <span className="ml-1 inline-block animate-pulse text-emerald-400">...</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
