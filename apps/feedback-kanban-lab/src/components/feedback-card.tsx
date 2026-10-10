import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "cn";
import { ChevronRight, GitPullRequest, Play, Square } from "lucide-react";
import { AgentLog } from "@/components/agent-log";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { avatarColor, initialsFor, relativeTime } from "@/lib/time";
import type { Card, Category, Status } from "@/lib/types";
import { CATEGORIES, STATUSES } from "@/lib/types";
import { useBoardStore } from "@/store/board-store";

/** Blocks pointer and key events from reaching the drag listeners. */
function NoDnd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function FeedbackCard({ card, now }: { card: Card; now: number }) {
  const editMode = useBoardStore((s) => s.editMode);
  const maxAgents = useBoardStore((s) => s.maxAgents);
  const columnNames = useBoardStore((s) => s.columnNames);
  const moveCard = useBoardStore((s) => s.moveCard);
  const launchAgent = useBoardStore((s) => s.launchAgent);
  const stopAgent = useBoardStore((s) => s.stopAgent);
  const approve = useBoardStore((s) => s.approve);
  const requestChanges = useBoardStore((s) => s.requestChanges);
  const updateCard = useBoardStore((s) => s.updateCard);
  const [notesOpen, setNotesOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });

  const running = card.agent.state === "running";
  const queued = card.agent.state === "queued";
  const reviewReady = card.agent.state === "done" && card.agent.pr !== null;

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-label={`Feedback from ${card.handle}`}
      className={cn(
        "card-enter flex flex-col gap-2 rounded-xl border border-white/5 bg-card p-2.5 text-card-foreground shadow-sm transition-shadow",
        "cursor-grab touch-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
        isDragging && "relative z-40 cursor-grabbing shadow-xl ring-2 ring-ring/40"
      )}
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
            avatarColor(card.handle)
          )}
        >
          {initialsFor(card.handle)}
        </span>
        <span className="truncate text-[10px] text-muted-foreground">
          {card.handle} · {relativeTime(card.createdAt, now)} · {card.source}
          {card.sourceMeta ? ` ${card.sourceMeta}` : ""} ·{" "}
          <span className="font-mono">{card.ref}</span>
        </span>
        <span className="ml-auto shrink-0">
          {running && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              running
            </span>
          )}
          {queued && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              queued
            </span>
          )}
        </span>
      </header>

      {editMode ? (
        <NoDnd>
          <textarea
            aria-label="Edit feedback text"
            value={card.body}
            onChange={(e) => updateCard(card.id, { body: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-input/30 px-2 py-1 text-xs leading-5 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </NoDnd>
      ) : (
        <p className="text-xs leading-5 text-zinc-200">{card.body}</p>
      )}

      {editMode ? (
        <NoDnd>
          <input
            aria-label="Edit tags, comma separated"
            value={card.tags.join(", ")}
            onChange={(e) =>
              updateCard(card.id, {
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="h-6 w-full rounded-md border border-input bg-input/30 px-2 text-[10px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </NoDnd>
      ) : (
        card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-zinc-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {card.tags.join(" · ")}
            </span>
          </div>
        )
      )}

      {queued && (
        <p className="rounded-md bg-amber-950/60 px-2 py-1 text-[10px] text-amber-300">
          waiting for a free slot ({maxAgents} agents at most)
        </p>
      )}

      {(running || (reviewReady && card.agent.log.length > 0)) && (
        <AgentLog card={card} />
      )}

      {reviewReady && card.status === "review" && (
        <NoDnd className="flex flex-col gap-1.5 rounded-md border border-white/5 bg-black/25 p-2">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-violet-950 px-2 py-0.5 text-[10px] font-medium text-violet-300">
            <GitPullRequest className="size-3" aria-hidden />
            PR #{card.agent.pr?.number} · example
          </span>
          <p className="text-[11px] leading-4 text-zinc-400">
            {card.agent.pr?.summary}
          </p>
          <div className="flex gap-1.5">
            <Button size="xs" onClick={() => approve(card.id)}>
              Approve
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => requestChanges(card.id)}
            >
              Request changes
            </Button>
          </div>
        </NoDnd>
      )}

      <NoDnd className="flex flex-col gap-1">
        <label className="text-[10px] text-muted-foreground">
          Category
          <Select
            aria-label="Category"
            value={card.category}
            onChange={(e) =>
              updateCard(card.id, { category: e.target.value as Category })
            }
            className="mt-0.5 w-full"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
      </NoDnd>

      <NoDnd className="flex items-center gap-1.5">
        <Select
          aria-label="Status"
          value={card.status}
          onChange={(e) => moveCard(card.id, e.target.value as Status)}
          className="min-w-0 flex-1"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {columnNames[s]}
            </option>
          ))}
        </Select>
        {running && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => stopAgent(card.id)}
            aria-label="Stop agent"
          >
            <Square className="size-3" aria-hidden />
            Stop
          </Button>
        )}
        {card.status === "todo" && card.agent.state === "none" && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => launchAgent(card.id)}
            aria-label="Run agent"
          >
            <Play className="size-3" aria-hidden />
            Run
          </Button>
        )}
      </NoDnd>

      <NoDnd>
        <button
          type="button"
          onClick={() => setNotesOpen((o) => !o)}
          aria-expanded={notesOpen}
          className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight
            className={cn("size-3 transition-transform", notesOpen && "rotate-90")}
            aria-hidden
          />
          Notes
        </button>
        {notesOpen && (
          <textarea
            aria-label="Notes"
            value={card.notes}
            onChange={(e) => updateCard(card.id, { notes: e.target.value })}
            placeholder="Add a note for the team"
            rows={2}
            className="mt-1 w-full resize-none rounded-md border border-input bg-input/30 px-2 py-1 text-[11px] leading-4 outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        )}
      </NoDnd>
    </article>
  );
}
