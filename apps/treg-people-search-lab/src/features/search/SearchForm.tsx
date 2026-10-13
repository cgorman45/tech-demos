import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Suggestions } from "./Suggestions"

export function SearchForm({
  company,
  role,
  limit,
  running,
  onCompany,
  onRole,
  onLimit,
  onRun,
  onPick,
}: {
  company: string
  role: string
  limit: number
  running: boolean
  onCompany: (value: string) => void
  onRole: (value: string) => void
  onLimit: (value: number) => void
  onRun: () => void
  onPick: (company: string, role: string) => void
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onRun()
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-[12rem] flex-1 gap-1 text-xs text-muted-foreground">
          Company
          <Input
            data-testid="company-input"
            value={company}
            placeholder="Northwind Robotics"
            onChange={(event) => onCompany(event.target.value)}
          />
        </label>
        <label className="grid min-w-[12rem] flex-1 gap-1 text-xs text-muted-foreground">
          Role
          <Input
            data-testid="role-input"
            value={role}
            placeholder="Head of Marketing"
            onChange={(event) => onRole(event.target.value)}
          />
        </label>
        <label className="grid w-[11.5rem] gap-1 text-xs text-muted-foreground">
          <span className="flex justify-between">
            How many people
            <span className="font-mono text-foreground">{limit}</span>
          </span>
          <Slider
            data-testid="people-slider"
            min={1}
            max={10}
            step={1}
            value={[limit]}
            onValueChange={(value) => onLimit(value[0] ?? 1)}
            aria-label="How many people"
          />
        </label>
        <Button data-testid="run-button" type="submit" disabled={running || !company.trim() || !role.trim()}>
          {running ? "Running" : "Run"}
        </Button>
      </div>
      <Suggestions onPick={onPick} />
    </form>
  )
}
