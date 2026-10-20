import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { setupSteps } from "./steps.ts"

export function SetupTab() {
  return (
    <ScrollArea className="h-full">
      <div data-testid="setup-tab" className="grid gap-3 p-3 md:grid-cols-2">
        {setupSteps.map((step) => (
          <Card key={step.title} size="sm">
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>{step.body}</p>
              {step.code ? (
                <pre className="overflow-x-auto rounded-lg bg-muted p-2 font-mono text-xs text-foreground">{step.code}</pre>
              ) : null}
            </CardContent>
          </Card>
        ))}
        <p className="text-xs text-muted-foreground md:col-span-2">
          Tested with reason-network 0.10.8. A newer major or minor version shows a warning in the dashboard.
        </p>
      </div>
    </ScrollArea>
  )
}
