import type { ExportInput } from './exportTypes';
import { computeLineStatistics } from './lineStatistics';

/** The analysis (without the raw log) and the statistics of the lines, as JSON. */
export function buildStructuredJson(input: ExportInput): string {
  const { record } = input;
  const document = {
    generator: 'LogLens Workbench',
    version: 1,
    language: input.language,
    file: input.fileName,
    statistics: computeLineStatistics(input.lines),
    analysis: record && {
      id: record.id,
      createdAt: record.createdAt,
      title: record.title,
      severity: record.severity,
      category: record.category,
      report: record.report,
    },
  };
  return JSON.stringify(document, null, 2);
}
