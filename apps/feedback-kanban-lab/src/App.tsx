import { useEffect, useState } from "react";
import { BoardHeader } from "@/components/board-header";
import { KanbanBoard } from "@/components/kanban-board";
import { Toaster } from "@/components/toaster";
import { useBoardStore } from "@/store/board-store";

const FEED_MIN_MS = 8000;
const FEED_MAX_MS = 15000;

export default function App() {
  const liveFeed = useBoardStore((s) => s.liveFeed);
  const [now, setNow] = useState(() => Date.now());

  // Agents that were running before a reload pick up where they left off.
  useEffect(() => {
    useBoardStore.getState().resumeAgents();
  }, []);

  // Keep relative timestamps fresh.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Live feed: a new example comment every 8 to 15 seconds.
  useEffect(() => {
    if (!liveFeed) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const loop = () => {
      const delay = FEED_MIN_MS + Math.random() * (FEED_MAX_MS - FEED_MIN_MS);
      timer = setTimeout(() => {
        if (cancelled) return;
        useBoardStore.getState().pushFeedCard();
        setNow(Date.now());
        loop();
      }, delay);
    };
    loop();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [liveFeed]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <BoardHeader />
      <main className="min-h-0 flex-1">
        <KanbanBoard now={now} />
      </main>
      <Toaster />
    </div>
  );
}
