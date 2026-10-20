import { Input } from "@/components/ui/input"

export function EditableLabel({
  value,
  placeholder,
  testId,
  onChange,
}: {
  value: string
  placeholder: string
  testId?: string
  onChange: (value: string) => void
}) {
  return (
    <Input
      data-testid={testId}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-7 text-xs"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
