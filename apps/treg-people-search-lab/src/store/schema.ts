import { z } from "zod"
import { defaultPrices, type PriceRow } from "../features/cost/pricing"
import { defaultLabels, type Labels } from "../features/labels/labels"
import { capabilities, type PlannedCall } from "../features/run/runTypes"
import { DEFAULT_BASE_URL } from "../features/treg/liveClient"

export interface Settings {
  apiKey: string
  baseUrl: string
  live: boolean
}

export const defaultSettings: Settings = {
  apiKey: "",
  baseUrl: DEFAULT_BASE_URL,
  live: false,
}

const companySchema = z.object({
  name: z.string(),
  domain: z.string(),
  industry: z.string(),
  stage: z.string(),
  size: z.string(),
  hq: z.string(),
})

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  match: z.number(),
})

const callSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  capability: z.enum(capabilities),
  subject: z.string(),
  personId: z.string().optional(),
  listPrice: z.number(),
  billed: z.number(),
  outcome: z.enum(["hit", "miss", "unknown"]),
  estimated: z.boolean(),
  delayMs: z.number(),
  company: companySchema.optional(),
  people: z.array(personSchema).optional(),
  email: z.string().nullable().optional(),
  emailStatus: z.enum(["found", "verified", "unknown", "miss"]).optional(),
})

export const historyEntrySchema = z.object({
  id: z.string(),
  at: z.number(),
  company: z.string(),
  role: z.string(),
  limit: z.number().int().min(1).max(10),
  mode: z.enum(["example", "live"]),
  total: z.number(),
  calls: z.array(callSchema),
})

export type HistoryEntry = z.infer<typeof historyEntrySchema>

const priceSchema = z.object({
  providerId: z.string().min(1),
  capability: z.enum(capabilities),
  price: z.number().min(0),
  hitRate: z.number().min(0).max(1),
})

export const persistedSchema = z
  .object({
    version: z.literal(1),
    labels: z.object({
      title: z.string().min(1),
      companyColumn: z.string().min(1),
      peopleColumn: z.string().min(1),
      emailColumn: z.string().min(1),
      providers: z.record(z.string(), z.string()),
    }),
    settings: z.object({
      apiKey: z.string(),
      baseUrl: z.string().min(1),
      live: z.boolean(),
    }),
    prices: z.array(priceSchema).min(1),
    history: z.array(historyEntrySchema).max(20),
  })
  .transform((value) => ({
    ...value,
    settings: {
      ...value.settings,
      live: value.settings.apiKey.trim().length > 0 ? value.settings.live : false,
    },
  }))

export interface PersistedState {
  version: 1
  labels: Labels
  settings: Settings
  prices: PriceRow[]
  history: HistoryEntry[]
}

export function defaultPersisted(): PersistedState {
  return {
    version: 1,
    labels: structuredClone(defaultLabels),
    settings: { ...defaultSettings },
    prices: defaultPrices.map((row) => ({ ...row })),
    history: [],
  }
}

export function parsePersisted(input: unknown): PersistedState {
  const parsed = persistedSchema.parse(input)
  return {
    version: 1,
    labels: parsed.labels,
    settings: parsed.settings,
    prices: parsed.prices,
    history: parsed.history as HistoryEntry[],
  }
}

export function callsFromHistory(calls: HistoryEntry["calls"]): PlannedCall[] {
  return calls
}
