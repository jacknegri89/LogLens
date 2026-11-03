import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { DiffResults } from './DiffResults';
import { DiffSlotCard } from './DiffSlotCard';
import { useDiffCompare } from './useDiffCompare';
import { useDiffSlots } from './useDiffSlots';

const SLOT_IDS = ['baseline', 'canary'] as const;

export function DiffLab() {
  const text = useText(LAB_TEXT).diff;
  const diff = useDiffSlots();
  const { ready, compare, result } = useDiffCompare(diff.slots);
  const titles = { baseline: text.baselineTitle, canary: text.canaryTitle };

  return (
    <div className="lab-stack">
      <p className="lab-intro">{text.intro}</p>
      <div className="lab-columns lab-columns-even">
        {SLOT_IDS.map((id) => (
          <DiffSlotCard
            key={id}
            id={id}
            title={titles[id]}
            slot={diff.slots[id]}
            error={diff.errors[id]}
            onPaste={(value) => diff.paste(id, value)}
            onFile={(file) => void diff.openFile(id, file)}
            onUseLoaded={() => diff.fillFromWorkbench(id)}
            onClear={() => diff.clear(id)}
          />
        ))}
      </div>
      <CompareBar ready={ready} onCompare={compare} />
      {result && <DiffResults result={result} />}
    </div>
  );
}

function CompareBar({ ready, onCompare }: { ready: boolean; onCompare: () => void }) {
  const text = useText(LAB_TEXT).diff;
  return (
    <div className="lab-actions">
      <button type="button" className="lab-button-primary" disabled={!ready} onClick={onCompare}>
        {text.compare}
      </button>
      {!ready && <span className="lab-note">{text.needBoth}</span>}
    </div>
  );
}
