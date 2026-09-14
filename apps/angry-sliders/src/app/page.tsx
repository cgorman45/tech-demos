"use client";

import * as React from "react";
import { AngrySlider } from "@/components/angry-slider";

const MOODS: Array<{ max: number; emoji: string; line: string }> = [
  { max: 0.15, emoji: "😌", line: "The sliders are at peace." },
  { max: 0.35, emoji: "🙂", line: "They tolerate you. For now." },
  { max: 0.55, emoji: "😐", line: "You're starting to test their patience." },
  { max: 0.75, emoji: "😒", line: "They've been talking about you." },
  { max: 0.92, emoji: "😠", line: "Genuinely upset. Hope you're happy." },
  { max: Infinity, emoji: "🤬", line: "You've made everyone furious." },
];

export default function Home() {
  const [classic, setClassic] = React.useState(18);
  const [volume, setVolume] = React.useState(40);
  const [rage, setRage] = React.useState(62);

  const avg = (classic + volume + rage) / 300;
  const mood = MOODS.find((m) => avg < m.max) ?? MOODS[MOODS.length - 1];

  return (
    <main className="flex flex-1 flex-col items-center bg-[radial-gradient(ellipse_at_top,#1e2439_0%,#0b0e1a_60%)] px-4 py-12 sm:py-16">
      <div className="w-full max-w-2xl space-y-6">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
            Angry Sliders
          </h1>
          <p className="mt-3 text-lg text-white/50">
            Drag them. They hate it.
          </p>
        </header>

        <AngrySlider
          label="Classic Range"
          caption="A perfectly normal slider. It just really hates being moved."
          flavor="classic"
          value={classic}
          onValueChange={setClassic}
        />
        <AngrySlider
          label="Volume"
          caption="It has very sensitive ears. Past 90 it can't even look at you."
          flavor="volume"
          value={volume}
          onValueChange={setVolume}
          unit="%"
        />
        <AngrySlider
          label="Intensity"
          caption="Runs hot. Do not max this one out. Seriously."
          flavor="rage"
          value={rage}
          onValueChange={setRage}
        />

        <footer className="pt-6 text-center">
          <div className="text-5xl">{mood.emoji}</div>
          <p className="mt-3 text-sm font-medium text-white/60">{mood.line}</p>
        </footer>
      </div>
    </main>
  );
}
