import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { useBoardStore } from "@/store/board-store";

/** Composer at the top of the New column. */
export function AddFeedback() {
  const addCard = useBoardStore((s) => s.addCard);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("General");

  const submit = () => {
    if (!body.trim()) return;
    addCard(body, category);
    setBody("");
  };

  return (
    <form
      className="flex flex-col gap-1.5 rounded-xl border border-dashed border-white/10 bg-black/20 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label="Add feedback"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Add feedback..."
        rows={2}
        className="w-full resize-none rounded-md border border-input bg-input/30 px-2 py-1 text-xs leading-5 outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="flex items-center gap-1.5">
        <Select
          aria-label="Feedback category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="min-w-0 flex-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Button type="submit" size="xs" disabled={!body.trim()}>
          <Plus className="size-3" aria-hidden />
          Add
        </Button>
      </div>
    </form>
  );
}
