import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { FEED_POOL, seedCards } from "@/data/seed";
import type {
  Card,
  Category,
  Source,
  Status,
  Toast,
} from "@/lib/types";
import {
  DEFAULT_COLUMN_NAMES,
  IDLE_AGENT,
  STATUSES,
} from "@/lib/types";
import {
  AGENT_STEPS,
  prSummary,
  promoteQueued,
  releaseAgent,
  requestAgent,
  stepLogLine,
} from "@/store/agents";

export const STORAGE_KEY = "feedback-kanban-lab/v1";
const BASE_STEP_MS = 2400;

export interface BoardState {
  title: string;
  columnNames: Record<Status, string>;
  cards: Card[];
  running: string[];
  queue: string[];
  maxAgents: number;
  speed: number;
  liveFeed: boolean;
  editMode: boolean;
  feedIndex: number;
  prCounter: number;
  toasts: Toast[];

  setTitle: (title: string) => void;
  setColumnName: (status: Status, name: string) => void;
  addCard: (body: string, category: Category) => void;
  pushFeedCard: () => void;
  updateCard: (id: string, patch: Partial<Pick<Card, "body" | "tags" | "notes" | "category">>) => void;
  moveCard: (id: string, target: Status) => void;
  launchAgent: (id: string) => void;
  advanceAgent: (id: string) => void;
  stopAgent: (id: string) => void;
  approve: (id: string) => void;
  requestChanges: (id: string) => void;
  setMaxAgents: (n: number) => void;
  setSpeed: (speed: number) => void;
  setLiveFeed: (on: boolean) => void;
  setEditMode: (on: boolean) => void;
  resetBoard: () => void;
  exportBoard: () => string;
  importBoard: (json: string) => boolean;
  resumeAgents: () => void;
  pushToast: (message: string, variant?: Toast["variant"]) => void;
  dismissToast: (id: number) => void;
}

/** Step timers live outside the store so persistence never sees them. */
const stepTimers = new Map<string, ReturnType<typeof setTimeout>>();
const hasDom = typeof document !== "undefined";
let toastId = 0;

function clearStepTimer(id: string) {
  const timer = stepTimers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    stepTimers.delete(id);
  }
}

function clearAllStepTimers() {
  for (const timer of stepTimers.values()) clearTimeout(timer);
  stepTimers.clear();
}

function randomRef(): string {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
}

function seedState(now: number = Date.now()) {
  return {
    title: "Demo Feedback",
    columnNames: { ...DEFAULT_COLUMN_NAMES },
    cards: seedCards(now),
    running: [] as string[],
    queue: [] as string[],
    maxAgents: 3,
    speed: 1,
    liveFeed: true,
    feedIndex: 0,
    prCounter: 123,
  };
}

