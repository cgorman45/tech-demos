"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { snippets } from "@/lib/snippets";

interface DemoCardProps {
  title: string;
  description: string;
  snippetId: keyof typeof snippets;
  children: ReactNode;
}

export function DemoCard({ title, description, snippetId, children }: DemoCardProps) {
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    await navigator.clipboard.writeText(snippets[snippetId]);
    setCopied(true);
    toast.success(`Copied ${title} snippet`, {
      description: "Self-contained JSX — just `bun add motion`.",
    });
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={copySnippet} aria-label={`Copy ${title} snippet`}>
            {copied ? <Check className="text-emerald-500" /> : <Copy />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed bg-muted/40 p-4 text-foreground/90">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
