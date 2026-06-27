/** How serious the detected problem is. */
export type Severity = 'low' | 'medium' | 'high';

/**
 * The structured part of an analysis that we store as JSON (the `report`
 * column). The `title`, `severity` and `category` live in their own columns
 * so we can list and filter by them; everything else lives here.
 *
 * This shape matches the JSON we ask the AI to return — see docs/prompts.md.
 */
export interface AnalysisReport {
  /** The most important raw log lines. */
  keyLines: string[];
  /** Probable root causes. */
  causes: string[];
  /** Concrete steps to investigate or fix the issue. */
  debugSteps: string[];
  /** A ready-to-paste GitHub Issue, in Markdown. */
  bugReportMarkdown: string;
}
