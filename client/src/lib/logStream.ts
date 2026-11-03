import { STREAM_START_SECONDS, STREAM_TEMPLATES } from '../content/stream';

export interface StreamLine {
  text: string;
  flagged: boolean;
}

/** Seconds between two lines; varied so the timestamps do not look machine-regular. */
const GAPS = [1, 3, 2, 5, 1, 4];

function clock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

/** The decorative stream: the fixed templates, each with a running timestamp. */
export function buildStreamLines(): StreamLine[] {
  let seconds = STREAM_START_SECONDS;
  return STREAM_TEMPLATES.map((template, index) => {
    seconds += GAPS[index % GAPS.length];
    return { text: `${clock(seconds)} ${template.text}`, flagged: template.flagged };
  });
}
