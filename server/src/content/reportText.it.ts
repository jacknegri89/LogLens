import type { ReportText } from './reportText';

export const REPORT_TEXT_IT: ReportText = {
  severity: 'Severità',
  category: 'Categoria',
  logLines: 'Righe di log',
  bigPicture: 'Quadro generale',
  probableCauses: 'Cause probabili',
  nextSteps: 'Prossimi passi consigliati',
  generatedByRules: 'Report generato dal motore a regole di LogLens.',
  requestTitle: (method, path, status) => `${method} ${path} ha risposto ${status}`,
  unknownIssue: 'Problema sconosciuto',
};
