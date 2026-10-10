import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { Pencil, Radio, Settings2 } from "lucide-react";
import { SettingsPanel } from "@/components/settings-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/store/board-store";

export function BoardHeader() {
  const title = useBoardStore((s) => s.title);
  const setTitle = useBoardStore((s) => s.setTitle);
  const editMode = useBoardStore((s) => s.editMode);
  const setEditMode = useBoardStore((s) => s.setEditMode);
  const liveFeed = useBoardStore((s) => s.liveFeed);
  const setLiveFeed = useBoardStore((s) => s.setLiveFeed);
  const runningCount = useBoardStore((s) => s.running.length);
  const maxAgents = useBoardStore((s) => s.maxAgents);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [settingsOpen]);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-white/5 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {editMode ? (
          <input
            aria-label="Rename board"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-7 w-52 rounded-md border border-input bg-input/30 px-2 text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        ) : (
          <h1 className="truncate text-sm font-semibold text-zinc-100">
            {title}
          </h1>
        )}
        <Badge variant="outline" className="shrink-0 text-muted-foreground">
          Example data
        </Badge>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-medium tabular-nums",
            runningCount > 0 ? "text-emerald-300" : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              runningCount > 0 ? "animate-pulse bg-emerald-400" : "bg-zinc-600"
            )}
            aria-hidden
          />
          Agents {runningCount}/{maxAgents} running
        </span>

        <Button
          size="xs"
          variant={liveFeed ? "secondary" : "ghost"}
          aria-pressed={liveFeed}
          onClick={() => setLiveFeed(!liveFeed)}
        >
          <Radio
            className={cn("size-3", liveFeed && "text-emerald-400")}
            aria-hidden
          />
          Live feed {liveFeed ? "on" : "off"}
        </Button>

        <Button
          size="xs"
          variant={editMode ? "secondary" : "ghost"}
          aria-pressed={editMode}
          onClick={() => setEditMode(!editMode)}
        >
          <Pencil className="size-3" aria-hidden />
          {editMode ? "Done editing" : "Edit"}
        </Button>

        <div className="relative" ref={settingsRef}>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <Settings2 className="size-3.5" aria-hidden />
          </Button>
          {settingsOpen && (
            <SettingsPanel onClose={() => setSettingsOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
}
