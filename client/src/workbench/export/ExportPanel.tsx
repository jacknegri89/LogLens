import { useMemo, useState } from 'react';

import '../../styles/workbench-export.css';
import { EXPORT_TEXT } from '../../content/workbenchExport';
import { useLanguage } from '../../i18n/useLanguage';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { DocumentPreview } from './DocumentPreview';
import { buildExportDocuments, formatNeedsAnalysis } from './formats/exportDocuments';
import type { ExportFormatId } from './formats/exportTypes';
import { FormatPicker } from './FormatPicker';
import { NeedsAnalysis } from './NeedsAnalysis';
import { ShareLinkCard } from './ShareLinkCard';

/** The war-room hub: the analysis as an issue, an alert, a post-mortem or JSON, and a share link. */
export function ExportPanel() {
  const { rawLog, lines, fileName, analysis } = useWorkbench();
  const { language } = useLanguage();
  const text = useText(EXPORT_TEXT);
  const [format, setFormat] = useState<ExportFormatId>('github');
  let intro = text.intro;
  if (rawLog.trim() === '') {
    intro = text.needsLog;
  }
  const documents = useMemo(
    () =>
      buildExportDocuments(format, { language, fileName, lines, record: analysis.record }, text),
    [format, language, fileName, lines, analysis.record, text],
  );

  return (
    <section aria-labelledby="export-title" className="exp-panel">
      <h2 id="export-title" className="exp-title">
        {text.title}
      </h2>
      <p className="exp-intro">{intro}</p>
      <FormatPicker format={format} onChange={setFormat} />
      {rawLog.trim() !== '' && (
        <ExportBody format={format} hasRecord={analysis.record !== null} documents={documents} />
      )}
      <ShareLinkCard />
    </section>
  );
}

interface ExportBodyProps {
  format: ExportFormatId;
  hasRecord: boolean;
  documents: ReturnType<typeof buildExportDocuments>;
}

function ExportBody({ format, hasRecord, documents }: ExportBodyProps) {
  const text = useText(EXPORT_TEXT);
  if (formatNeedsAnalysis(format) && !hasRecord) {
    return <NeedsAnalysis />;
  }

  return (
    <div className="exp-documents">
      {format === 'json' && !hasRecord && <p className="exp-note">{text.jsonStatisticsOnly}</p>}
      {documents.map((document) => (
        <DocumentPreview key={document.id} document={document} />
      ))}
    </div>
  );
}
