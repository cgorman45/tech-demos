import { useRef, useState } from "react";
import { FileSpreadsheet, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePipelineStore } from "@/store/usePipelineStore";
import { cn } from "@/lib/utils";
import { parseCsvFile } from "./parseCsv";
import { parseXlsxFile } from "./parseXlsx";
import type { NormalizeResult } from "./normalize";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const setRows = usePipelineStore((state) => state.setRows);
  const loadExample = usePipelineStore((state) => state.loadExample);
  const lastImport = usePipelineStore((state) => state.lastImport);

  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    let result: NormalizeResult;
    try {
      if (lower.endsWith(".csv")) {
        result = await parseCsvFile(file);
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        result = await parseXlsxFile(file);
      } else {
        setError("Use a .csv or .xlsx file.");
        return;
      }
    } catch {
      setError("Could not read that file.");
      return;
    }
    if (result.rows.length === 0) {
      setError("No usable rows found in that file.");
      return;
    }
    setRows(result.rows, {
      fileName: file.name,
      loaded: result.rows.length,
      skipped: result.skipped,
      warnings: result.warnings,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import pipeline data</DialogTitle>
          <DialogDescription>
            Drop a .csv or .xlsx file, or pick one. Expected columns:
            opportunity, agency, stage, value, probability, due_date, owner.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center transition-colors",
            dragging && "border-sky-400 bg-sky-400/10",
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
        >
          <FileUp className="size-8 text-muted-foreground" />
          <p className="text-sm">Drag a file here or click to browse</p>
          <p className="text-xs text-muted-foreground">.csv or .xlsx</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {lastImport && !error && (
          <div className="rounded-md border border-border bg-background/60 p-3 text-sm">
            <p>
              Loaded {lastImport.loaded} rows from {lastImport.fileName}.
              {lastImport.skipped.length > 0 &&
                ` Skipped ${lastImport.skipped.length}.`}
            </p>
            {lastImport.skipped.slice(0, 3).map((skip) => (
              <p
                key={skip.index}
                className="mt-1 text-xs text-muted-foreground"
              >
                Row {skip.index + 1} skipped: {skip.reason}
              </p>
            ))}
            {lastImport.warnings.slice(0, 3).map((warning) => (
              <p key={warning} className="mt-1 text-xs text-amber-400/90">
                {warning}
              </p>
            ))}
          </div>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            loadExample();
            setError(null);
          }}
        >
          <FileSpreadsheet />
          Load example data
        </Button>
      </DialogContent>
    </Dialog>
  );
}
