/** The names shown to the reader for each log family that `detectFormat` can recognise. */
export const FORMAT_LABEL = {
  jsonLines: 'JSON lines',
  windowsEvent: 'Windows Event log',
  pythonTraceback: 'Python traceback',
  javaStackTrace: 'Java stack trace',
  nodeError: 'Node.js error',
  dockerKubernetes: 'Docker / Kubernetes',
  postgres: 'Database log (PostgreSQL)',
  accessLog: 'Access log (nginx/Apache)',
  syslog: 'Syslog',
  plainText: 'Plain text',
} as const;
