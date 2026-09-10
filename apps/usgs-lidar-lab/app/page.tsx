"use client";

import dynamic from "next/dynamic";

const ElevationLab = dynamic(
  () => import("@/components/elevation-lab").then((m) => m.ElevationLab),
  {
    ssr: false,
    loading: () => (
      <main className="flex h-dvh w-full items-center justify-center bg-[#05080c]">
        <p className="font-mono text-sm text-white/50">loading terrain…</p>
      </main>
    ),
  }
);

export default function Home() {
  return <ElevationLab />;
}
