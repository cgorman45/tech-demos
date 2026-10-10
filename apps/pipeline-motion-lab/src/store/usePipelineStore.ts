import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loadExampleRows } from "@/data/example-data";
import type { LabelKey } from "@/features/labels/labels";
import {
  clampTime,
  sceneStart,
  type Speed,
} from "@/features/explainer/timeline";
import { newRowId, type PipelineRow } from "@/lib/types";

export interface ImportSummary {
  fileName: string;
  loaded: number;
  skipped: { index: number; reason: string }[];
  warnings: string[];
}

interface PipelineState {
  rows: PipelineRow[];
  /** True while the shipped example data (possibly edited) is loaded. */
  isExample: boolean;
  sourceName: string;
  labels: Partial<Record<LabelKey, string>>;
  editMode: boolean;
  lastImport: ImportSummary | null;

  // Explainer timeline (not persisted).
  explainerOpen: boolean;
  clock: number;
  playing: boolean;
  speed: Speed;

  loadExample: () => void;
  setRows: (rows: PipelineRow[], summary: ImportSummary) => void;
  updateRow: (id: string, patch: Partial<PipelineRow>) => void;
  addRow: () => void;
  deleteRow: (id: string) => void;
  reset: () => void;
  setLabel: (key: LabelKey, text: string) => void;
  toggleEditMode: () => void;

  openExplainer: () => void;
  closeExplainer: () => void;
  setClock: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: Speed) => void;
  seekScene: (index: number) => void;
  restart: () => void;
}

export const STORAGE_KEY = "pipeline-motion-lab:v1";

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set) => ({
      rows: loadExampleRows(),
      isExample: true,
      sourceName: "Example data",
      labels: {},
      editMode: false,
      lastImport: null,

      explainerOpen: false,
      clock: 0,
      playing: false,
      speed: 1,

      loadExample: () =>
        set({
          rows: loadExampleRows(),
          isExample: true,
          sourceName: "Example data",
          lastImport: null,
        }),

      setRows: (rows, summary) =>
        set({
          rows,
          isExample: false,
          sourceName: summary.fileName,
          lastImport: summary,
        }),

      updateRow: (id, patch) =>
        set((state) => ({
          rows: state.rows.map((row) =>
            row.id === id ? { ...row, ...patch } : row,
          ),
        })),

      addRow: () =>
        set((state) => ({
          rows: [
            ...state.rows,
            {
              id: newRowId(),
              opportunity: "New opportunity",
              agency: "",
              stage: "Lead",
              value: 0,
              probability: 0.25,
              dueDate: null,
              owner: "",
            },
          ],
        })),

      deleteRow: (id) =>
        set((state) => ({
          rows: state.rows.filter((row) => row.id !== id),
        })),

      reset: () =>
        set({
          rows: loadExampleRows(),
          isExample: true,
          sourceName: "Example data",
          labels: {},
          editMode: false,
          lastImport: null,
          clock: 0,
          playing: false,
          speed: 1,
        }),

      setLabel: (key, text) =>
        set((state) => ({ labels: { ...state.labels, [key]: text } })),

      toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),

      openExplainer: () =>
        set({ explainerOpen: true, clock: 0, playing: true }),
      closeExplainer: () => set({ explainerOpen: false, playing: false }),
      setClock: (time) => set({ clock: clampTime(time) }),
      setPlaying: (playing) => set({ playing }),
      setSpeed: (speed) => set({ speed }),
      // Jumping to a scene also resumes playback, so a seek never strands
      // the presenter on a blank scene start.
      seekScene: (index) => set({ clock: sceneStart(index), playing: true }),
      restart: () => set({ clock: 0, playing: true }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        rows: state.rows,
        isExample: state.isExample,
        sourceName: state.sourceName,
        labels: state.labels,
      }),
    },
  ),
);
