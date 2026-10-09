import { useEffect, useRef, useState } from "react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { labelText, type LabelKey } from "./labels";
import { cn } from "@/lib/utils";

interface EditableLabelProps {
  labelKey: LabelKey;
  className?: string;
}

/**
 * Shows a label. When the top bar Edit toggle is on, clicking the label turns
 * it into an input: Enter saves, Esc cancels.
 */
export function EditableLabel({ labelKey, className }: EditableLabelProps) {
  const editMode = usePipelineStore((state) => state.editMode);
  const labels = usePipelineStore((state) => state.labels);
  const setLabel = usePipelineStore((state) => state.setLabel);
  const text = labelText(labels, labelKey);

  const [editingRequested, setEditingRequested] = useState(false);
  const [draft, setDraft] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Leaving edit mode ends any in-progress rename.
  const editing = editingRequested && editMode;
  const setEditing = setEditingRequested;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setLabel(labelKey, draft);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            setLabel(labelKey, draft);
            setEditing(false);
          } else if (event.key === "Escape") {
            setDraft(text);
            setEditing(false);
          }
        }}
        className={cn(
          "min-w-0 rounded border border-ring/60 bg-background/80 px-1 py-0 outline-none",
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        className,
        editMode &&
          "cursor-pointer rounded px-1 -mx-1 outline-dashed outline-1 outline-sky-400/50 hover:bg-sky-400/10",
      )}
      title={editMode ? "Click to rename" : undefined}
      onClick={
        editMode
          ? () => {
              setDraft(text);
              setEditing(true);
            }
          : undefined
      }
    >
      {text}
    </span>
  );
}
