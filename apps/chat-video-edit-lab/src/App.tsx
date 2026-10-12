import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { ExportDialog } from "@/features/export/ExportDialog";
import { EditableLabel } from "@/features/labels/EditableLabel";
import { DropZone } from "@/features/media/DropZone";
import { createExampleSource, EXAMPLE_NAME } from "@/features/media/exampleClip";
import type { FrameSource } from "@/features/media/frameSource";
import { ACCEPTED_TYPES, loadVideoFile } from "@/features/media/loadVideo";
import { buildPlan } from "@/features/plan/buildPlan";
import { BeforeAfter } from "@/features/render/BeforeAfter";
import { StepsList } from "@/features/steps/StepsList";
import { useProjectStore } from "@/store/useProjectStore";

export default function App() {
  const steps = useProjectStore((s) => s.steps);
  const sourceMeta = useProjectStore((s) => s.sourceMeta);
  const setSourceMeta = useProjectStore((s) => s.setSourceMeta);
  const editMode = useProjectStore((s) => s.editMode);
  const setEditMode = useProjectStore((s) => s.setEditMode);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const reset = useProjectStore((s) => s.reset);
  const exportProject = useProjectStore((s) => s.exportProject);
  const importProject = useProjectStore((s) => s.importProject);

  const [source, setSource] = useState<FrameSource | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Restore the example clip after a reload; user files must be re-added.
  useEffect(() => {
    if (!source && useProjectStore.getState().sourceMeta?.kind === "example") {
      setSource(createExampleSource());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTyping(e)) return;
      if (e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const plan = useMemo(
    () => buildPlan(source?.duration ?? sourceMeta?.duration ?? 0, steps),
    [source, sourceMeta, steps],
  );

  async function onFile(file: File) {
    setMediaError(null);
    try {
      const next = await loadVideoFile(file);
      setSource(next);
      setSourceMeta({ kind: "file", name: next.name, duration: next.duration });
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "Could not load this file.");
    }
  }

  function onExample() {
    const next = createExampleSource();
    setSource(next);
    setSourceMeta({ kind: "example", name: EXAMPLE_NAME, duration: next.duration });
    setMediaError(null);
  }

  function onReset() {
    if (window.confirm("Clear all steps and the chat history? Labels and settings stay.")) {
      reset();
    }
  }

  function onExportProject() {
    const blob = new Blob([exportProject()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-video-edit-project.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function onImportProject(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importProject(String(reader.result));
      if (!ok) window.alert("That file is not a valid project export.");
      else if (useProjectStore.getState().sourceMeta?.kind === "example") {
        setSource(createExampleSource());
      } else {
        setSource(null);
      }
    };
    reader.readAsText(file);
  }

  const pendingFile = !source && sourceMeta?.kind === "file" ? sourceMeta : null;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <EditableLabel labelKey="appTitle" className="text-sm font-semibold" />
        {source?.kind === "example" && <Badge variant="secondary">Example clip</Badge>}
        {source?.kind === "file" && (
          <Badge variant="outline" className="max-w-40 truncate" title={source.name}>
            {source.name}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <label className="mr-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            Edit
            <Switch checked={editMode} onCheckedChange={setEditMode} aria-label="Edit labels" />
          </label>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Load video
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button size="sm" variant="outline" onClick={onExportProject}>
            Export project
          </Button>
          <Button size="sm" variant="outline" onClick={() => importInputRef.current?.click()}>
            Import project
          </Button>
          <Button size="sm" variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            Export MP4
          </Button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 gap-3 p-3">
        <section className="flex w-[300px] min-w-[260px] shrink-0 flex-col gap-2 xl:w-[360px]">
          <EditableLabel labelKey="chatPanel" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
          <ChatPanel />
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-2">
          <EditableLabel labelKey="previewPanel" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
          {source ? (
            <BeforeAfter source={source} plan={plan} />
          ) : (
            <DropZone
              onFile={(f) => void onFile(f)}
              onExample={onExample}
              pendingFileName={pendingFile?.name}
              pendingDuration={pendingFile?.duration}
              error={mediaError}
            />
          )}
        </section>

        <section className="flex w-[300px] min-w-[260px] shrink-0 flex-col gap-2 xl:w-[340px]">
          <EditableLabel labelKey="stepsPanel" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
          <StepsList />
        </section>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportProject(file);
          e.target.value = "";
        }}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} source={source} plan={plan} />
    </div>
  );
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}
