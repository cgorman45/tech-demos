"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SnippetCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card className="sheet-panel rounded-sm ring-0">
      <CardHeader>
        <div className="sheet-label">Snippet</div>
        <CardTitle className="font-mono text-sm">
          {"<MorphControl />"} — copy-ready
        </CardTitle>
        <CardDescription className="font-serif text-[13px]">
          The scrubber driving the morph. Paste it next to any scene that
          takes a 0..1 value.
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <pre className="max-h-72 overflow-auto rounded-sm border border-border bg-[#ebe6d7] p-4 text-[11px] leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
