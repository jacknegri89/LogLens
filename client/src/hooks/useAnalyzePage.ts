import { useState } from 'react';

import { useAnalysis } from './useAnalysis';
import { useAnonymize } from './useAnonymize';
import { useLogInput } from './useLogInput';
import { anonymizeLog } from '../lib/anonymize';
import type { CreateAnalysisInput } from '../lib/api';
import { findLineNumbers } from '../lib/format';
import type { AnalysisRecord } from '../lib/types';

/** What was really sent for the editor text `original`: the anonymized copy and its counts. */
interface AnonymizedSend {
  original: string;
  sent: string;
  replaced: Record<string, number>;
}

/** Line numbers of the failing lines, but only for the analysis of this exact text. */
function failingLinesFor(result: AnalysisRecord | null, text: string): Set<number> {
  if (!result || result.rawLog !== text) {
    return new Set();
  }
  return new Set(findLineNumbers(result.rawLog, result.report.keyLines).values());
}

function toAnalysisInput(
  rawLog: string,
  fileName: string | null,
  anonymized: boolean,
): CreateAnalysisInput {
  let source: 'upload' | 'paste' = 'paste';
  if (fileName) {
    source = 'upload';
  }
  let fileNameToSend: string | undefined;
  if (!anonymized) {
    fileNameToSend = fileName ?? undefined;
  }
  return {
    rawLog,
    source,
    fileName: fileNameToSend,
  };
}

/** Remembers the anonymized copy that was sent, for as long as the editor text is unchanged. */
function useAnonymizedSend(text: string, enabled: boolean) {
  const [send, setSend] = useState<AnonymizedSend | null>(null);
  // Anonymizing keeps every line, so the line numbers of the sent copy fit the editor text.
  let matching: AnonymizedSend | null = null;
  if (send?.original === text) {
    matching = send;
  }

  /** Returns the text to send: the anonymized copy when enabled, otherwise the text itself. */
  function prepare(): string {
    if (!enabled) {
      setSend(null);
      return text;
    }
    const anonymized = anonymizeLog(text);
    setSend({ original: text, sent: anonymized.text, replaced: anonymized.replaced });
    return anonymized.text;
  }

  return { matching, prepare };
}

/** Everything the Analyze page needs: the log in the editor, the request and the marks. */
export function useAnalyzePage() {
  const log = useLogInput();
  const analysis = useAnalysis();
  const anonymize = useAnonymize();
  const anonymizedSend = useAnonymizedSend(log.text, anonymize.enabled);
  const canSubmit = log.text.trim().length > 0 && analysis.status !== 'loading';

  function submit() {
    if (!canSubmit) {
      return;
    }
    analysis.run(toAnalysisInput(anonymizedSend.prepare(), log.fileName, anonymize.enabled));
  }

  function clear() {
    log.clear();
    analysis.reset();
  }

  return {
    log,
    analysis,
    anonymize,
    anonymizedCounts: anonymizedSend.matching?.replaced ?? null,
    canSubmit,
    submit,
    clear,
    failingLines: failingLinesFor(analysis.result, anonymizedSend.matching?.sent ?? log.text),
  };
}
