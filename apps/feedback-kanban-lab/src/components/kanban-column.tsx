import { useDroppable } from "@dnd-kit/core";
import { cn } from "cn";
import { AddFeedback } from "@/components/add-feedback";
import { FeedbackCard } from "@/components/feedback-card";
import type { Card, Status } from "@/lib/types";
import { useBoardStore } from "@/store/board-store";

const DOT_COLORS: Record<Status, string> = {
  new: "bg-sky-400",
  todo: "bg-amber-400",
  "in-progress": "bg-violet-400",
  review: "bg-pink-400",
  done: "bg-emerald-400",
  skipped: "bg-zinc-500",
  "not-implemented": "bg-rose-400",
};

export function KanbanColumn({
  status,
  cards,
  now,
}: {
  status: Status;
  cards: Card[];
  now: number;
}) {
  const name = useBoardStore((s) => s.columnNames[status]);
  const editMode = useBoardStore((s) => s.editMode);
  const setColumnName = useBoardStore((s) => s.setColumnName);
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${name} column, ${cards.length} cards`}
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col rounded-xl border border-white/5 bg-white/[0.035] transition-colors",
        isOver && "border-ring/50 bg-white/[0.06]"
      )}
    >
      <header className="flex shrink-0 items-center gap-2 px-3 py-2.5">
        <span className={cn("size-2 shrink-0 rounded-full", DOT_COLORS[status])} aria-hidden />
        {editMode ? (
          <input
            aria-label={`Rename column ${name}`}
            value={name}
            onChange={(e) => setColumnName(status, e.target.value)}
            className="h-6 w-full min-w-0 rounded-md border border-input bg-input/30 px-1.5 text-xs font-semibold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        ) : (
          <h2 className="truncate text-xs font-semibold text-zinc-200">{name}</h2>
        )}
        <span className="ml-auto shrink-0 rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums">
          {cards.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {status === "new" && <AddFeedback />}
        {cards.map((card) => (
          <FeedbackCard key={card.id} card={card} now={now} />
        ))}
        {cards.length === 0 && status !== "new" && (
          <p className="mt-1 rounded-lg border border-white/5 bg-black/15 py-5 text-center text-[11px] text-muted-foreground/70">
            Nothing here
          </p>
        )}
      </div>
    </section>
  );
}
