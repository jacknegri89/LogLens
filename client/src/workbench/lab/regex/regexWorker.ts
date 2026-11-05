import type { ParsedLine } from '../../types';
import { advanceScan, createScan, isScanDone, readScan } from './regexScan';

interface ScanRequest {
  lines: ParsedLine[];
  source: string;
  flags: string;
  firstMatchOnly: boolean;
}

const SLICE_BUDGET_MS = 40;

self.onmessage = (event: MessageEvent<ScanRequest>) => {
  const { lines, source, flags, firstMatchOnly } = event.data;
  const scan = createScan(lines, new RegExp(source, flags), firstMatchOnly);

  function runSlice() {
    advanceScan(scan, SLICE_BUDGET_MS);
    self.postMessage(readScan(scan));
    if (!isScanDone(scan)) {
      setTimeout(runSlice, 0);
    }
  }

  runSlice();
};
