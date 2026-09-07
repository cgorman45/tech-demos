"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Check, Copy, Download, FileText, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Meta = {
  url: string;
  title: string;
  stylesheetCount: number;
  cssBytes: number;
  colorCount: number;
  fontCount: number;
  tokenCount: number;
  componentCount: number;
  warnings: string[];
};

const EXAMPLES = ["stripe.com", "vercel.com", "tailwindcss.com", "linear.app"];

const COLOR_RE =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?|oklch|oklab)\([^)]*\))$/i;

function InlineCode({ children }: { children?: React.ReactNode }) {
  const text = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : "";
  const isColor = COLOR_RE.test(text.trim());
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em] break-all">
      {isColor && (
        <span
          className="mr-1.5 inline-block size-2.5 rounded-full align-middle ring-1 ring-foreground/20"
          style={{ backgroundColor: text.trim() }}
        />
      )}
      {children}
    </code>
  );
}

const markdownComponents = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="mt-2 mb-4 text-2xl font-semibold tracking-tight" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="mt-8 mb-3 border-b pb-2 text-lg font-semibold tracking-tight" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="mt-6 mb-2 text-base font-semibold" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="my-3 text-sm leading-relaxed text-muted-foreground" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a className="font-medium text-foreground underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote className="my-3 border-l-2 pl-3 text-sm text-muted-foreground italic" {...props} />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="my-4 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th className="border-b bg-muted/50 px-3 py-2 text-left font-medium" {...props} />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="border-b px-3 py-1.5 align-top last:border-b-0" {...props} />
  ),
  code: InlineCode,
};

export default function Home() {
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [markdown, setMarkdown] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function generate(target: string) {
    const value = target.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setMarkdown(null);
    setMeta(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setMarkdown(data.markdown);
      setMeta(data.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function copyMarkdown() {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadMarkdown() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "DESIGN.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <div className="flex flex-col items-center text-center">
        <Badge variant="secondary" className="mb-4 gap-1.5">
          <Sparkles className="size-3" />
          Static CSS analysis — no headless browser
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          DESIGN<span className="text-muted-foreground">.md</span> Lab
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground text-pretty">
          Paste any website URL and get an agent-ready <span className="font-medium text-foreground">DESIGN.md</span>{" "}
          — color tokens, typography, spacing, and component styles extracted from its CSS.
        </p>
      </div>

      <form
        className="mx-auto mt-8 flex w-full max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          generate(url);
        }}
      >
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="stripe.com or https://example.com"
          aria-label="Website URL"
          autoFocus
          className="h-10"
        />
        <Button type="submit" disabled={loading || !url.trim()} className="h-10">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          Generate
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={loading}
            onClick={() => {
              setUrl(ex);
              generate(ex);
            }}
            className="rounded-full border px-3 py-0.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      {loading && (
        <Card className="mt-8">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Fetching page, downloading stylesheets, and parsing CSS…
            </div>
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertTitle>Could not generate DESIGN.md</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {markdown && meta && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <FileText className="size-3" />
              {meta.title}
            </Badge>
            <Badge variant="secondary">{meta.colorCount} colors</Badge>
            <Badge variant="secondary">{meta.fontCount} font families</Badge>
            {meta.tokenCount > 0 && <Badge variant="secondary">{meta.tokenCount} CSS tokens</Badge>}
            {meta.componentCount > 0 && <Badge variant="secondary">{meta.componentCount} components</Badge>}
            <Badge variant="secondary">{(meta.cssBytes / 1024).toFixed(0)} KB CSS</Badge>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={copyMarkdown}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" onClick={downloadMarkdown}>
                <Download className="size-3.5" />
                Download .md
              </Button>
            </div>
          </div>

          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="raw">Raw markdown</TabsTrigger>
            </TabsList>
            <TabsContent value="preview">
              <Card>
                <CardContent>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {markdown}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="raw">
              <Card>
                <CardContent>
                  <pre className="max-h-[70vh] overflow-auto font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {markdown}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-muted-foreground">
        Drop the generated DESIGN.md into your repo so coding agents can match the source site&apos;s look and feel.
      </footer>
    </main>
  );
}
