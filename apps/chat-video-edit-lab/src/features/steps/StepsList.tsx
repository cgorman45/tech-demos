import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjectStore } from "@/store/useProjectStore";
import { StepCard } from "./StepCard";

export function StepsList() {
  const steps = useProjectStore((s) => s.steps);
  const reorderSteps = useProjectStore((s) => s.reorderSteps);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = steps.findIndex((s) => s.id === active.id);
    const to = steps.findIndex((s) => s.id === over.id);
    if (from >= 0 && to >= 0) reorderSteps(from, to);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={undo} disabled={!canUndo}>
          Undo
        </Button>
        <Button size="sm" variant="outline" onClick={redo} disabled={!canRedo}>
          Redo
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1 rounded-md border border-border bg-card/50">
        <div className="flex flex-col gap-1.5 p-2">
          {steps.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">
              No steps yet. Send an instruction in the chat and it will land here. Drag to
              reorder, switch a step off to compare, press Ctrl+Z to undo.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {steps.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}
