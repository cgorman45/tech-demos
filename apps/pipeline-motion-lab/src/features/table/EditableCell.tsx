import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string;
  display?: string;
  align?: "left" | "right";
  placeholder?: string;
  onCommit: (next: string) => void;
}

/**
 * Click to edit, Enter saves, Esc cancels. The parent decides how to parse
 * the committed string.
 */
export function EditableCell({
  value,
  display,
  align = "left",
  placeholder,
  onCommit,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

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
          onCommit(draft);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onCommit(draft);
            setEditing(false);
          } else if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          "w-full min-w-16 rounded border border-ring/60 bg-background px-1.5 py-0.5 text-sm outline-none",
          align === "right" && "text-right",
        )}
      />
    );
  }

  const text = display ?? value;
  return (
    <button
      type="button"
      className={cn(
        "block w-full cursor-text rounded px-1.5 py-0.5 text-left text-sm hover:bg-accent/60",
        align === "right" && "text-right tabular-nums",
        text === "" && "text-muted-foreground",
      )}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {text === "" ? (placeholder ?? "...") : text}
    </button>
  );
}
