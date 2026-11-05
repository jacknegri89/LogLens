import { useMemo, useState } from 'react';

import { MEGABYTE, readTextFile } from '../shared/readTextFile';
import { resolveTrace } from './resolveTrace';
import { parseSourceMap, type ParsedSourceMap } from './sourceMap';

export const MAX_MAP_FILE_MEGABYTES = 30;

export interface LoadedMap {
  /** The file name, or null for a pasted map. */
  name: string | null;
  parsed: ParsedSourceMap;
}

export type MapFileProblem = 'tooBig' | 'unreadable';

/** The source map lab: the map the visitor loaded, the trace they pasted, and the frames resolved. */
export function useSourceMapLab() {
  const [draft, setDraft] = useState('');
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);
  const [fileProblem, setFileProblem] = useState<MapFileProblem | null>(null);
  const [trace, setTrace] = useState('');

  const frames = useMemo(() => {
    if (!loaded?.parsed.ok || trace.trim() === '') {
      return null;
    }
    return resolveTrace(loaded.parsed.map, trace);
  }, [loaded, trace]);

  function loadDraft() {
    setFileProblem(null);
    setLoaded({ name: null, parsed: parseSourceMap(draft) });
  }

  async function openFile(file: File) {
    const result = await readTextFile(file, MAX_MAP_FILE_MEGABYTES * MEGABYTE);
    if (!result.ok) {
      return setFileProblem(result.reason);
    }
    setFileProblem(null);
    setLoaded({ name: file.name, parsed: parseSourceMap(result.text) });
  }

  return { draft, setDraft, loaded, fileProblem, trace, setTrace, frames, loadDraft, openFile };
}
