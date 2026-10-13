import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { PriceRow } from "../features/cost/pricing"
import type { Labels } from "../features/labels/labels"
import {
  defaultPersisted,
  parsePersisted,
  type HistoryEntry,
  type PersistedState,
  type Settings,
} from "./schema"

const STORAGE_KEY = "treg-people-search-lab:v1"

interface AppState extends PersistedState {
  editing: boolean
  setEditing: (editing: boolean) => void
  setLabel: (key: "title" | "companyColumn" | "peopleColumn" | "emailColumn", value: string) => void
  setProviderLabel: (providerId: string, value: string) => void
  setPrice: (providerId: string, capability: PriceRow["capability"], price: number) => void
  setHitRate: (providerId: string, capability: PriceRow["capability"], hitRate: number) => void
  setSettings: (patch: Partial<Settings>) => void
  pushHistory: (entry: HistoryEntry) => void
  reset: () => void
  replacePersisted: (next: PersistedState) => void
}

function persistedSlice(state: AppState): PersistedState {
  return {
    version: 1,
    labels: state.labels,
    settings: state.settings,
    prices: state.prices,
    history: state.history,
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaultPersisted(),
      editing: false,
      setEditing: (editing) => set({ editing }),
      setLabel: (key, value) =>
        set((state) => ({
          labels: { ...state.labels, [key]: value.trim() || state.labels[key] },
        })),
      setProviderLabel: (providerId, value) =>
        set((state) => ({
          labels: {
            ...state.labels,
            providers: {
              ...state.labels.providers,
              [providerId]: value.trim() || state.labels.providers[providerId] || providerId,
            },
          },
        })),
      setPrice: (providerId, capability, price) =>
        set((state) => ({
          prices: state.prices.map((row) =>
            row.providerId === providerId && row.capability === capability
              ? { ...row, price: Number.isFinite(price) && price >= 0 ? price : row.price }
              : row,
          ),
        })),
      setHitRate: (providerId, capability, hitRate) =>
        set((state) => ({
          prices: state.prices.map((row) =>
            row.providerId === providerId && row.capability === capability
              ? { ...row, hitRate: Math.max(0, Math.min(1, hitRate)) }
              : row,
          ),
        })),
      setSettings: (patch) =>
        set((state) => {
          const settings = { ...state.settings, ...patch }
          if (!settings.apiKey.trim()) settings.live = false
          return { settings }
        }),
      pushHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 20),
        })),
      reset: () => set({ ...defaultPersisted(), editing: false }),
      replacePersisted: (next) => set({ ...next, editing: false }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => persistedSlice(state),
      merge: (persisted, current) => {
        const parsed = parsePersistedSafe(persisted)
        if (!parsed) return current
        return { ...current, ...parsed }
      },
    },
  ),
)

function parsePersistedSafe(input: unknown): PersistedState | null {
  try {
    return parsePersisted(input)
  } catch {
    return null
  }
}

export function exportState(state: Pick<AppState, "labels" | "settings" | "prices" | "history">): string {
  const payload: PersistedState = {
    version: 1,
    labels: state.labels,
    settings: state.settings,
    prices: state.prices,
    history: state.history,
  }
  return JSON.stringify(payload, null, 2)
}

export function importState(raw: string): PersistedState {
  return parsePersisted(JSON.parse(raw))
}

export type { Labels }
