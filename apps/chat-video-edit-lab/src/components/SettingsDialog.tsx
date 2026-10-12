import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/store/useProjectStore";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useProjectStore((s) => s.settings);
  const setSettings = useProjectStore((s) => s.setSettings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Optional AI fallback for instructions the local parser cannot read. Leave the key
            empty and the app stays fully offline: nothing calls the network without a key.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Provider
            <select
              value={settings.aiProvider}
              onChange={(e) =>
                setSettings({ aiProvider: e.target.value as "anthropic" | "openai" })
              }
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="anthropic" className="bg-background">
                Anthropic
              </option>
              <option value="openai" className="bg-background">
                OpenAI compatible
              </option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            API key
            <Input
              type="password"
              value={settings.aiApiKey}
              onChange={(e) => setSettings({ aiApiKey: e.target.value })}
              placeholder="Stored only in this browser's localStorage"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Model (optional)
            <Input
              value={settings.aiModel}
              onChange={(e) => setSettings({ aiModel: e.target.value })}
              placeholder={settings.aiProvider === "anthropic" ? "claude-haiku-4-5" : "gpt-4o-mini"}
            />
          </label>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSettings({ aiApiKey: "", aiModel: "" })}
            disabled={!settings.aiApiKey && !settings.aiModel}
          >
            Clear key
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
