import { readFileSync } from "node:fs";
import path from "node:path";
import { Suspense } from "react";
import { Lab } from "@/components/lab";
import { SnippetCard } from "@/components/snippet-card";
import site from "@/data/civic-center.json";

const TITLE_BLOCK: [string, string][] = [
  ["Address", site.address],
  ["Drawing", "Conceptual massing sheet / 01"],
  ["Units", "Site metres · north up"],
  ["Source", "OpenStreetMap · ODbL 1.0"],
];

export default function Home() {
  const snippet = readFileSync(
    path.join(process.cwd(), "src/components/morph-control.tsx"),
    "utf8",
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8">
      <header className="sheet-panel grid gap-6 p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="sheet-label">Santa Ana · Civic Center · schematic-3d-lab</div>
          <h1 className="font-serif text-3xl uppercase leading-none tracking-[0.06em] text-foreground sm:text-4xl">
            {site.site}
          </h1>
          <p className="sheet-label text-foreground/80">
            Civic campus massing study / Conceptual massing sheet / 01
          </p>
          <p className="max-w-xl pt-1 font-serif text-[15px] leading-relaxed text-muted-foreground">
            Drag the scrubber to morph the 2D site schematic into an extruded 3D
            massing view. Once fully extruded, drag the canvas to orbit the
            Civic Center campus.
          </p>
        </div>
        <dl className="grid h-fit grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-t border-border pt-4 md:min-w-72 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          {TITLE_BLOCK.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="sheet-label pt-px">{k}</dt>
              <dd className="font-mono text-[11px] leading-snug text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <Suspense fallback={<div className="h-[600px] rounded-sm border border-border" />}>
        <Lab />
      </Suspense>

      <SnippetCard code={snippet} />

      <footer className="grid gap-4 md:grid-cols-2">
        <section className="sheet-panel space-y-2 px-5 py-4">
          <h2 className="sheet-label">Data source</h2>
          <p className="font-serif text-[13px] leading-relaxed text-muted-foreground">
            Building footprints © OpenStreetMap contributors (ODbL 1.0), via
            api.openstreetmap.org: way 205740155 (Santa Ana Police Department,
            amenity=police), way 205740158 (Santa Ana City Jail), nearby parking
            structures and context buildings within ~150 m of the police
            headquarters.
          </p>
        </section>
        <section className="sheet-panel space-y-2 px-5 py-4">
          <h2 className="sheet-label">Notes</h2>
          <p className="font-serif text-[13px] leading-relaxed text-muted-foreground">
            Exterior footprints and public campus massing only — no interior
            floor plans or secure-area layouts are depicted. Heights of the named
            civic buildings are estimates from public imagery (no OSM height
            tag); context building heights come from OSM height tags where
            mapped. Materials, trees and plaza paving are illustrative.
          </p>
        </section>
      </footer>
    </main>
  );
}
