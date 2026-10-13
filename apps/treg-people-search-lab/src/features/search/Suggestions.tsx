import { suggestions } from "../mock/dataset"

export function Suggestions({
  onPick,
}: {
  onPick: (company: string, role: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((item) => (
        <button
          key={`${item.company}-${item.role}`}
          type="button"
          className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-xs text-muted-foreground hover:border-amber-300/50 hover:text-foreground"
          onClick={() => onPick(item.company, item.role)}
        >
          {item.company}
          <span className="text-foreground"> · {item.role}</span>
        </button>
      ))}
    </div>
  )
}
