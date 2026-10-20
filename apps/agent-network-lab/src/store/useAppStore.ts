import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Backup, LogEntry } from "../features/edit/importExport.ts"
import type { Handoff } from "../features/handoffs/handoffs.ts"
import type { Directory } from "../features/network/types.ts"

type Persisted = {
  nicknames: Record<string, string>
  hidden: string[]
  pinned: string[]
  machineColors: Record<string, string>
  simTeam: Directory | null
  log: LogEntry[]
  handoffs: Handoff[]
  showOffline: boolean
}

type Store = Persisted & {
  setNickname: (key: string, value: string) => void
  toggleHidden: (address: string) => void
  togglePinned: (address: string) => void
  setMachineColor: (key: string, color: string) => void
  setSimTeam: (team: Directory | null) => void
  addLog: (entry: LogEntry) => void
  patchLog: (id: string, patch: Partial<LogEntry>) => void
  clearLog: () => void
  upsertHandoff: (handoff: Handoff) => void
  patchHandoff: (id: string, status: Handoff["status"]) => void
  setShowOffline: (value: boolean) => void
  replace: (backup: Backup) => void
  reset: () => void
}

const blank: Persisted = {
  nicknames: {},
  hidden: [],
  pinned: [],
  machineColors: {},
  simTeam: null,
  log: [],
  handoffs: [],
  showOffline: false,
}

export const useAppStore = create<Store>()(
  persist(
    (set) => ({
      ...blank,
      setNickname: (key, value) =>
        set((state) => {
          const nicknames = { ...state.nicknames }
          const trimmed = value.trim()
          if (trimmed) nicknames[key] = trimmed
          else delete nicknames[key]
          return { nicknames }
        }),
      toggleHidden: (address) =>
        set((state) => ({
          hidden: state.hidden.includes(address)
            ? state.hidden.filter((item) => item !== address)
            : [...state.hidden, address],
        })),
      togglePinned: (address) =>
        set((state) => ({
          pinned: state.pinned.includes(address)
            ? state.pinned.filter((item) => item !== address)
            : [...state.pinned, address],
        })),
      setMachineColor: (key, color) =>
        set((state) => ({ machineColors: { ...state.machineColors, [key]: color } })),
      setSimTeam: (team) => set({ simTeam: team }),
      addLog: (entry) => set((state) => ({ log: [...state.log, entry].slice(-500) })),
      patchLog: (id, patch) =>
        set((state) => ({
          log: state.log.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
        })),
      clearLog: () => set({ log: [] }),
      upsertHandoff: (handoff) =>
        set((state) => ({
          handoffs: [handoff, ...state.handoffs.filter((item) => item.id !== handoff.id)].slice(0, 100),
        })),
      patchHandoff: (id, status) =>
        set((state) => ({
          handoffs: state.handoffs.map((item) => (item.id === id ? { ...item, status } : item)),
        })),
      setShowOffline: (value) => set({ showOffline: value }),
      replace: (backup) =>
        set({
          nicknames: backup.nicknames,
          hidden: backup.hidden,
          pinned: backup.pinned,
          machineColors: backup.machineColors,
          simTeam: backup.simTeam,
          log: backup.log.slice(-500),
          handoffs: backup.handoffs,
          showOffline: backup.showOffline,
        }),
      reset: () => set(blank),
    }),
    {
      name: "agent-network-lab:v1",
      version: 1,
      partialize: (state) => ({
        nicknames: state.nicknames,
        hidden: state.hidden,
        pinned: state.pinned,
        machineColors: state.machineColors,
        simTeam: state.simTeam,
        log: state.log,
        handoffs: state.handoffs,
        showOffline: state.showOffline,
      }),
    },
  ),
)

export function backupFromStore(state: Persisted): Backup {
  return { version: 1, ...state }
}
