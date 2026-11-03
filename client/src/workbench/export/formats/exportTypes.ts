import { EXPORT_TEXT } from '../../../content/workbenchExport';
import type { TextOf } from '../../../i18n/defineText';
import type { Language } from '../../../i18n/languages';
import type { AnalysisRecord } from '../../../lib/types';
import type { ParsedLine } from '../../types';

/** The wording of the documents, already chosen for the page language. */
export type ExportTexts = TextOf<typeof EXPORT_TEXT>;

export const EXPORT_FORMAT_IDS = ['github', 'alert', 'postmortem', 'json'] as const;
export type ExportFormatId = (typeof EXPORT_FORMAT_IDS)[number];

export type ExportDocumentId = keyof ExportTexts['documents'];

/** What a builder needs to know about the Workbench. */
export interface ExportInput {
  language: Language;
  fileName: string | null;
  lines: readonly ParsedLine[];
  record: AnalysisRecord | null;
}

export interface ExportDocument {
  id: ExportDocumentId;
  filename: string;
  mimeType: string;
  content: string;
}

export function countFaultLines(lines: readonly ParsedLine[]): number {
  return lines.filter((line) => line.isFault).length;
}
