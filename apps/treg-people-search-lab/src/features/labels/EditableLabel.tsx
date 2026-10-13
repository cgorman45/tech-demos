import { useEffect, useState } from "react"
import { cn } from "cn"

export function EditableLabel({
  value,
  editing,
  onChange,
  className,
  label,
}: {
  value: string
  editing: boolean
  onChange: (value: string) => void
  className?: string
  label: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  if (!editing) return <span className={className}>{value}</span>

  return (
    <input
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onChange(draft.trim() || value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
      }}
      className={cn(
        "min-w-0 rounded-sm border border-dashed border-amber-300/80 bg-transparent px-1 outline-none",
        className,
      )}
    />
  )
}
