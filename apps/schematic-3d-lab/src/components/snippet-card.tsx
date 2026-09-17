"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
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
    <Card className="border-cyan-900/60 bg-slate-950/40">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle className="font-mono text-sm">
            {"<MorphControl />"} — copy-ready
          </CardTitle>
          <CardDescription>
            The scrubber driving the morph. Paste it next to any scene that
            takes a 0..1 value.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="max-h-72 overflow-auto rounded-lg border border-cyan-950 bg-[#0a1424] p-4 text-[11px] leading-relaxed text-cyan-100/90">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
