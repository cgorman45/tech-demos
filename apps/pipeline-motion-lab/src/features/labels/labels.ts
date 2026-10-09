export const DEFAULT_LABELS = {
  "app.title": "Pipeline Motion",
  "kpi.winRate": "Win rate",
  "kpi.openPipeline": "Total open pipeline",
  "kpi.weightedPipeline": "Weighted pipeline",
  "kpi.openCount": "Opportunities open",
  "chart.byStage": "Pipeline value by stage",
  "chart.weighted": "Weighted vs unweighted by stage",
  "upcoming.title": "Upcoming due dates",
  "owners.title": "By owner",
  "table.title": "Pipeline data",
  "scene.1": "Pipeline snapshot",
  "scene.2": "Total open pipeline",
  "scene.3": "Value by stage",
  "scene.4": "Weighted pipeline",
  "scene.5": "Win rate",
  "scene.6": "Next due dates",
} as const;

export type LabelKey = keyof typeof DEFAULT_LABELS;

export function labelText(
  overrides: Partial<Record<LabelKey, string>>,
  key: LabelKey,
): string {
  const override = overrides[key];
  return override !== undefined && override.trim() !== ""
    ? override
    : DEFAULT_LABELS[key];
}
