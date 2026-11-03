import { useMemo, useState } from 'react';

import { useWorkbench } from '../../core/useWorkbench';
import { findExtractor, type Extractor, type ExtractorId } from './extractors';
import { buildRegex, DEFAULT_FLAGS, type RegexFlagState } from './regexBuild';
import { useRegexScan } from './useRegexScan';

/** The state of the regex lab: what was typed, which quick extract is on, and the live result. */
export function useRegexLab() {
  const { lines } = useWorkbench();
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState<RegexFlagState>(DEFAULT_FLAGS);
  const [extractorId, setExtractorId] = useState<ExtractorId | null>(null);
  const build = useMemo(() => buildRegex(pattern, flags), [pattern, flags]);
  const snapshot = useRegexScan(lines, build);

  function typePattern(value: string) {
    setPattern(value);
    setExtractorId(null);
  }

  function toggleFlag(flag: keyof RegexFlagState) {
    setFlags((current) => ({ ...current, [flag]: !current[flag] }));
  }

  function toggleExtractor(id: ExtractorId) {
    if (id === extractorId) return typePattern('');
    const extractor: Extractor = findExtractor(id);
    setPattern(extractor.pattern);
    setExtractorId(id);
    setFlags((current) => ({ ...current, ignoreCase: extractor.flags.includes('i') }));
  }

  return {
    lines,
    pattern,
    flags,
    extractorId,
    build,
    snapshot,
    typePattern,
    toggleFlag,
    toggleExtractor,
  };
}
