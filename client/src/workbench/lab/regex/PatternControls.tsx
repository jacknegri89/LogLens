import type { ReactNode } from 'react';

import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { EXTRACTORS, type ExtractorId } from './extractors';
import type { RegexFlagState } from './regexBuild';

interface PatternControlsProps {
  pattern: string;
  flags: RegexFlagState;
  extractorId: ExtractorId | null;
  onPattern: (value: string) => void;
  onFlag: (flag: keyof RegexFlagState) => void;
  onExtractor: (id: ExtractorId) => void;
}

const FLAG_NAMES = ['ignoreCase', 'global', 'multiline', 'dotAll'] as const;

export function PatternControls(props: PatternControlsProps) {
  const text = useText(LAB_TEXT).regex;
  return (
    <div className="lab-card">
      <label htmlFor="lab-regex-pattern" className="lab-label">
        {text.patternLabel}
      </label>
      <input
        id="lab-regex-pattern"
        type="text"
        value={props.pattern}
        onChange={(event) => props.onPattern(event.target.value)}
        placeholder={text.patternPlaceholder}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        className="lab-input lab-input-pattern"
      />
      <FlagButtons flags={props.flags} onFlag={props.onFlag} />
      <ExtractorButtons active={props.extractorId} onExtractor={props.onExtractor} />
    </div>
  );
}

function FlagButtons(props: Pick<PatternControlsProps, 'flags' | 'onFlag'>) {
  const text = useText(LAB_TEXT).regex;
  return (
    <ChipGroup label={text.flagsLabel}>
      {FLAG_NAMES.map((flag) => (
        <button
          key={flag}
          type="button"
          aria-pressed={props.flags[flag]}
          onClick={() => props.onFlag(flag)}
          className="lab-chip"
        >
          {text.flags[flag]}
        </button>
      ))}
    </ChipGroup>
  );
}

interface ExtractorButtonsProps {
  active: ExtractorId | null;
  onExtractor: (id: ExtractorId) => void;
}

function ExtractorButtons({ active, onExtractor }: ExtractorButtonsProps) {
  const text = useText(LAB_TEXT).regex;
  return (
    <ChipGroup label={text.quickLabel}>
      {EXTRACTORS.map((extractor) => (
        <button
          key={extractor.id}
          type="button"
          aria-pressed={active === extractor.id}
          onClick={() => onExtractor(extractor.id)}
          className="lab-chip"
        >
          {text.extractors[extractor.id]}
        </button>
      ))}
    </ChipGroup>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="lab-chip-group">
      <span className="lab-label" aria-hidden="true">
        {label}
      </span>
      {children}
    </div>
  );
}
