import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Plan } from "@/features/plan/buildPlan";
import type { FrameSource } from "@/features/media/frameSource";
import { exportMp4 } from "./exportMp4";
import { exportWebm } from "./exportWebm";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: FrameSource | null;
  plan: Plan;
}

type Phase = "idle" | "running" | "done" | "error";

export function ExportDialog({ open, onOpenChange, source, plan }: ExportDialogProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    if (!source || plan.duration <= 0) return;
    setPhase("running");
    setProgress(0);
    setNote(null);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const opts = {
      source,
      plan,
      onProgress: (f: number) => setProgress(Math.round(f * 100)),
      signal: controller.signal,
    };
    try {
      let result;
      try {
        result = await exportMp4(opts);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") throw e;
        result = await exportWebm(opts);
      }
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setNote(result.note ?? null);
      setResultName(result.filename);
      setPhase("done");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPhase("idle");
      } else {
        setError("Export failed. This browser may not support WebCodecs or MediaRecorder.");
        setPhase("error");
      }
    } finally {
      abortRef.current = null;
    }
  }

  function close(next: boolean) {
    if (!next && phase === "running") abortRef.current?.abort();
    if (!next) setPhase("idle");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export MP4</DialogTitle>
          <DialogDescription>
            Renders every frame of the edited timeline at 30 fps (up to 1280x720) and encodes it
            in your browser. Nothing leaves your machine.
          </DialogDescription>
        </DialogHeader>

        {phase === "running" && (
          <div className="flex flex-col gap-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">Rendering frames: {progress}%</p>
          </div>
        )}
        {phase === "done" && (
          <p className="text-sm">
            Done. {resultName} is downloading.
            {note ? ` ${note}` : ""}
          </p>
        )}
        {phase === "error" && <p className="text-sm text-destructive">{error}</p>}
        {phase === "idle" && source && (
          <p className="text-sm text-muted-foreground">
            Output length: {plan.duration.toFixed(1)}s. The download is named chat-video-edit.mp4.
          </p>
        )}
        {!source && <p className="text-sm text-muted-foreground">Load a clip first.</p>}

        <DialogFooter>
          {phase === "running" ? (
            <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Close
              </Button>
              <Button onClick={() => void run()} disabled={!source || plan.duration <= 0}>
                {phase === "done" ? "Export again" : "Start export"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
