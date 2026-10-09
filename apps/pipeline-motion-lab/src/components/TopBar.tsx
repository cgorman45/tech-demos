import { useState } from "react";
import {
  Clapperboard,
  Download,
  Pencil,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/features/import/exportCsv";
import { ImportDialog } from "@/features/import/DropZone";
import { EditableLabel } from "@/features/labels/EditableLabel";
import { usePipelineStore } from "@/store/usePipelineStore";

export function TopBar() {
  const rows = usePipelineStore((state) => state.rows);
  const isExample = usePipelineStore((state) => state.isExample);
  const sourceName = usePipelineStore((state) => state.sourceName);
  const editMode = usePipelineStore((state) => state.editMode);
  const toggleEditMode = usePipelineStore((state) => state.toggleEditMode);
  const reset = usePipelineStore((state) => state.reset);
  const openExplainer = usePipelineStore((state) => state.openExplainer);

  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-card/60 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-lg font-semibold tracking-tight">
          <EditableLabel labelKey="app.title" />
        </h1>
        {isExample ? (
          <Badge variant="secondary" className="shrink-0">
            Example data
          </Badge>
        ) : (
          <Badge variant="outline" className="max-w-40 shrink-0 truncate">
            {sourceName}
          </Badge>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload />
          Import
        </Button>
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={toggleEditMode}
        >
          <Pencil />
          {editMode ? "Done editing" : "Edit"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(rows, "pipeline-export.csv")}
        >
          <Download />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
          <RotateCcw />
          Reset
        </Button>
        <Button size="sm" onClick={openExplainer}>
          <Clapperboard />
          Play explainer
        </Button>
      </div>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset everything?</DialogTitle>
            <DialogDescription>
              This restores the example data and default labels. Your edits
              will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                reset();
                setResetOpen(false);
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
