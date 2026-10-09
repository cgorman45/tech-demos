import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/kanban-column";
import type { Status } from "@/lib/types";
import { BOARD_COLUMNS, EXTRA_COLUMNS, STATUSES } from "@/lib/types";
import { useBoardStore } from "@/store/board-store";

export function KanbanBoard({ now }: { now: number }) {
  const cards = useBoardStore((s) => s.cards);
  const moveCard = useBoardStore((s) => s.moveCard);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const onDragEnd = (event: DragEndEvent) => {
    const target = event.over?.id;
    if (typeof target === "string" && STATUSES.includes(target as Status)) {
      moveCard(String(event.active.id), target as Status);
    }
  };

  // Skipped and Not implemented only earn a column once something lands there.
  const visible: Status[] = [
    ...BOARD_COLUMNS,
    ...EXTRA_COLUMNS.filter((s) => cards.some((c) => c.status === s)),
  ];

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex h-full min-h-0 gap-3 p-3">
        {visible.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={cards.filter((c) => c.status === status)}
            now={now}
          />
        ))}
      </div>
    </DndContext>
  );
}
