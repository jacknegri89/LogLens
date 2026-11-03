import { useState, type ComponentType } from 'react';

import { LAB_TEXT } from '../../content/workbenchLab';
import { useText } from '../../i18n/useText';
import '../../styles/workbench-lab.css';
import { DiffLab } from './diff/DiffLab';
import { RegexLab } from './regex/RegexLab';
import { labPanelId, labTabId } from './shared/labTabIds';
import { LabTabs } from './shared/LabTabs';
import { SourceMapLab } from './sourcemap/SourceMapLab';

type LabSection = 'regex' | 'diff' | 'sourceMaps';

const SECTIONS: ReadonlyArray<{ id: LabSection; Tool: ComponentType }> = [
  { id: 'regex', Tool: RegexLab },
  { id: 'diff', Tool: DiffLab },
  { id: 'sourceMaps', Tool: SourceMapLab },
];

/**
 * Three tools that work on text the visitor brings. All stay mounted and the other two are
 * hidden, so what was typed in one is still there after a look at another.
 */
export function LabPanel() {
  const text = useText(LAB_TEXT);
  const [section, setSection] = useState<LabSection>('regex');
  const tabs = SECTIONS.map(({ id }) => ({ id, label: text.tabs[id] }));

  return (
    <section className="lab">
      <LabTabs label={text.tabsLabel} tabs={tabs} active={section} onChange={setSection} />
      {SECTIONS.map(({ id, Tool }) => (
        <div
          key={id}
          role="tabpanel"
          id={labPanelId(id)}
          aria-labelledby={labTabId(id)}
          hidden={id !== section}
        >
          <Tool />
        </div>
      ))}
    </section>
  );
}
