import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_TYPES } from "./loadVideo";

interface DropZoneProps {
  onFile: (file: File) => void;
  onExample: () => void;
  /** Shown when steps exist for a file that needs re-adding after reload. */
  pendingFileName?: string;
  pendingDuration?: number;
  error?: string | null;
}

export function DropZone({ onFile, onExample, pendingFileName, pendingDuration, error }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-border bg-card/40"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      {pendingFileName ? (
        <>
          <p className="text-sm font-medium">Re-add your clip to continue</p>
          <p className="text-xs text-muted-foreground">
            Your steps are saved for "{pendingFileName}"
            {pendingDuration ? ` (${pendingDuration.toFixed(1)}s)` : ""}. Video files are not
            stored, so drop the same file here to pick up where you left off.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Drop a video here</p>
          <p className="text-xs text-muted-foreground">
            mp4, webm, or mov, anything your browser can decode. The file stays on your machine.
          </p>
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
        <Button size="sm" variant="secondary" onClick={onExample}>
          Use example clip
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
