"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface SearchResult {
  displayName: string;
  lat: number;
  lon: number;
}

interface SearchBoxProps {
  onSelect: (result: SearchResult) => void;
}

/** Address / place search backed by OSM Nominatim, biased to the US (3DEP coverage). */
export function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 3) {
        setResults([]);
        setOpen(false);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const url =
          "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=us&q=" +
          encodeURIComponent(query.trim());
        const res = await fetch(url, { signal: controller.signal });
        const data: { display_name: string; lat: string; lon: string }[] = await res.json();
        setResults(
          data.map((d) => ({
            displayName: d.display_name,
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
          }))
        );
        setOpen(true);
      } catch {
        // aborted or network error — keep previous results
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const select = (r: SearchResult) => {
    setOpen(false);
    setQuery(r.displayName.split(",").slice(0, 2).join(","));
    onSelect(r);
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) select(results[0]);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search a US place or address…"
        className="bg-black/40"
      />
      {loading && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          …
        </span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-xl">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lon},${i}`}>
              <button
                type="button"
                className="w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => select(r)}
                title={r.displayName}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
