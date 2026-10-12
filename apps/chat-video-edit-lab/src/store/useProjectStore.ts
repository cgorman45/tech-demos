import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { Step } from "@/features/plan/steps";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
}

export interface SourceMeta {
  kind: "example" | "file";
  name: string;
  duration: number;
}

export interface Settings {
  aiProvider: "anthropic" | "openai";
  aiApiKey: string;
  aiModel: string;
}

export const DEFAULT_LABELS: Record<string, string> = {
  appTitle: "Chat Video Edit",
  chatPanel: "Chat",
  previewPanel: "Preview",
  stepsPanel: "Steps",
};

interface ProjectState {
  steps: Step[];
  past: Step[][];
  future: Step[][];
  chat: ChatMessage[];
  labels: Record<string, string>;
  settings: Settings;
  sourceMeta: SourceMeta | null;
  editMode: boolean;

  setSteps: (steps: Step[], record?: boolean) => void;
  addSteps: (steps: Step[]) => void;
  updateStep: (id: string, patch: Partial<Step>) => void;
  removeStep: (id: string) => void;
  toggleStep: (id: string) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;
  undo: () => void;
  redo: () => void;
  addChat: (msg: ChatMessage) => void;
  setLabel: (key: string, value: string) => void;
  setEditMode: (on: boolean) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setSourceMeta: (meta: SourceMeta | null) => void;
  reset: () => void;
  exportProject: () => string;
  importProject: (json: string) => boolean;
}

const MAX_HISTORY = 100;

let msgCounter = 0;
export function chatId(): string {
  msgCounter += 1;
  return `m${Date.now().toString(36)}${msgCounter.toString(36)}`;
}

const stepSchema = z
  .object({
    id: z.string(),
    enabled: z.boolean(),
    type: z.enum([
      "trim",
      "cutRange",
      "speed",
      "titleCard",
      "captions",
      "textOverlay",
      "fade",
      "mute",
      "filter",
    ]),
  })
  .loose();

const projectSchema = z.object({
  version: z.literal(1),
  steps: z.array(stepSchema),
  chat: z
    .array(z.object({ id: z.string(), role: z.enum(["user", "assistant"]), text: z.string() }).loose())
    .default([]),
  labels: z.record(z.string(), z.string()).default({}),
  sourceMeta: z
    .object({ kind: z.enum(["example", "file"]), name: z.string(), duration: z.number() })
    .nullable()
    .default(null),
});

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      steps: [],
      past: [],
      future: [],
      chat: [],
      labels: { ...DEFAULT_LABELS },
      settings: { aiProvider: "anthropic", aiApiKey: "", aiModel: "" },
      sourceMeta: null,
      editMode: false,

      setSteps: (steps, record = true) => {
        const { steps: prev, past } = get();
        set({
          steps,
          ...(record
            ? { past: [...past.slice(-MAX_HISTORY + 1), prev], future: [] }
            : {}),
        });
      },

      addSteps: (newSteps) => {
        if (newSteps.length === 0) return;
        get().setSteps([...get().steps, ...newSteps]);
      },

      updateStep: (id, patch) => {
        get().setSteps(
          get().steps.map((s) => (s.id === id ? ({ ...s, ...patch } as Step) : s)),
        );
      },

      removeStep: (id) => {
        get().setSteps(get().steps.filter((s) => s.id !== id));
      },

      toggleStep: (id) => {
        get().setSteps(
          get().steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
        );
      },

      reorderSteps: (fromIndex, toIndex) => {
        const steps = [...get().steps];
        const [moved] = steps.splice(fromIndex, 1);
        steps.splice(toIndex, 0, moved);
        get().setSteps(steps);
      },

      undo: () => {
        const { past, steps, future } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        set({ steps: prev, past: past.slice(0, -1), future: [steps, ...future] });
      },

      redo: () => {
        const { past, steps, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({ steps: next, past: [...past, steps], future: future.slice(1) });
      },

      addChat: (msg) => set({ chat: [...get().chat, msg] }),

      setLabel: (key, value) =>
        set({ labels: { ...get().labels, [key]: value || DEFAULT_LABELS[key] } }),

      setEditMode: (on) => set({ editMode: on }),

      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      setSourceMeta: (meta) => set({ sourceMeta: meta }),

      reset: () => set({ steps: [], past: [], future: [], chat: [] }),

      exportProject: () => {
        const { steps, chat, labels, sourceMeta } = get();
        return JSON.stringify({ version: 1, steps, chat, labels, sourceMeta }, null, 2);
      },

      importProject: (json) => {
        try {
          const parsed = projectSchema.safeParse(JSON.parse(json));
          if (!parsed.success) return false;
          const d = parsed.data;
          set({
            steps: d.steps as unknown as Step[],
            chat: d.chat as unknown as ChatMessage[],
            labels: { ...DEFAULT_LABELS, ...d.labels },
            sourceMeta: d.sourceMeta,
            past: [],
            future: [],
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "chat-video-edit-lab:v1",
      partialize: (s) => ({
        steps: s.steps,
        past: s.past,
        future: s.future,
        chat: s.chat,
        labels: s.labels,
        settings: s.settings,
        sourceMeta: s.sourceMeta,
      }),
    },
  ),
);
