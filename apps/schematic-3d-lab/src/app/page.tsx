import { readFileSync } from "node:fs";
import path from "node:path";
import { Badge } from "@/components/ui/badge";
import { Lab } from "@/components/lab";
import { SnippetCard } from "@/components/snippet-card";
import site from "@/data/civic-center.json";

export default function Home() {
  const snippet = readFileSync(
    path.join(process.cwd(), "src/components/morph-control.tsx"),
    "utf8",
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-cyan-700 font-mono text-cyan-300">
            schematic-3d-lab
          </Badge>
          <Badge variant="secondary" className="font-mono">
            {site.address}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {site.site}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Drag the scrubber to morph the 2D site schematic into an extruded 3D
          massing view. Once fully extruded, drag the canvas to orbit the
          Civic Center campus.
        </p>
      </header>

      <Lab />

      <SnippetCard code={snippet} />

      <footer className="space-y-1 rounded-xl border border-cyan-900/40 bg-slate-950/30 px-5 py-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <p>
          DATA SOURCE — Building footprints © OpenStreetMap contributors
          (ODbL 1.0), via api.openstreetmap.org: way 205740155 (Santa Ana
          Police Department, amenity=police), way 205740158 (Santa Ana City
          Jail), nearby parking structures and context buildings within
          ~150 m of the police headquarters.
        </p>
        <p>
          Exterior footprints and public campus massing only — no interior
          floor plans or secure-area layouts are depicted. Heights of the
          named civic buildings are estimates from public imagery (no OSM
          height tag); context building heights come from OSM height tags
          where mapped.
        </p>
      </footer>
    </main>
  );
}
