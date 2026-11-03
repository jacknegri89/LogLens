import type { FormatKey } from './formatLabels';

/** The names shown to the reader for each log family, in Italian; the keys are those of `FORMAT_LABEL`. */
export const FORMAT_LABEL_IT: Record<FormatKey, string> = {
  jsonLines: 'JSON lines',
  windowsEvent: 'Log eventi di Windows',
  pythonTraceback: 'Traceback Python',
  javaStackTrace: 'Stack trace Java',
  nodeError: 'Errore Node.js',
  dockerKubernetes: 'Docker / Kubernetes',
  postgres: 'Log database (PostgreSQL)',
  accessLog: 'Access log (nginx/Apache)',
  syslog: 'Syslog',
  plainText: 'Testo semplice',
};
