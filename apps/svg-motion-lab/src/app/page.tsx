"use client";

import { Badge } from "@/components/ui/badge";
import { DemoCard } from "@/components/lab/demo-card";
import { IntensityToggle } from "@/components/lab/intensity-toggle";
import { NightSky } from "@/components/lab/illustration";
import {
  BellIcon,
  CheckIcon,
  HeartIcon,
  MailIcon,
  StarIcon,
  SunIcon,
} from "@/components/lab/icons";
import { DotsLoader, OrbitSpinner, PulseLoader } from "@/components/lab/loaders";
import { IntensityProvider } from "@/lib/intensity";

const ICONS = [
  { id: "bell", title: "Bell", description: "Ringing swing from the mount point.", demo: <BellIcon /> },
  { id: "heart", title: "Heart", description: "A double heartbeat scale pulse.", demo: <HeartIcon /> },
  { id: "star", title: "Star", description: "A cheeky wobble with a tiny pop.", demo: <StarIcon /> },
  { id: "mail", title: "Mail", description: "Hop plus a pinging notification dot.", demo: <MailIcon /> },
  { id: "sun", title: "Sun", description: "Slowly rotating rays, breathing core.", demo: <SunIcon /> },
  { id: "check", title: "Check", description: "pathLength draw-in, then reset.", demo: <CheckIcon /> },
] as const;

const LOADERS = [
  { id: "orbit", title: "Orbit", description: "Rotating arc that stretches and shrinks.", demo: <OrbitSpinner /> },
  { id: "dots", title: "Dots", description: "Three dots on a staggered bounce.", demo: <DotsLoader /> },
  { id: "pulse", title: "Pulse", description: "An EKG trace drawn and released.", demo: <PulseLoader /> },
] as const;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <IntensityProvider>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">SVG Motion Lab</h1>
              <Badge variant="secondary">motion + svg</Badge>
            </div>
            <p className="max-w-lg text-sm text-muted-foreground">
              Tasteful, subtle SVG animation experiments. Tune the intensity, hit copy on any
              card, and paste a self-contained snippet into your own project. Inspired by{" "}
              <a
                className="underline underline-offset-4 hover:text-foreground"
                href="https://x.com/kitlangton/status/2096703869136867563"
                target="_blank"
                rel="noreferrer"
              >
                @kitlangton
              </a>
              .
            </p>
          </div>
          <IntensityToggle />
        </header>

        <Section title="Icons" hint="micro-animations for everyday UI icons">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ICONS.map(({ id, title, description, demo }) => (
              <DemoCard key={id} title={title} description={description} snippetId={id}>
                {demo}
              </DemoCard>
            ))}
          </div>
        </Section>

        <Section title="Loaders" hint="looping indicators built on pathLength">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LOADERS.map(({ id, title, description, demo }) => (
              <DemoCard key={id} title={title} description={description} snippetId={id}>
                {demo}
              </DemoCard>
            ))}
          </div>
        </Section>

        <Section title="Illustration" hint="layered motion in one little scene">
          <DemoCard
            title="Night sky"
            description="Twinkling stars, a bobbing moon, drifting clouds, and the occasional shooting star."
            snippetId="nightSky"
          >
            <NightSky />
          </DemoCard>
        </Section>

        <footer className="pb-4 text-center text-xs text-muted-foreground">
          Built with Bun, Next.js, shadcn/ui, and motion. No backend, just vibes.
        </footer>
      </main>
    </IntensityProvider>
  );
}
