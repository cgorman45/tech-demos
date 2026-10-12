import { Button } from "@/components/ui/button";

export const SAMPLE_COMMANDS = [
  "cut the first 3 seconds",
  "add title card Q3 Pipeline",
  "speed up the middle",
  "add captions",
];

interface SuggestionsProps {
  items: string[];
  onPick: (text: string) => void;
}

export function Suggestions({ items, onPick }: SuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Button
          key={s}
          size="sm"
          variant="outline"
          className="h-7 rounded-full px-2.5 text-xs font-normal"
          onClick={() => onPick(s)}
        >
          {s}
        </Button>
      ))}
    </div>
  );
}
