import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/store/useProjectStore";
import type { LabelKey } from "./labels";

interface EditableLabelProps {
  labelKey: LabelKey;
  className?: string;
}

/**
 * Shows the stored label text. When the top bar Edit toggle is on, clicking
 * the label swaps in an input; the new name is saved to localStorage through
 * the store.
 */
export function EditableLabel({ labelKey, className }: EditableLabelProps) {
  const value = useProjectStore((s) => s.labels[labelKey] ?? "");
  const editMode = useProjectStore((s) => s.editMode);
  const setLabel = useProjectStore((s) => s.setLabel);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    const commit = () => {
      setLabel(labelKey, draft.trim());
      setEditing(false);
    };
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-44 px-1.5 text-sm"
      />
    );
  }

  return (
    <span
      className={`${className ?? ""} ${editMode ? "cursor-pointer rounded px-1 outline-1 outline-dashed outline-primary/60 hover:bg-primary/10" : ""}`}
      title={editMode ? "Click to rename" : undefined}
      onClick={() => {
        if (editMode) {
          setDraft(value);
          setEditing(true);
        }
      }}
    >
      {value}
    </span>
  );
}
