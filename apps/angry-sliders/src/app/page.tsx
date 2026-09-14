"use client";

import { SlingshotSlider } from "@/components/slingshot-slider";

export default function Home() {
  return (
    <main className="flex flex-1 select-none items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <header className="mb-16 text-center">
          <h1 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Angry sliders
          </h1>
          <p className="mt-2 text-xs text-neutral-600">pull · aim · release</p>
        </header>

        <div className="space-y-14">
          <SlingshotSlider
            label="Exposure"
            min={-2}
            max={2}
            step={0.1}
            defaultValue={0.4}
            format={(v) => `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(1)} EV`}
          />
          <SlingshotSlider
            label="Bloom"
            min={0}
            max={100}
            step={1}
            defaultValue={35}
            format={(v) => `${Math.round(v)}%`}
          />
          <SlingshotSlider
            label="Field of view"
            min={20}
            max={120}
            step={1}
            defaultValue={72}
            format={(v) => `${Math.round(v)}°`}
          />
          <SlingshotSlider
            label="Samples"
            min={0}
            max={256}
            step={1}
            defaultValue={64}
            format={(v) => `${Math.round(v)}`}
          />
        </div>
      </div>
    </main>
  );
}
