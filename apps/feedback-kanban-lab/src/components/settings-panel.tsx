import { useRef } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useBoardStore } from "@/store/board-store";

const SPEEDS = [0.5, 1, 2, 4];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const maxAgents = useBoardStore((s) => s.maxAgents);
  const speed = useBoardStore((s) => s.speed);
  const setMaxAgents = useBoardStore((s) => s.setMaxAgents);
  const setSpeed = useBoardStore((s) => s.setSpeed);
  const resetBoard = useBoardStore((s) => s.resetBoard);
  const exportBoard = useBoardStore((s) => s.exportBoard);
  const importBoard = useBoardStore((s) => s.importBoard);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([exportBoard()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedback-kanban-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importBoard(String(reader.result));
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-label="Board settings"
      className="absolute top-full right-0 z-40 mt-2 flex w-60 flex-col gap-3 rounded-xl border border-white/10 bg-popover p-3 shadow-xl"
    >
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-zinc-300">
          Max agents
        </span>
        <div className="flex gap-1" role="group" aria-label="Max agents">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={maxAgents === n}
              onClick={() => setMaxAgents(n)}
              className={cn(
                "h-7 flex-1 rounded-md border text-xs tabular-nums transition-colors",
                maxAgents === n
                  ? "border-ring/60 bg-primary text-primary-foreground"
                  : "border-input bg-input/30 text-zinc-300 hover:bg-input/50"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-[11px] font-medium text-zinc-300">
        Agent speed
        <Select
          aria-label="Agent speed"
          value={String(speed)}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </Select>
      </label>

      <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
        <Button size="xs" variant="outline" onClick={download}>
          Export board as JSON
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => fileRef.current?.click()}
        >
          Import board from JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Import board file"
          onChange={(e) => onImportFile(e.target.files?.[0])}
        />
        <Button
          size="xs"
          variant="destructive"
          onClick={() => {
            resetBoard();
            onClose();
          }}
        >
          Reset board
        </Button>
      </div>
    </div>
  );
}