/** Storage wrapper that resolves localStorage per call, so tests can install a shim. */
const storage = createJSONStorage<Partial<BoardState>>(() => ({
  getItem: (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: (key) => globalThis.localStorage?.removeItem(key),
}));

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => {
      const scheduleStep = (id: string) => {
        if (!hasDom) return;
        clearStepTimer(id);
        const delay = BASE_STEP_MS / Math.max(0.25, get().speed);
        stepTimers.set(
          id,
          setTimeout(() => {
            stepTimers.delete(id);
            get().advanceAgent(id);
          }, delay)
        );
      };

      const startCard = (cards: Card[], id: string): Card[] =>
        cards.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "in-progress" as Status,
                agent: {
                  state: "running" as const,
                  step: 0,
                  log: [{ text: stepLogLine(0, c.category), at: Date.now() }],
                  pr: null,
                },
              }
            : c
        );

      const startPromoted = (promoted: string[]) => {
        if (promoted.length === 0) return;
        set((s) => {
          let cards = s.cards;
          for (const id of promoted) cards = startCard(cards, id);
          return { cards };
        });
        for (const id of promoted) {
          scheduleStep(id);
          get().pushToast("Agent launched from the queue", "success");
        }
      };

      return {
        ...seedState(),
        editMode: false,
        toasts: [],

        setTitle: (title) => set({ title }),

        setColumnName: (status, name) =>
          set((s) => ({ columnNames: { ...s.columnNames, [status]: name } })),

        addCard: (body, category) => {
          const trimmed = body.trim();
          if (!trimmed) return;
          const card: Card = {
            id: `user-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            ref: randomRef(),
            handle: "you",
            source: "text",
            sourceMeta: null,
            createdAt: Date.now(),
            body: trimmed,
            tags: ["screened"],
            category,
            status: "new",
            notes: "",
            agent: { ...IDLE_AGENT },
          };
          set((s) => ({ cards: [card, ...s.cards] }));
        },

        pushFeedCard: () => {
          const s = get();
          const item = FEED_POOL[s.feedIndex % FEED_POOL.length];
          const card: Card = {
            id: `feed-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            ref: randomRef(),
            handle: item.handle,
            source: item.source as Source,
            sourceMeta: item.sourceMeta ?? null,
            createdAt: Date.now(),
            body: item.body,
            tags: item.tags,
            category: item.category,
            status: "new",
            notes: "",
            agent: { ...IDLE_AGENT },
          };
          set({ cards: [card, ...s.cards], feedIndex: s.feedIndex + 1 });
        },

        updateCard: (id, patch) =>
          set((s) => ({
            cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          })),

        moveCard: (id, target) => {
          const s = get();
          const card = s.cards.find((c) => c.id === id);
          if (!card) return;

          // Entering Todo by hand means "run an agent on this".
          if (target === "todo") {
            get().launchAgent(id);
            return;
          }
          if (card.status === target) return;

          // Leaving Todo or In progress cancels any queued or running agent.
          let running = s.running;
          let queue = s.queue;
          let promoted: string[] = [];
          if (card.agent.state === "running") {
            clearStepTimer(id);
            const released = releaseAgent({ running, queue }, id, s.maxAgents);
            running = released.slots.running;
            queue = released.slots.queue;
            promoted = released.promoted;
          } else if (card.agent.state === "queued") {
            queue = queue.filter((q) => q !== id);
          }

          set((state) => ({
            running,
            queue,
            cards: state.cards.map((c) =>
              c.id === id
                ? {
                    ...c,
                    status: target,
                    agent:
                      c.agent.state === "running" || c.agent.state === "queued"
                        ? { ...IDLE_AGENT }
                        : c.agent,
                  }
                : c
            ),
          }));
          startPromoted(promoted);
        },

        launchAgent: (id) => {
          const s = get();
          const card = s.cards.find((c) => c.id === id);
          if (!card) return;
          const result = requestAgent(
            { running: s.running, queue: s.queue },
            id,
            s.maxAgents
          );
          switch (result.kind) {
            case "already-running":
              get().pushToast(
                "An agent is already running for this item.",
                "destructive"
              );
              return;
            case "already-queued":
              get().pushToast("This item is already queued.");
              return;
            case "started":
              set((state) => ({
                running: result.slots.running,
                queue: result.slots.queue,
                cards: startCard(state.cards, id),
              }));
              scheduleStep(id);
              get().pushToast("Agent launched", "success");
              return;
            case "queued":
              set((state) => ({
                running: result.slots.running,
                queue: result.slots.queue,
                cards: state.cards.map((c) =>
                  c.id === id
                    ? {
                        ...c,
                        status: "todo" as Status,
                        agent: { state: "queued", step: -1, log: [], pr: null },
                      }
                    : c
                ),
              }));
              get().pushToast(
                `Agent queued, waiting for a free slot (${s.maxAgents} agents at most)`
              );
              return;
          }
        },

        advanceAgent: (id) => {
          const s = get();
          const card = s.cards.find((c) => c.id === id);
          if (!card || card.agent.state !== "running") return;

          const nextStep = card.agent.step + 1;
          if (nextStep < AGENT_STEPS.length) {
            set((state) => ({
              cards: state.cards.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      agent: {
                        ...c.agent,
                        step: nextStep,
                        log: [
                          ...c.agent.log,
                          { text: stepLogLine(nextStep, c.category), at: Date.now() },
                        ],
                      },
                    }
                  : c
              ),
            }));
            scheduleStep(id);
            return;
          }

          // Finished: free the slot, move to Review with an example PR chip.
          clearStepTimer(id);
          const prNumber = s.prCounter;
          const released = releaseAgent(
            { running: s.running, queue: s.queue },
            id,
            s.maxAgents
          );
          set((state) => ({
            running: released.slots.running,
            queue: released.slots.queue,
            prCounter: state.prCounter + 1,
            cards: state.cards.map((c) =>
              c.id === id
                ? {
                    ...c,
                    status: "review" as Status,
                    agent: {
                      state: "done",
                      step: -1,
                      log: c.agent.log,
                      pr: { number: prNumber, summary: prSummary(c) },
                    },
                  }
                : c
            ),
          }));
          get().pushToast(`Agent finished: PR #${prNumber} is ready for review`, "success");
          startPromoted(released.promoted);
        },

        stopAgent: (id) => {
          const s = get();
          const card = s.cards.find((c) => c.id === id);
          if (!card || card.agent.state !== "running") return;
          clearStepTimer(id);
          const released = releaseAgent(
            { running: s.running, queue: s.queue },
            id,
            s.maxAgents
          );
          set((state) => ({
            running: released.slots.running,
            queue: released.slots.queue,
            cards: state.cards.map((c) =>
              c.id === id
                ? { ...c, status: "todo" as Status, agent: { ...IDLE_AGENT } }
                : c
            ),
          }));
          get().pushToast("Agent stopped, card returned to Todo");
          startPromoted(released.promoted);
        },

        approve: (id) => {
          set((state) => ({
            cards: state.cards.map((c) =>
              c.id === id && c.status === "review"
                ? { ...c, status: "done" as Status }
                : c
            ),
          }));
          get().pushToast("Approved and moved to Done", "success");
        },

        requestChanges: (id) => {
          const card = get().cards.find((c) => c.id === id);
          if (!card || card.status !== "review") return;
          set((state) => ({
            cards: state.cards.map((c) =>
              c.id === id ? { ...c, agent: { ...IDLE_AGENT } } : c
            ),
          }));
          get().launchAgent(id);
        },

        setMaxAgents: (n) => {
          const maxAgents = Math.min(5, Math.max(1, Math.round(n)));
          const s = get();
          const { slots, promoted } = promoteQueued(
            { running: s.running, queue: s.queue },
            maxAgents
          );
          set({ maxAgents, running: slots.running, queue: slots.queue });
          startPromoted(promoted);
        },

        setSpeed: (speed) => set({ speed: Math.min(4, Math.max(0.5, speed)) }),
        setLiveFeed: (on) => set({ liveFeed: on }),
        setEditMode: (on) => set({ editMode: on }),

        resetBoard: () => {
          clearAllStepTimers();
          set({ ...seedState(), editMode: false });
          get().pushToast("Board reset to the example data");
        },

        exportBoard: () => {
          const s = get();
          return JSON.stringify(
            {
              app: "feedback-kanban-lab",
              version: 1,
              exportedAt: new Date().toISOString(),
              board: {
                title: s.title,
                columnNames: s.columnNames,
                cards: s.cards,
                running: s.running,
                queue: s.queue,
                maxAgents: s.maxAgents,
                speed: s.speed,
                liveFeed: s.liveFeed,
                feedIndex: s.feedIndex,
                prCounter: s.prCounter,
              },
            },
            null,
            2
          );
        },

        importBoard: (json) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(json);
          } catch {
            get().pushToast("Import failed: not valid JSON", "destructive");
            return false;
          }
          const data = parsed as {
            app?: string;
            version?: number;
            board?: Record<string, unknown>;
          };
          const board = data?.board;
          const cards = board?.cards;
          const validCards =
            Array.isArray(cards) &&
            cards.every(
              (c) =>
                c &&
                typeof c.id === "string" &&
                typeof c.body === "string" &&
                STATUSES.includes(c.status)
            );
          if (data?.app !== "feedback-kanban-lab" || !board || !validCards) {
            get().pushToast(
              "Import failed: not a feedback-kanban-lab export",
              "destructive"
            );
            return false;
          }
          clearAllStepTimers();
          const base = seedState();
          set({
            title: typeof board.title === "string" ? board.title : base.title,
            columnNames: {
              ...base.columnNames,
              ...(board.columnNames as Record<Status, string> | undefined),
            },
            cards: cards as Card[],
            running: Array.isArray(board.running) ? (board.running as string[]) : [],
            queue: Array.isArray(board.queue) ? (board.queue as string[]) : [],
            maxAgents:
              typeof board.maxAgents === "number"
                ? Math.min(5, Math.max(1, board.maxAgents))
                : base.maxAgents,
            speed: typeof board.speed === "number" ? board.speed : base.speed,
            liveFeed:
              typeof board.liveFeed === "boolean" ? board.liveFeed : base.liveFeed,
            feedIndex:
              typeof board.feedIndex === "number" ? board.feedIndex : base.feedIndex,
            prCounter:
              typeof board.prCounter === "number" ? board.prCounter : base.prCounter,
          });
          get().resumeAgents();
          get().pushToast("Board imported", "success");
          return true;
        },

        resumeAgents: () => {
          const s = get();
          for (const id of s.running) {
            const card = s.cards.find((c) => c.id === id);
            if (card?.agent.state === "running") scheduleStep(id);
          }
        },

        pushToast: (message, variant = "default") => {
          toastId += 1;
          const toast: Toast = { id: toastId, message, variant };
          set((s) => ({ toasts: [...s.toasts.slice(-3), toast] }));
        },

        dismissToast: (id) =>
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      };
    },
    {
      name: STORAGE_KEY,
      storage,
      partialize: (s) => ({
        title: s.title,
        columnNames: s.columnNames,
        cards: s.cards,
        running: s.running,
        queue: s.queue,
        maxAgents: s.maxAgents,
        speed: s.speed,
        liveFeed: s.liveFeed,
        feedIndex: s.feedIndex,
        prCounter: s.prCounter,
      }),
    }
  )
);
